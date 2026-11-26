import { Router } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, issues } from "@paperclipai/db";
import { badRequest, conflict, forbidden, notFound } from "../errors.js";
import { issueReadSqlCondition } from "../services/authorization.js";
import { executionIssueCondition } from "../services/issue-visibility.js";
import { AGENT_QUALITY_ERROR_ACTION } from "../services/agent-score.js";
import { dashboardService } from "../services/dashboard.js";
import { dashboardAgentMetrics } from "../services/dashboard-agent-metrics.js";
import { accessService } from "../services/access.js";
import {
  DEFAULT_RECOVERY_RATE_THRESHOLD_PERCENT,
  MAX_WINDOW_WEEKS,
  recoveryObservabilityService,
} from "../services/recovery-observability.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";

const qualityErrorSchema = z.object({
  submissionId: z.uuid(),
  agentId: z.uuid(),
  task: z.string().trim().min(1).max(80),
  severity: z.enum(["light", "medium", "severe"]),
  reason: z.string().trim().min(1).max(500),
});

function parsePositiveNumber(
  value: unknown,
  fallback: number,
  max?: number,
): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return max != null ? Math.min(parsed, max) : parsed;
}

export function dashboardRoutes(db: Db) {
  const router = Router();
  const svc = dashboardService(db);
  const recoveryObservability = recoveryObservabilityService(db);
  const access = accessService(db);

  async function canRecordQualityError(actor: Parameters<typeof access.decide>[0]["actor"], companyId: string) {
    if (actor.type !== "board") return false;
    if (actor.source === "local_implicit") return true;
    if (!actor.userId || actor.source === "mcp_oauth" || actor.source === "board_key") return false;
    const membership = await access.getMembership(companyId, "user", actor.userId);
    return membership?.status === "active" && ["owner", "admin"].includes(membership.membershipRole ?? "");
  }

  router.get("/companies/:companyId/dashboard", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const summary = await svc.summary(companyId);
    res.json(summary);
  });

  router.get("/companies/:companyId/dashboard/agents", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    const decision = await access.decide({
      actor: req.actor,
      action: "company_scope:read",
      resource: { type: "company", companyId },
    });
    if (!decision.allowed) {
      res.status(403).json({ error: "Agent metrics are outside this actor's authorization boundary" });
      return;
    }
    res.set("Cache-Control", "no-store");
    res.json({
      agents: await dashboardAgentMetrics(db, companyId, req.actor),
      canRecordQualityError: await canRecordQualityError(req.actor, companyId),
    });
  });

  router.post("/companies/:companyId/dashboard/agent-errors", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    if (!(await canRecordQualityError(req.actor, companyId))) throw forbidden("Only company owners and administrators can record quality errors");
    const parsed = qualityErrorSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid agent quality error");
    const { submissionId, agentId, task, severity, reason } = parsed.data;
    const actor = getActorInfo(req);
    const readable = await issueReadSqlCondition(db, req.actor);
    const agentRead = await access.decide({
      actor: req.actor, action: "agent:read", resource: { type: "agent", companyId, agentId },
    });
    if (!agentRead.allowed) throw notFound("Task not found");

    await db.transaction(async (tx) => {
      const [issue] = await tx.select({
        id: issues.id, projectId: issues.projectId, parentIssueId: issues.parentId,
        assigneeUserId: issues.assigneeUserId, status: issues.status,
      }).from(issues)
        .where(and(eq(issues.companyId, companyId), eq(issues.assigneeAgentId, agentId),
          sql`(${issues.identifier} = ${task.toUpperCase()} or ${issues.id}::text = ${task.toLowerCase()})`,
          executionIssueCondition(), readable))
        .limit(1).for("update");
      if (!issue) throw notFound("Task not found for the selected agent");
      const issueRead = await access.decide({
        actor: req.actor, action: "issue:read",
        resource: { type: "issue", companyId, issueId: issue.id, projectId: issue.projectId,
          parentIssueId: issue.parentIssueId, assigneeAgentId: agentId, assigneeUserId: issue.assigneeUserId, status: issue.status },
      });
      if (!issueRead.allowed) throw notFound("Task not found for the selected agent");
      const details = { severity, reason };
      const [inserted] = await tx.insert(activityLog).values({
        id: submissionId, companyId, actorType: actor.actorType, actorId: actor.actorId,
        agentId, action: AGENT_QUALITY_ERROR_ACTION, entityType: "issue", entityId: issue.id, details,
      }).onConflictDoNothing({ target: activityLog.id }).returning({ id: activityLog.id });
      if (inserted) return;
      const [existing] = await tx.select({ id: activityLog.id }).from(activityLog).where(and(
        eq(activityLog.id, submissionId), eq(activityLog.companyId, companyId),
        eq(activityLog.actorType, actor.actorType), eq(activityLog.actorId, actor.actorId),
        eq(activityLog.agentId, agentId), eq(activityLog.action, AGENT_QUALITY_ERROR_ACTION),
        eq(activityLog.entityType, "issue"), eq(activityLog.entityId, issue.id),
        sql`${activityLog.details} = ${JSON.stringify(details)}::jsonb`,
      ));
      if (!existing) throw conflict("This submission ID has already been used");
    });
    res.json({ recorded: true });
  });

  router.get("/companies/:companyId/recovery-observability", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const weeks = parsePositiveNumber(req.query.weeks, 8, MAX_WINDOW_WEEKS);
    const thresholdPercent = parsePositiveNumber(
      req.query.threshold,
      DEFAULT_RECOVERY_RATE_THRESHOLD_PERCENT,
    );
    const report = await recoveryObservability.report(companyId, {
      weeks,
      thresholdPercent,
    });
    res.json(report);
  });

  return router;
}
