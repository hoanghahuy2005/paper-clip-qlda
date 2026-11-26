export type AgentErrorSeverity = "light" | "medium" | "severe";

export const AGENT_TASK_POINTS = 100;
export const AGENT_QUALITY_ERROR_ACTION = "issue.agent_quality_error_recorded";
export const AGENT_ERROR_DEDUCTIONS: Record<AgentErrorSeverity, number> = {
  light: 10,
  medium: 20,
  severe: 30,
};

/** The input deduction is the sum of deductions already capped per task. */
export function summarizeAgentScore(completedTasks: number, pointsDeducted: number) {
  const pointsEarned = completedTasks * AGENT_TASK_POINTS;
  const netPoints = pointsEarned - pointsDeducted;
  return { pointsEarned, pointsDeducted, netPoints, efficiencyPercent: pointsEarned ? 100 * (netPoints / pointsEarned) : null };
}
