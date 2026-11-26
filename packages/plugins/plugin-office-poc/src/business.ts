import { workstations } from "./layout.js";

export type OfficeAgent = { id:string; name:string; title:string|null; role:string; status:string; reportsTo:string|null; metadata:Record<string,unknown>|null };
export type OfficeIssue = { id:string; identifier:string|null; title:string; status:string; assigneeAgentId:string|null; activeRun:{id:string;agentId:string;status:string;startedAt:Date|string|null}|null };
export type OfficeApproval = {id:string;type:string;status:string;requestedByAgentId:string|null;createdAt:Date|string};
export type OfficeSnapshot = {companyId:string;generatedAt:string;agents:OfficeAgent[];issues:OfficeIssue[];approvals:OfficeApproval[];approvalAccess:"available"|"unavailable";issueAccess?:"available"|"unavailable";issuesComplete?:boolean;
  workload?: Record<string, "clear" | "busy">;
  handoffs?: { id: string; fromAgentId: string; toAgentId: string }[];
  meetings?: { id: string; companyId: string; organizerId: string; participantIds: string[]; state: "started" | "ended" | "cancelled"; startedAt: string; expiresAt: string }[];
};
export type RosterEntry = {deskId:string;agent:OfficeAgent|null;issue:OfficeIssue|null;run:OfficeIssue["activeRun"];state:"unknown"|"idle"|"working"|"error"|"paused"};

/** Titles come only from the actor-scoped, current Office snapshot. */
export function visibleAgentIssues(snapshot:OfficeSnapshot|null, freshness:string, agentId:string):OfficeIssue[]{
  if(!snapshot||freshness!=="active"||snapshot.issueAccess!=="available")return [];
  return snapshot.issues.filter(issue=>issue.assigneeAgentId===agentId&&! ["done","cancelled"].includes(issue.status))
    .sort((a,b)=>Number(b.activeRun?.agentId===agentId&&b.activeRun.status==="running")-Number(a.activeRun?.agentId===agentId&&a.activeRun.status==="running"));
}

function normalize(s:string){return s.toLowerCase().replace(/[^a-z0-9]+/g,"").trim();}
const aliases:Record<string,string[]>={pm:["Yan","Project Manager","PM"],creative_director:["Creative Director"],scriptwriter:["Scriptwriter"],shot_planner:["Shot Planner"],ai_production_lead:["AI Production Lead"],character_consistency:["Character & Consistency"],visual_generator:["Visual Generator"],voice_audio:["Voice & Audio"],video_editor:["Video Editor"],motion_subtitle:["Motion & Subtitle"],color_sound:["Color & Sound Mix"],qa_reviewer:["QA Reviewer"]};

/** An explicit office alias wins. Name/title matching is accepted only when unique within this company. */
export function resolveRoster(snapshot:OfficeSnapshot):RosterEntry[]{
  const assigned=new Set<string>();
  return workstations.map(station=>{
    const explicit=snapshot.agents.filter(a=>a.metadata?.officeAlias===station.id);
    const candidates=explicit.length?explicit:snapshot.agents.filter(a=>aliases[station.id]?.some(alias=>normalize(a.name)===normalize(alias)||normalize(a.title??"")===normalize(alias))||(station.id==="pm"&&/^Yan(?:\s|$)/i.test(a.name)));
    const agent=candidates.length===1&&!assigned.has(candidates[0]!.id)?candidates[0]!:null;
    if(agent)assigned.add(agent.id);
    const owned=agent?snapshot.issues.filter(i=>i.assigneeAgentId===agent.id):[];
    const issue=owned.find(i=>i.activeRun?.agentId===agent?.id)??owned.find(i=>!["done","cancelled"].includes(i.status))??null;
    const run=issue?.activeRun??null;
    const state:RosterEntry["state"]=!agent||snapshot.issueAccess==="unavailable"?"unknown":agent.status==="error"||run?.status==="failed"?"error":agent.status==="paused"?"paused":run&&["running","queued"].includes(run.status)?"working":["running","pending_approval","terminated"].includes(agent.status)&&!run?"unknown":snapshot.issuesComplete===false?"unknown":"idle";
    return {deskId:station.id,agent,issue,run,state};
  });
}

export function ceoDeliveryApproval(approval:OfficeApproval,yanId:string){
  return approval.status==="pending"&&approval.requestedByAgentId===yanId&&["approve_ceo_strategy","request_board_approval"].includes(approval.type);
}

export function canRest(snapshot: OfficeSnapshot, entry: RosterEntry): boolean {
  const agent = entry.agent;
  return agent?.status === "idle" && entry.state === "idle" && !entry.run
    && snapshot.issueAccess === "available" && snapshot.issuesComplete === true
    && snapshot.workload?.[agent.id] === "clear"
    && !snapshot.handoffs?.some(handoff => handoff.fromAgentId === agent.id || handoff.toAgentId === agent.id)
    && snapshot.approvalAccess === "available"
    && snapshot.issues.every(issue => issue.assigneeAgentId !== agent.id || ["done", "cancelled"].includes(issue.status))
    && snapshot.approvals.every(approval => approval.requestedByAgentId !== agent.id);
}

export const idleToLoungeDelayMs = 15_000;

export function updateIdleSince(since: number | null, eligible: boolean, now: number): number | null {
  return eligible ? since ?? now : null;
}

/** Only a new approval observed during an open session can launch a delivery. */
export function newCeoDelivery(previous:OfficeSnapshot|null,next:OfficeSnapshot,yanId:string):OfficeApproval|null{
  return newCeoDeliveries(previous,next,yanId)[0]??null;
}

export function newCeoDeliveries(previous:OfficeSnapshot|null,next:OfficeSnapshot,yanId:string):OfficeApproval[]{
  if(!previous||previous.companyId!==next.companyId||next.approvalAccess!=="available")return [];
  const seen=new Set(previous.approvals.map(a=>a.id));
  return next.approvals.filter(a=>!seen.has(a.id)&&ceoDeliveryApproval(a,yanId)).sort((a,b)=>Date.parse(String(a.createdAt))-Date.parse(String(b.createdAt)));
}

/** Ignore delayed polling responses and never merge snapshots across companies. */
export function acceptNewerSnapshot(previous:OfficeSnapshot|null,next:OfficeSnapshot):OfficeSnapshot|null{
  const nextAt=Date.parse(next.generatedAt);
  if(!Number.isFinite(nextAt))return previous;
  if(!previous||previous.companyId!==next.companyId)return next;
  return nextAt>Date.parse(previous.generatedAt)?next:previous;
}
