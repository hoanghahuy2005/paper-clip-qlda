import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const compiled = buildSync({ entryPoints: [fileURLToPath(new URL("../src/worker.ts", import.meta.url))],
  bundle: true, external: ["@paperclipai/plugin-sdk"], platform: "node", format: "esm", write: false }).outputFiles[0].text;
const isolated = compiled.replace('import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";', "const definePlugin = value => value; const runWorker = () => {};");
const { registerOffice } = await import(`data:text/javascript;base64,${Buffer.from(isolated).toString("base64")}`);

test("snapshot and event stream remain company scoped and deduplicate events", async () => {
  const handlers = new Map();
  const listeners = new Map();
  const opened = [];
  const emitted = [];
  const ctx = {
    manifest: { capabilities: ["agents.read", "issues.read", "approvals.read"] },
    data: { register: (key, fn) => handlers.set(key, fn) },
    agents: { list: async ({ companyId }) => [{ id: `${companyId}-agent`, companyId, name: `Agent ${companyId}`, status: "idle",
      metadata: { officeAlias: companyId === "company-a" ? "pm" : "private-issue", privateIssue: "secret" } }] },
    issues: { list: async ({ companyId }) => [{ id: `${companyId}-issue`, companyId, title: "Task", status: "todo", assigneeAgentId: `${companyId}-agent`, activeRun: null }] },
    approvals: { list: async ({ companyId }) => [{ id: `${companyId}-approval`, companyId, status: "pending" }] },
    events: { on: (name, fn) => { listeners.set(name, fn); return () => {}; } },
    streams: { open: (...args) => opened.push(args), emit: (...args) => emitted.push(args) },
  };
  registerOffice(ctx);
  const snapshot = handlers.get("office-snapshot");
  const a = await snapshot({ companyId: "company-a" });
  const b = await snapshot({ companyId: "company-b" });
  assert.deepEqual(a.agents.map(x => x.id), ["company-a-agent"]);
  assert.deepEqual(a.issues.map(x => x.id), ["company-a-issue"]);
  assert.deepEqual(b.approvals.map(x => x.id), ["company-b-approval"]);
  assert.equal(a.companyId, "company-a");
  assert.deepEqual(a.agents[0].metadata, { officeAlias: "pm" });
  assert.equal(b.agents[0].metadata, null);
  await assert.rejects(snapshot({}), /companyId required/);
  const onRun = listeners.get("agent.run.started");
  await onRun({ companyId: "company-a", eventId: "one", occurredAt: "2026-01-01" });
  await onRun({ companyId: "company-a", eventId: "one", occurredAt: "2026-01-01" });
  await onRun({ companyId: "company-b", eventId: "one", occurredAt: "2026-01-01" });
  assert.deepEqual(opened, [["office-invalidation:company-a", "company-a"], ["office-invalidation:company-b", "company-b"]]);
  assert.equal(emitted.length, 2);
  assert.equal(emitted[0][1].companyId, "company-a");
  assert.equal(emitted[1][1].companyId, "company-b");
});

test("approval failure is visible without dropping agent snapshot", async () => {
  let snapshot;
  registerOffice({
    manifest: { capabilities: ["agents.read", "approvals.read"] },
    data: { register: (_key, fn) => { snapshot = fn; } },
    agents: { list: async () => [{ id: "a", name: "Yan", status: "idle" }] },
    issues: { list: async () => [] },
    approvals: { list: async () => { throw new Error("denied"); } },
    events: { on: () => () => {} },
    streams: { open() {}, emit() {} },
  });
  const result = await snapshot({ companyId: "company-a" });
  assert.equal(result.approvalAccess, "unavailable");
  assert.equal(result.agents.length, 1);
});

test("issue capability denial keeps agent and approval data but marks run unavailable",async()=>{
  let snapshot;registerOffice({manifest:{capabilities:["issues.read"]},data:{register:(_key,fn)=>snapshot=fn},agents:{list:async()=>[{id:"a",name:"Yan",status:"running"}]},
    issues:{list:async()=>{throw new Error("CAPABILITY_DENIED");}},approvals:{list:async()=>[]},events:{on:()=>()=>{}},streams:{open(){},emit(){}}});
  const value=await snapshot({companyId:"A"});assert.equal(value.issueAccess,"unavailable");assert.equal(value.agents.length,1);assert.deepEqual(value.issues,[]);
});

test("without issues.read the worker does not request issues",async()=>{
  let snapshot,issueCalls=0;
  registerOffice({manifest:{capabilities:["agents.read","approvals.read"]},data:{register:(_key,fn)=>snapshot=fn},
    agents:{list:async()=>[]},issues:{list:async()=>{issueCalls++;return[];}},approvals:{list:async()=>[]},
    events:{on:()=>()=>{}},streams:{open(){},emit(){}}});
  const value=await snapshot({companyId:"A"});assert.equal(issueCalls,0);assert.equal(value.issueAccess,"unavailable");
});
