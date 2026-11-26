export interface DashboardRunActivityDay {
  date: string;
  succeeded: number;
  /**
   * True failures for the day, excluding process-loss/restart kills that were
   * later recovered by a successful retry (those are surfaced in `recovered`).
   */
  failed: number;
  /**
   * Runs that terminated as failed, timed_out, or interrupted (shutdown) but
   * whose retry chain eventually succeeded — e.g. restart-killed runs and
   * shutdown interrupts that recovered. Kept out of `failed` so the headline
   * failure count reflects true, unrecovered failures.
   */
  recovered: number;
  other: number;
  total: number;
  /**
   * Per-error-code breakdown of the (true) `failed` count for the day, so a
   * spike can be attributed to an error class (e.g. `process_lost`,
   * `provider_quota`, `workspace_validation_failed`). Recovered runs are not
   * included here. Runs with no error code are bucketed under `unknown`.
   */
  failedByErrorCode: Record<string, number>;
}

export interface DashboardSummary {
  companyId: string;
  agents: {
    active: number;
    running: number;
    paused: number;
    error: number;
  };
  tasks: {
    open: number;
    inProgress: number;
    blocked: number;
    done: number;
  };
  costs: {
    monthSpendCents: number;
    monthBudgetCents: number;
    monthUtilizationPercent: number;
  };
  pendingApprovals: number;
  budgets: {
    activeIncidents: number;
    pendingApprovals: number;
    pausedAgents: number;
    pausedProjects: number;
  };
  runActivity: DashboardRunActivityDay[];
}

/** All-time, read-only counters for agents visible to the current board actor. */
export interface DashboardAgentMetric {
  agentId: string;
  name: string;
  status: string;
  /** Current readable execution tasks assigned to this agent. */
  assignedTasks: number;
  /** Current readable execution tasks assigned to this agent and marked done. */
  completedTasks: number;
  /** Distinct readable execution tasks with at least one run by this agent. */
  tasksRun: number;
  /** Run counts, not distinct task counts. */
  succeededRuns: number;
  failedRuns: number;
  /** Accounted ledger usage; input excludes cached input. */
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  pointsEarned: number;
  pointsDeducted: number;
  netPoints: number;
  efficiencyPercent: number | null;
}
