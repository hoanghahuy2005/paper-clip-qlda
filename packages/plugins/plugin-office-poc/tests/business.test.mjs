import assert from "node:assert/strict";
import test from "node:test";
import { buildSync } from "esbuild";
import { fileURLToPath } from "node:url";
const bundled=buildSync({entryPoints:[fileURLToPath(new URL("../src/business.ts",import.meta.url))],bundle:true,write:false,platform:"node",format:"esm"}).outputFiles[0].text;
const { resolveRoster, newCeoDelivery, acceptNewerSnapshot, canRest, updateIdleSince, idleToLoungeDelayMs } = await import(`data:text/javascript;base64,${Buffer.from(bundled).toString("base64")}`);

const agent=(id,name,title=null,metadata=null)=>({id,name,title,metadata,role:"agent",status:"idle",reportsTo:null});
const snapshot=(companyId,agents=[],issues=[],approvals=[])=>({companyId,generatedAt:new Date().toISOString(),agents,issues,approvals,approvalAccess:"available"});
test("unique role mapping uses real agent IDs, explicit aliases resolve duplicates",()=>{
  const a=snapshot("A",[agent("yan","Yan"),agent("one","Scriptwriter"),agent("two","Scriptwriter"),agent("match","Other",null,{officeAlias:"scriptwriter"})]);
  const roster=resolveRoster(a);assert.equal(roster.length,12);assert.equal(roster[0].agent.id,"yan");assert.equal(roster.find(r=>r.deskId==="scriptwriter").agent.id,"match");
  const ambiguous=resolveRoster(snapshot("A",[agent("one","Scriptwriter"),agent("two","Scriptwriter")]));
  assert.equal(ambiguous.find(r=>r.deskId==="scriptwriter").agent,null);
});
test("work requires an active run, never inferred from agent status",()=>{
  const a=agent("a","Yan");a.status="running";
  let row=resolveRoster(snapshot("A",[a]))[0];assert.equal(row.state,"unknown");
  row=resolveRoster(snapshot("A",[a],[{id:"i",title:"Task",status:"in_progress",assigneeAgentId:"a",activeRun:{id:"r",agentId:"a",status:"running",startedAt:null}}]))[0];
  assert.equal(row.state,"working");assert.equal(row.run.id,"r");
  a.status="error";row=resolveRoster(snapshot("A",[a]))[0];assert.equal(row.state,"error");
});
test("Yan delivery only for new CEO-related pending approval in same company",()=>{
  const approval={id:"p",type:"approve_ceo_strategy",status:"pending",requestedByAgentId:"yan",createdAt:new Date().toISOString()};
  assert.equal(newCeoDelivery(null,snapshot("A",[],[],[approval]),"yan"),null);
  assert.equal(newCeoDelivery(snapshot("B"),snapshot("A",[],[],[approval]),"yan"),null);
  assert.equal(newCeoDelivery(snapshot("A"),snapshot("A",[],[],[approval]),"yan")?.id,"p");
  assert.equal(newCeoDelivery(snapshot("A"),snapshot("A",[],[],[{...approval,requestedByAgentId:"other"}]),"yan"),null);
});
test("snapshot reconciliation rejects delayed and invalid responses",()=>{
  const first=snapshot("A");first.generatedAt="2026-11-25T12:00:05Z";
  const old=snapshot("A");old.generatedAt="2026-11-25T12:00:04Z";
  const invalid=snapshot("A");invalid.generatedAt="bad";
  assert.equal(acceptNewerSnapshot(first,old),first);
  assert.equal(acceptNewerSnapshot(first,invalid),first);
  const other=snapshot("B");assert.equal(acceptNewerSnapshot(first,other),other);
});

test("lounge timer requires an authoritative zero and resets for competing work or loss of data", () => {
  const idle = { ...snapshot("A", [agent("yan", "Yan")]), issueAccess: "available", issuesComplete: true };
  const eligible = current => canRest(current, resolveRoster(current)[0]);
  assert.equal(eligible(idle), false, "a short visible page does not count private work");
  const confirmed = { ...idle, workload: { yan: "clear" } };
  assert.equal(eligible(confirmed), true);
  assert.equal(idleToLoungeDelayMs, 15000);
  const since = updateIdleSince(null, true, 100);
  assert.equal(updateIdleSince(since, true, 15100), 100);
  for (const interrupted of [
    { ...confirmed, issueAccess: "unavailable" },
    { ...confirmed, issuesComplete: false },
    { ...confirmed, approvalAccess: "unavailable" },
    { ...confirmed, workload: { yan: "busy" } },
    { ...confirmed, handoffs: [{ id: "h", fromAgentId: "other", toAgentId: "yan" }] },
    { ...confirmed, agents: [{ ...confirmed.agents[0], status: "paused" }] },
    { ...confirmed, agents: [{ ...confirmed.agents[0], status: "error" }] },
    { ...confirmed, approvals: [{ requestedByAgentId: "yan" }] },
    { ...confirmed, issues: [{ assigneeAgentId: "yan", status: "blocked" }] },
    { ...confirmed, issues: [{ assigneeAgentId: "yan", status: "in_progress", activeRun: { agentId: "yan", status: "running" } }] },
  ]) assert.equal(updateIdleSince(since, eligible(interrupted), 15100), null);
  assert.equal(updateIdleSince(null, true, 20000), 20000);
});
