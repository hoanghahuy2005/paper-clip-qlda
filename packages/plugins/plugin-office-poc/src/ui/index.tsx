import { useEffect, useMemo, useRef, useState } from "react";
import { useHostLocation, useHostNavigation, usePluginData, type PluginPageProps, type PluginSidebarProps } from "@paperclipai/plugin-sdk/ui";
import { acceptNewerSnapshot, canRest, newCeoDelivery, resolveRoster, type OfficeSnapshot } from "../business.js";
import { floor, lounge, rooms, workstations } from "../layout.js";
import { mountScene, type ActorVisual, type MotionStatus, type SceneHandle } from "./scene.js";
import { snapshotFreshness, startSnapshotPolling } from "./polling.js";
const toolbarButton = {padding:"6px 12px",minHeight:36,border:"1px solid #70778D",borderRadius:12,background:"#20283B",color:"#F8F1E5"} as const;
const rigUrl = "/_plugins/vpd-office-poc/ui/assets/office-base-rig.glb";
const labelsKey = "lowtech-office:room-labels";
function LabelToggle({visible,onClick}:{visible:boolean;onClick:()=>void}){
  const label=visible?"Hide Labels":"Show Labels";
  return <button type="button" aria-label={label} title={label} aria-pressed={visible} style={{...toolbarButton,display:"inline-flex",alignItems:"center",gap:6}} onClick={onClick}>
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{!visible&&<path d="M3 3 21 21"/>}</svg>{label}
  </button>;
}

export function OfficeSidebar({ context }: PluginSidebarProps) {
  const nav=useHostNavigation(),{pathname}=useHostLocation();if(!context.companyId)return null;
  return <a {...nav.linkProps("/office")} aria-current={pathname===nav.resolveHref("/office")?"page":undefined} className="design-sidebar-item flex items-center rounded-lg">Office</a>;
}
export function OfficePage({context}:PluginPageProps){return <OfficeContent key={context.companyId??"none"} context={context}/>;}

function OfficeContent({context}:PluginPageProps){
  const companyId=context.companyId,nav=useHostNavigation();
  const snapshot=usePluginData<OfficeSnapshot>("office-snapshot",companyId?{companyId}:undefined);
  const [now,setNow]=useState(()=>Date.now()),[sceneStatus,setSceneStatus]=useState("Starting Three.js…"),[sceneReady,setSceneReady]=useState(false),[fallback,setFallback]=useState(false),[selected,setSelected]=useState<string|null>(null),[accepted,setAccepted]=useState<OfficeSnapshot|null>(null);
  const container=useRef<HTMLDivElement>(null),scene=useRef<SceneHandle|null>(null),refresh=useRef(snapshot.refresh),previous=useRef<OfficeSnapshot|null>(null),loaded=useRef(false);
  refresh.current=snapshot.refresh;
  const [online, setOnline] = useState(() => navigator.onLine);
  const [motion, setMotion] = useState<Record<string, MotionStatus>>({});
  const [present,setPresent]=useState(false),[clean,setClean]=useState(false),[collapsed,setCollapsed]=useState(false),[room,setRoom]=useState("overview"),[nativeFull,setNativeFull]=useState(false);
  const [labelsVisible,setLabelsVisible]=useState(()=>{try{return localStorage.getItem(labelsKey)!=="hidden";}catch{return true;}});
  const toggleLabels=()=>setLabelsVisible(value=>!value);
  useEffect(()=>{scene.current?.setLabelsVisible(labelsVisible);try{localStorage.setItem(labelsKey,labelsVisible?"shown":"hidden");}catch{/* Storage may be unavailable. */}},[labelsVisible,sceneReady]);
  const presentation=useRef<HTMLElement>(null);
  useEffect(()=>{const sync=()=>{const active=document.fullscreenElement===presentation.current;setNativeFull(active);if(!document.fullscreenElement)setPresent(false);};document.addEventListener("fullscreenchange",sync);return()=>document.removeEventListener("fullscreenchange",sync);},[]);
  const enter=async()=>{setPresent(true);try{if(!presentation.current?.requestFullscreen)throw Error("Unavailable");await presentation.current.requestFullscreen();setNativeFull(true);}catch{setNativeFull(false);}};
  const exit=async()=>{if(document.fullscreenElement===presentation.current)await document.exitFullscreen();setPresent(false);setClean(false);};
  const focus=(id:string)=>{setRoom(id);if(id==="overview")scene.current?.resetCamera();else scene.current?.focusRoom(id);};
  const [resumeSnapshot, setResumeSnapshot] = useState<string | null>(null);
  const latestSnapshot = useRef<string | null>(null);
  useEffect(() => {
    const offline = () => { setOnline(false); previous.current = null; };
    const reconnect = () => refresh.current();
    const connected = () => { setResumeSnapshot(latestSnapshot.current); setOnline(true); reconnect(); };
    window.addEventListener("offline", offline);
    window.addEventListener("online", connected);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", connected);
    };
  }, []);
  useEffect(()=>{if(!companyId)return;return startSnapshotPolling(()=>{setNow(Date.now());refresh.current();});},[companyId]);
  useEffect(()=>{if(!container.current)return;let cancelled=false;
    mountScene(container.current,rigUrl,companyId??"",setSceneStatus,id=>setSelected(id),(id,status)=>{
      if(!cancelled)setMotion(current=>({...current,[id]:status}));
    }).then(handle=>{if(cancelled)handle.dispose();else{scene.current=handle;loaded.current=true;setSceneReady(true);}}).catch(error=>{if(!cancelled){setSceneStatus(`3D unavailable: ${String(error)}`);setFallback(true);}});
    return()=>{cancelled=true;scene.current?.dispose();scene.current=null;loaded.current=false;};
  },[]);
  useEffect(()=>{if(snapshot.data?.companyId===companyId)setAccepted(previous=>acceptNewerSnapshot(previous,snapshot.data!));},[snapshot.data,companyId]);
  const valid=accepted?.companyId===companyId?accepted:null;
  latestSnapshot.current=valid?.generatedAt??null;
  const awaitingSnapshot=resumeSnapshot!==null && valid?.generatedAt===resumeSnapshot;
  const freshness=snapshotFreshness(valid,snapshot.error || !online || awaitingSnapshot,now),roster=useMemo(()=>valid?resolveRoster(valid):[],[valid]);
  useEffect(()=>{if(!sceneReady||!loaded.current||!scene.current)return;
    const yan=roster.find(r=>r.deskId==="pm")?.agent;
    const delivery=freshness==="active"&&valid&&yan?newCeoDelivery(previous.current,valid,yan.id):null;
    const priorHandoffs=previous.current?.handoffs;
    const newHandoffs=freshness==="active" && priorHandoffs
      ? valid?.handoffs?.filter(item=>!priorHandoffs.some(old=>old.id===item.id)) ?? [] : [];
    const visuals:ActorVisual[]=roster.filter(r=>r.agent).map(r=>{
      const meeting=freshness==="active"&&valid?.meetings?.find(item=>item.state==="started" && item.companyId===companyId && item.participantIds.includes(r.agent!.id));
      const handoff=newHandoffs.find(item=>item.fromAgentId===r.agent!.id && item.toAgentId!==item.fromAgentId);
      const recipient=handoff && roster.find(row=>row.agent?.id===handoff.toAgentId);
      return {id:r.agent!.id,deskId:r.deskId,name:r.agent!.name,state:freshness==="active"?(r.run?.status==="queued"?"idle":r.state):freshness,
        restEligible: !meeting && freshness==="active" && valid !== null && canRest(valid,r),
        meeting: meeting ? {id:meeting.id, seat:meeting.participantIds.indexOf(r.agent!.id), expiresAt:Date.parse(meeting.expiresAt)} : undefined,
        ...(delivery&&r.deskId==="pm"?{journey:"ceo" as const,journeyKey:delivery.id}
          : handoff&&recipient?{journey:"handoff" as const,journeyKey:handoff.id,recipientDesk:recipient.deskId}:{})};
    });
    const pendingIds=freshness==="active"&&valid?.approvalAccess==="available"
      ? new Set(valid.approvals.map(approval=>approval.id)) : undefined;
    scene.current.update(visuals,pendingIds);
    previous.current=freshness==="active"?valid:null;
  },[valid,roster,freshness,sceneReady]);
  if(!companyId)return <p>Select a company to view Office.</p>;
  const current=roster.find(r=>r.agent?.id===selected),pending=valid?.approvals??[];
  return <section ref={presentation} className={present?"lowtech-present":""} style={{display:"grid",gap:present?0:14,color:present?"#F8F1E5":"var(--foreground)",position:present?"fixed":"relative",inset:present?0:undefined,zIndex:present?99999:undefined,background:present?"#151B29":undefined,width:present?"100vw":undefined,height:present?"100vh":undefined,gridTemplateRows:present?"minmax(0,1fr)":undefined,overflow:present?"hidden":undefined}}>
    <style>{`.lowtech-present > p, .lowtech-present > div[aria-label="2D office fallback"], .lowtech-present > div:last-child { display:none !important; }`}</style>
    {present&&<div style={{position:"absolute",top:12,left:12,right:12,zIndex:5,display:"flex",gap:12,alignItems:"center"}}>{clean?<button type="button" style={toolbarButton} onClick={()=>setClean(false)}>Show controls</button>:<><strong>LowTech Office</strong><span>Data: {freshness} · {roster.filter(r=>r.agent).length} agents</span><span style={{marginLeft:"auto"}}>{!nativeFull&&"Expanded viewport fallback"}</span><LabelToggle visible={labelsVisible} onClick={toggleLabels}/><button type="button" style={toolbarButton} onClick={()=>setClean(true)}>Hide Controls</button><button type="button" style={toolbarButton} onClick={exit}>Exit Fullscreen</button></>}</div>}
    {present&&!clean&&<nav aria-label="Office rooms" style={{position:"absolute",top:65,left:12,zIndex:5,width:collapsed?55:210,maxHeight:"calc(100vh - 80px)",overflowY:"auto",padding:8,borderRadius:14,background:"#192338DD",display:"grid",gap:5}}><button type="button" style={toolbarButton} onClick={()=>setCollapsed(v=>!v)}>{collapsed?"☰":"☰ Rooms"}</button>{!collapsed&&<>{[["overview","◈ Overview"],["lounge","☕ Lounge"],["meeting","◉ Meeting"],["creative","✦ Creative"],["ai","⌘ AI Production"],["post","▣ Post-production"],["qa","✓ QA"],["pm","▤ PM / Yan"],["ceo","♛ CEO"]].map(([id,label])=><button key={id} type="button" aria-current={room===id?"page":undefined} style={{...toolbarButton,textAlign:"left",borderColor:room===id?"#FFC777":"#70778D"}} onClick={()=>focus(id)}>{label}</button>)}<button type="button" style={toolbarButton} onClick={()=>scene.current?.zoomBy(1.2)}>Zoom +</button><button type="button" style={toolbarButton} onClick={()=>scene.current?.zoomBy(1/1.2)}>Zoom −</button><button type="button" style={toolbarButton} onClick={()=>focus("overview")}>Reset camera</button></>}</nav>}
    {present&&!clean&&<div aria-label="LowTech Office brand" style={{position:"absolute",right:14,bottom:12,zIndex:5,pointerEvents:"none",padding:"5px 10px",border:"1px solid #FF8B4277",borderRadius:8,background:"#111319CC",color:"#FFD1A1",fontSize:11,fontWeight:700,letterSpacing:".12em",textShadow:"0 0 9px #FF701F99"}}>LOWTECH OFFICE</div>}
    <header style={{display:present?"none":undefined}}>
      <h1>LowTech Office</h1>
      <button type="button" style={{...toolbarButton,float:"right"}} onClick={enter}>Fullscreen</button>
      <p role="status">Data: <strong>{freshness}</strong> · Polling 5s · {roster.filter(row=>row.agent).length}/12 assigned</p>
      <div role="group" aria-label="Office view" style={{display:"flex",flexWrap:"wrap",gap:8}}>
        <button type="button" style={toolbarButton} onClick={()=>{setNow(Date.now());snapshot.refresh();}}>Reconnect</button>
        <button type="button" style={toolbarButton} disabled={fallback&&!sceneReady} onClick={()=>setFallback(value=>!value)}>{fallback?"Show 3D":"Show 2D"}</button>
        <LabelToggle visible={labelsVisible} onClick={toggleLabels}/>
      </div>
      {!fallback&&<div role="group" aria-label="Camera controls" style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
        <button type="button" style={toolbarButton} onClick={()=>scene.current?.resetCamera()}>Overview</button>
        <button type="button" style={toolbarButton} onClick={()=>scene.current?.focusRoom("lounge")}>Lounge</button>
        <button type="button" style={toolbarButton} onClick={()=>scene.current?.focusRoom("meeting")}>Meeting room</button>
        <button type="button" style={toolbarButton} onClick={()=>scene.current?.focusRoom("ceo")}>CEO room</button>
        <button type="button" style={toolbarButton} onClick={()=>scene.current?.orbitBy(-Math.PI/8)}>Rotate left</button>
        <button type="button" style={toolbarButton} onClick={()=>scene.current?.orbitBy(Math.PI/8)}>Rotate right</button>
        <button type="button" style={toolbarButton} onClick={()=>scene.current?.zoomBy(1.2)}>Zoom in</button>
        <button type="button" style={toolbarButton} onClick={()=>scene.current?.zoomBy(1/1.2)}>Zoom out</button>
      </div>}
    </header>
    <div ref={container} style={{width:"100%",height:fallback?0:present?"100%":"max(480px, calc(100vh - 320px))",minHeight:present?0:undefined,overflow:"hidden",border:fallback||present?"none":"1px solid var(--border)",borderRadius:present?0:12}} role="region" aria-label="3D office" aria-hidden={fallback} />
    {fallback&&<div aria-label="2D office fallback" style={{position:"relative",width:"100%",aspectRatio:"34 / 24",background:"#E7DCC8",border:"1px solid var(--border)"}}>
      {[...rooms,{...lounge,id:"lounge",label:"Lounge",color:"#A9C49B"}].map(room=><div key={room.id} style={{position:"absolute",left:`${(room.x[0]-floor.x[0])/34*100}%`,top:`${(room.z[0]-floor.z[0])/24*100}%`,width:`${(room.x[1]-room.x[0])/34*100}%`,height:`${(room.z[1]-room.z[0])/24*100}%`,background:room.color,border:"1px solid #fff",fontSize:12,padding:3,boxSizing:"border-box"}}>{room.label}</div>)}
      {roster.filter(r=>r.agent).map(r=>{const seed=workstations.find(w=>w.id===r.deskId)!.seed;return <button key={r.agent!.id} type="button" aria-label={r.agent!.name} title={r.agent!.name} aria-pressed={selected===r.agent!.id} onClick={()=>setSelected(r.agent!.id)} style={{position:"absolute",left:`${(seed[0]-floor.x[0])/34*100}%`,top:`${(seed[1]-floor.z[0])/24*100}%`,minWidth:24,minHeight:24,borderRadius:"50%",background:"#39465C",color:"white",border:"2px solid white"}}>•</button>;})}
    </div>}
    <p>{sceneStatus} · Drag to orbit, wheel to zoom. Empty desks mean no uniquely matched Paperclip agent.</p>
    {snapshot.error&&<p role="alert">Snapshot unavailable: {snapshot.error.message}</p>}
    {valid?.issueAccess==="unavailable"&&<p role="alert">Task and run read permission is unavailable. Agent work state is unknown.</p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16}}>
      <div><h2>12 workstations</h2><ul>{workstations.map(station=>{const entry=roster.find(r=>r.deskId===station.id);return <li key={station.id}><button type="button" disabled={!entry?.agent} data-motion={entry?.agent ? motion[entry.agent.id] ?? "At workstation" : undefined} aria-pressed={selected===entry?.agent?.id} onClick={()=>{if(entry?.agent){setSelected(entry.agent.id);scene.current?.select(entry.agent.id);}}}>{entry?.agent?.name??station.role}</button> — {entry?.agent?(freshness==="active"?entry.state:freshness):"unassigned"}</li>;})}</ul>
        {valid?.agents.some(a=>!roster.some(r=>r.agent?.id===a.id))&&<><h3>Unmapped Paperclip agents</h3><ul>{valid.agents.filter(a=>!roster.some(r=>r.agent?.id===a.id)).map(a=><li key={a.id}>{a.name} — role not mapped to an Office desk</li>)}</ul></>}
      </div>
      <div><h2>Agent detail</h2>{current?<><p><strong>{current.agent!.name}</strong> · {current.agent!.title??current.agent!.role}</p><p>Desk: {current.deskId} · State: {freshness==="active"?current.state:freshness}</p>{sceneReady&&!fallback&&<p>Location: {motion[current.agent!.id]??"At workstation"}</p>}<p>Task: {valid?.issueAccess==="unavailable"?"Task data unavailable":current.issue?.title??"No assigned task in snapshot"}</p><p>Run: {valid?.issueAccess==="unavailable"?"Run data unavailable":current.run?`${current.run.id} (${current.run.status})`:"No active run"}</p>{current.issue&&<a {...nav.linkProps(`/issues/${current.issue.identifier??current.issue.id}`)}>Open task in Paperclip</a>}</>:<p>Select a linked agent.</p>}</div>
      <div><h2>Pending approvals</h2>{valid?.approvalAccess==="unavailable"?<p>Approval data unavailable.</p>:<><p>{freshness==="active"?pending.length:freshness} pending</p><ul>{pending.map(a=><li key={a.id}>{a.type} · <a {...nav.linkProps(`/approvals/${a.id}`)}>Open in Paperclip</a></li>)}</ul></>}</div>
    </div>
  </section>;
}
