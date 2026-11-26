import { agentWakeupRequests, agents, approvals, caseHandoffs, heartbeatRuns, issues, type Db } from "@paperclipai/db";
import { and, desc, eq, gte, inArray, isNotNull, notInArray, or, sql } from "drizzle-orm";
import { approvalReadSqlCondition, issueReadSqlCondition, type AuthorizationActor } from "./authorization.js";
import { filterCasesForActor } from "./case-access.js";
import { instanceSettingsService } from "./instance-settings.js";
import { readOfficeMeetings } from "./office-meetings.js";

/** Users without company-wide task visibility always get unknown, independently of hidden work. */
export async function readOfficeWorkload(db: Db, actor: AuthorizationActor, companyId: string, agentIds: string[], approvalIds: string[]) {
  const readableApproval = await approvalReadSqlCondition(db, actor);
  const visibleApprovals = approvalIds.length ? await db.select({ id: approvals.id }).from(approvals)
    .where(and(eq(approvals.companyId, companyId), inArray(approvals.id, approvalIds), readableApproval)) : [];
  if (actor.type !== "board" || actor.authorizingUserId || actor.ignoreInstanceAdmin
    || (actor.source !== "local_implicit" && (!actor.isInstanceAdmin || actor.source === "cloud_tenant"))
    || agentIds.length === 0) return { workload: {}, handoffs: [], meetings: [], visibleApprovals };

  const rows = await db.select({
    id: agents.id,
    busy: sql<boolean>`exists (${db.select({ id: issues.id }).from(issues).where(and(
      eq(issues.companyId, companyId), eq(issues.assigneeAgentId, agents.id),
      notInArray(issues.status, ["done", "cancelled"]),
    ))}) or exists (${db.select({ id: heartbeatRuns.id }).from(heartbeatRuns).where(and(
      eq(heartbeatRuns.companyId, companyId), eq(heartbeatRuns.agentId, agents.id),
      inArray(heartbeatRuns.status, ["queued", "running", "scheduled_retry"]),
    ))}) or exists (${db.select({ id: agentWakeupRequests.id }).from(agentWakeupRequests).where(and(
      eq(agentWakeupRequests.companyId, companyId), eq(agentWakeupRequests.agentId, agents.id),
      inArray(agentWakeupRequests.status, ["queued", "deferred_issue_execution"]),
    ))}) or exists (${db.select({ id: approvals.id }).from(approvals).where(and(
      eq(approvals.companyId, companyId), eq(approvals.requestedByAgentId, agents.id),
      eq(approvals.status, "pending"), readableApproval,
    ))}) or exists (${db.select({ id: caseHandoffs.id }).from(caseHandoffs).where(and(
      eq(caseHandoffs.companyId, companyId),
      or(eq(caseHandoffs.toAgentId, agents.id), eq(caseHandoffs.fromAgentId, agents.id)),
      inArray(caseHandoffs.state, ["awaiting_release", "pending_dispatch"]),
    ))})`,
  }).from(agents).where(and(eq(agents.companyId, companyId), inArray(agents.id, agentIds)));
  const casesEnabled = (await instanceSettingsService(db).getExperimentalReadOnly()).enableCases;
  const handoffs = casesEnabled ? await db.select({
    id: caseHandoffs.id, caseId: caseHandoffs.caseId, fromAgentId: caseHandoffs.fromAgentId, toAgentId: caseHandoffs.toAgentId,
  }).from(caseHandoffs)
    .innerJoin(issues, and(eq(issues.id, caseHandoffs.issueId), eq(issues.companyId, caseHandoffs.companyId)))
    .where(and(eq(caseHandoffs.companyId, companyId), eq(caseHandoffs.destinationKind, "agent"),
      eq(caseHandoffs.state, "delivered"), isNotNull(caseHandoffs.deliveredAt), await issueReadSqlCondition(db, actor),
      gte(caseHandoffs.deliveredAt, new Date(Date.now() - 30_000)),
      inArray(caseHandoffs.fromAgentId, agentIds), inArray(caseHandoffs.toAgentId, agentIds)))
    .orderBy(desc(caseHandoffs.deliveredAt)).limit(50) : [];
  const visibleCases = await filterCasesForActor(db, actor, [...new Set(handoffs.map(row => row.caseId))].map(id => ({ id })));
  const allowedCases = new Set(visibleCases.map(row => row.id));
  return {
    workload: Object.fromEntries(rows.map(row => [row.id, row.busy ? "busy" : "clear"])),
    handoffs: handoffs.filter(row => allowedCases.has(row.caseId))
      .map(({ id, fromAgentId, toAgentId }) => ({ id, fromAgentId, toAgentId })),
    meetings: await readOfficeMeetings(db, actor, companyId, agentIds),
    visibleApprovals,
  };
}
