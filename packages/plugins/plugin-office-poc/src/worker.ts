import { definePlugin, runWorker, type PluginContext, type PluginEvent } from "@paperclipai/plugin-sdk";
import { workstations } from "./layout.js";

export const CHANNEL = "office-invalidation";
const EVENT_NAMES = ["agent.run.started", "agent.run.finished", "agent.run.failed", "approval.created", "approval.decided"] as const;
const officeAliases = new Set(workstations.map(station => station.id));

export function registerOffice(ctx: PluginContext) {
  const seen = new Map<string, Set<string>>();
  const opened = new Set<string>();
  ctx.data.register("office-snapshot", async (params) => {
    const companyId = typeof params.companyId === "string" ? params.companyId.trim() : "";
    if (!companyId) throw new Error("companyId required");
    const agents = await ctx.agents.list({ companyId, limit: 200, offset: 0 });
    let issues: Awaited<ReturnType<typeof ctx.issues.list>> = [];
    let issueAccess: "available" | "unavailable" = "available";
    if (ctx.manifest.capabilities.includes("issues.read")) {
      try { issues = await ctx.issues.list({ companyId, limit: 200, offset: 0 }); }
      catch { issueAccess = "unavailable"; }
    } else issueAccess = "unavailable";
    const issuesComplete = issueAccess === "available" && issues.length < 200;
    let approvals: Awaited<ReturnType<typeof ctx.approvals.list>> = [];
    let approvalAccess: "available" | "unavailable" = "available";
    try { approvals = await ctx.approvals.list({ companyId, status: "pending" }); }
    catch { approvalAccess = "unavailable"; }
    return { companyId, generatedAt: new Date().toISOString(),
      agents: agents.map(a => ({ id: a.id, name: a.name, title: a.title, role: a.role, status: a.status, reportsTo: a.reportsTo,
        metadata: typeof a.metadata?.officeAlias === "string" && officeAliases.has(a.metadata.officeAlias)
          ? { officeAlias: a.metadata.officeAlias } : null })),
      issues: issues.map(i => ({ id: i.id, identifier: i.identifier, title: i.title, status: i.status, assigneeAgentId: i.assigneeAgentId,
        activeRun: i.activeRun ? { id: i.activeRun.id, agentId: i.activeRun.agentId, status: i.activeRun.status, startedAt: i.activeRun.startedAt } : null })),
      approvals: approvals.map(a => ({ id: a.id, type: a.type, status: a.status, requestedByAgentId: a.requestedByAgentId, createdAt: a.createdAt })), approvalAccess, issueAccess, issuesComplete };
  });
  for (const name of EVENT_NAMES) ctx.events.on(name, async (event: PluginEvent) => {
    if (!event.companyId || !event.eventId) return;
    let ids = seen.get(event.companyId);
    if (!ids) { ids = new Set(); seen.set(event.companyId, ids); }
    if (ids.has(event.eventId)) return;
    ids.add(event.eventId);
    if (ids.size > 256) ids.delete(ids.values().next().value!);
    const channel = `${CHANNEL}:${event.companyId}`;
    if (!opened.has(channel)) { ctx.streams.open(channel, event.companyId); opened.add(channel); }
    ctx.streams.emit(channel, { companyId: event.companyId, eventId: event.eventId, occurredAt: event.occurredAt, kind: "invalidate" });
  });
}

const plugin = definePlugin({ async setup(ctx) { registerOffice(ctx); }, async onHealth() { return { status: "ok", message: "Office PoC ready" }; } });
export default plugin;
runWorker(plugin, import.meta.url);
