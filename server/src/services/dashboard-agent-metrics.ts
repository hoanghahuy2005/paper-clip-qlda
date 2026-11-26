import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, agents, costEvents, heartbeatRuns, issues } from "@paperclipai/db";
import type { AuthorizationActor } from "./authorization.js";
import { issueReadSqlCondition } from "./authorization.js";
import { accessService } from "./access.js";
import { executionIssueCondition } from "./issue-visibility.js";
import { AGENT_ERROR_DEDUCTIONS, AGENT_QUALITY_ERROR_ACTION, AGENT_TASK_POINTS, summarizeAgentScore } from "./agent-score.js";
import { ordinaryInputTokens } from "./costs.js";

/** Read-only, all-time counters. Task counts respect the caller's task visibility. */
export async function dashboardAgentMetrics(db: Db, companyId: string, actor: AuthorizationActor) {
  const agentRows = await db.select({ id: agents.id, name: agents.name, status: agents.status })
    .from(agents).where(eq(agents.companyId, companyId));
  const access = accessService(db);
  const decisions = await Promise.all(agentRows.map((agent) => access.decide({
    actor,
    action: "agent:read",
    resource: { type: "agent", companyId, agentId: agent.id },
  })));
  const visibleAgents = agentRows.filter((_, index) => decisions[index]?.allowed);
  const agentIds = visibleAgents.map((agent) => agent.id);
  if (agentIds.length === 0) return [];

  const readable = await issueReadSqlCondition(db, actor);
  const [taskRows, runRows, tokenRows] = await Promise.all([
    db.select({
      agentId: issues.assigneeAgentId,
      assignedTasks: sql<number>`count(*)::int`,
      completedTasks: sql<number>`count(*) filter (where ${issues.status} = 'done')::int`,
      pointsDeducted: sql<number>`coalesce(sum(least(${AGENT_TASK_POINTS}::int, (
        select coalesce(sum(case entry.details ->> 'severity'
          when 'light' then ${AGENT_ERROR_DEDUCTIONS.light}::int
          when 'medium' then ${AGENT_ERROR_DEDUCTIONS.medium}::int
          when 'severe' then ${AGENT_ERROR_DEDUCTIONS.severe}::int
          else 0 end), 0)
        from ${activityLog} entry
        where entry.company_id = ${issues.companyId} and entry.entity_type = 'issue'
          and entry.entity_id = ${issues.id}::text and entry.agent_id = ${issues.assigneeAgentId}
          and entry.action = ${AGENT_QUALITY_ERROR_ACTION}
      ))) filter (where ${issues.status} = 'done'), 0)::double precision`,
    }).from(issues).where(and(eq(issues.companyId, companyId), inArray(issues.assigneeAgentId, agentIds), executionIssueCondition(), readable))
      .groupBy(issues.assigneeAgentId),
    db.select({
      agentId: heartbeatRuns.agentId,
      tasksRun: sql<number>`count(distinct ${issues.id})::int`,
      succeededRuns: sql<number>`count(*) filter (where ${heartbeatRuns.status} = 'succeeded')::int`,
      failedRuns: sql<number>`count(*) filter (where ${heartbeatRuns.status} in ('failed', 'timed_out'))::int`,
    }).from(heartbeatRuns)
      .innerJoin(issues, and(eq(issues.companyId, heartbeatRuns.companyId), sql`(
        ${issues.id} = ${heartbeatRuns.issueId} or (
          ${heartbeatRuns.issueId} is null and ${issues.id}::text = ${heartbeatRuns.contextSnapshot} ->> 'issueId'
        )
      )`))
      .where(and(eq(heartbeatRuns.companyId, companyId), inArray(heartbeatRuns.agentId, agentIds),
        sql`(${heartbeatRuns.startedAt} is not null or ${heartbeatRuns.status} in ('running', 'succeeded', 'failed', 'timed_out'))`,
        executionIssueCondition(), readable))
      .groupBy(heartbeatRuns.agentId),
    // Match /costs/by-agent, including its historical OpenAI cache normalization.
    db.select({
      agentId: costEvents.agentId,
      inputTokens: sql<number>`coalesce(sum(${ordinaryInputTokens}), 0)::double precision`,
      cachedInputTokens: sql<number>`coalesce(sum(${costEvents.cachedInputTokens}), 0)::double precision`,
      outputTokens: sql<number>`coalesce(sum(${costEvents.outputTokens}), 0)::double precision`,
    }).from(costEvents).where(and(eq(costEvents.companyId, companyId), inArray(costEvents.agentId, agentIds)))
      .groupBy(costEvents.agentId),
  ]);
  const tasks = new Map(taskRows.map((row) => [row.agentId, row]));
  const runs = new Map(runRows.map((row) => [row.agentId, row]));
  const tokens = new Map(tokenRows.map((row) => [row.agentId, row]));
  return visibleAgents.map((agent) => {
    const completedTasks = Number(tasks.get(agent.id)?.completedTasks ?? 0);
    const pointsDeducted = Number(tasks.get(agent.id)?.pointsDeducted ?? 0);
    return {
      agentId: agent.id,
      name: agent.name,
      status: agent.status,
      assignedTasks: Number(tasks.get(agent.id)?.assignedTasks ?? 0),
      completedTasks,
      tasksRun: Number(runs.get(agent.id)?.tasksRun ?? 0),
      succeededRuns: Number(runs.get(agent.id)?.succeededRuns ?? 0),
      failedRuns: Number(runs.get(agent.id)?.failedRuns ?? 0),
      inputTokens: Number(tokens.get(agent.id)?.inputTokens ?? 0),
      cachedInputTokens: Number(tokens.get(agent.id)?.cachedInputTokens ?? 0),
      outputTokens: Number(tokens.get(agent.id)?.outputTokens ?? 0),
      ...summarizeAgentScore(completedTasks, pointsDeducted),
    };
  }).sort((a, b) => b.completedTasks - a.completedTasks || a.name.localeCompare(b.name));
}
