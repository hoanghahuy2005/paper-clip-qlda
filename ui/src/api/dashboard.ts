import type { DashboardSummary, DashboardAgentMetric } from "@paperclipai/shared";
import { api } from "./client";

export const dashboardApi = {
  summary: (companyId: string) => api.get<DashboardSummary>(`/companies/${companyId}/dashboard`),
  agents: (companyId: string) => api.get<{ agents: DashboardAgentMetric[]; canRecordQualityError: boolean }>(`/companies/${companyId}/dashboard/agents`),
  recordAgentError: (companyId: string, body: {
    submissionId: string; agentId: string; task: string; severity: "light" | "medium" | "severe"; reason: string;
  }) => api.post<{ recorded: true }>(`/companies/${companyId}/dashboard/agent-errors`, body),
};
