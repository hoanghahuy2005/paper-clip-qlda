import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link } from "@/lib/router";
import { dashboardApi } from "@/api/dashboard";
import { formatNumber, formatTokens } from "@/lib/utils";
import { createUuid } from "@/lib/uuid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentIdentity } from "./AgentIdentity";

export function AgentMetricsPanel({ companyId, viewerId }: { companyId: string; viewerId: string | null }) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["dashboard-agent-metrics", companyId, viewerId],
    queryFn: () => dashboardApi.agents(companyId),
  });
  const [editing, setEditing] = useState(false);
  const lastSubmission = useRef<{ signature: string; id: string } | null>(null);
  const save = useMutation({
    mutationFn: (body: Parameters<typeof dashboardApi.recordAgentError>[1]) => dashboardApi.recordAgentError(companyId, body),
    onSuccess: () => {
      lastSubmission.current = null;
      setEditing(false);
      void refetch();
    },
  });

  return (
    <section aria-labelledby="agent-metrics-heading">
      <div className="mb-3 space-y-1">
        <h2 id="agent-metrics-heading" className="text-sm font-semibold text-foreground">Agent performance</h2>
        <p className="text-xs text-muted-foreground">
          All time · completed tasks follow the current assignee · tokens reflect accounted usage.
          Each completed task earns 100 points. Recorded quality errors deduct 10, 20 or 30 points, down to zero per task.
          Efficiency is net points divided by earned points.
        </p>
        {data?.canRecordQualityError && !!data.agents.length && !editing && (
          <Button size="sm" variant="outline" onClick={() => { save.reset(); setEditing(true); }}>Record quality error</Button>
        )}
        {!editing && save.isSuccess && <p role="status" className="text-sm">Quality error recorded.</p>}
      </div>
      {editing && data?.canRecordQualityError && <form className="mb-3 grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        if (save.isPending) return;
        const fields = new FormData(event.currentTarget);
        const severity = fields.get("severity");
        if (severity !== "light" && severity !== "medium" && severity !== "severe") return;
        const entry = { agentId: String(fields.get("agentId")), task: String(fields.get("task")).trim(), severity, reason: String(fields.get("reason")).trim() };
        const signature = JSON.stringify(entry);
        const previous = lastSubmission.current;
        const submissionId = previous?.signature === signature ? previous.id : createUuid();
        lastSubmission.current = { signature, id: submissionId };
        save.mutate({ ...entry, severity, submissionId });
      }}>
        <label className="grid gap-1 text-sm">Agent
          <select className="rounded-md border border-input bg-background p-2" name="agentId" required>
            {data.agents.map((agent) => <option key={agent.agentId} value={agent.agentId}>{agent.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">Task ID<Input name="task" required maxLength={80} /></label>
        <label className="grid gap-1 text-sm">Severity
          <select className="rounded-md border border-input bg-background p-2" name="severity" required>
            <option value="light">Light (−10)</option><option value="medium">Medium (−20)</option><option value="severe">Severe (−30)</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">Reason<Input name="reason" required maxLength={500} /></label>
        {save.error && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" type="button" disabled={save.isPending} onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" type="submit" disabled={save.isPending}>{save.isPending ? "Recording…" : "Record error"}</Button>
        </div>
      </form>}
      <Card className="block overflow-x-auto py-0">
        {isPending ? <p className="p-4 text-sm text-muted-foreground">Loading agent metrics…</p>
          : error ? <p className="p-4 text-sm text-destructive">Agent metrics are unavailable. Check access or retry the page.</p>
            : !data?.agents.length ? <p className="p-4 text-sm text-muted-foreground">No agents available to view.</p>
              : (
                <table className="w-full min-w-max text-sm" data-testid="dashboard-agent-metrics">
                  <thead className="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Agent</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Done</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Tasks run</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Runs OK / failed</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Tokens in / out</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Earned</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Deducted</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Net points</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Efficiency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.agents.map((agent) => (
                      <tr key={agent.agentId}>
                        <td className="px-4 py-3">
                          <Link to={`/agents/${agent.agentId}`} className="inline-flex max-w-48 hover:underline">
                            <AgentIdentity agent={{ id: agent.agentId, name: agent.name }} size="sm" />
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums">{formatNumber(agent.completedTasks)}</td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums">{formatNumber(agent.tasksRun)}</td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums">{formatNumber(agent.succeededRuns)} / {formatNumber(agent.failedRuns)}</td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums" title={`Input ${formatNumber(agent.inputTokens)}, cached input ${formatNumber(agent.cachedInputTokens)}, output ${formatNumber(agent.outputTokens)}`}>{formatTokens(agent.inputTokens + agent.cachedInputTokens)} / {formatTokens(agent.outputTokens)}</td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums">{formatNumber(agent.pointsEarned)}</td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums">{formatNumber(agent.pointsDeducted)}</td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums">{formatNumber(agent.netPoints)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{agent.efficiencyPercent == null ? "—" : `${formatNumber(agent.efficiencyPercent, { maximumFractionDigits: 1 })}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
      </Card>
    </section>
  );
}
