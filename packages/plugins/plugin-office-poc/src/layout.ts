/** VPD Office R3 in metres. Room/seed coordinates are source baseline; door and nav anchors are R3 AI proposals. */
export type Point = readonly [number, number];
export type Bounds = { x: Point; z: Point };
export type Room = Bounds & { id: string; label: string; color: string };
export type Workstation = { id: string; role: string; room: string; seed: Point; color: string; prop: string };
export type Door = { id: string; room: string; center: Point; width: number; inside: Point; outside: Point };
export type NavNode = { id: string; at: Point; kind: "spine" | "connector" | "doorInside" | "doorOutside" | "target" };
export type NavEdge = readonly [string, string];

export const palette = {
  cream: "#F8F6ED", ivory: "#F2EEE5", beige: "#E7DCC8", wood: "#C99B69",
  amber: "#FFCA80", mint: "#8ED3C5", lavender: "#9279CF", charcoal: "#39465C",
  meeting: "#DCE3F2", creative: "#E2B45C", ai: "#5A98D0", pm: "#596574",
  post: "#947ED0", qa: "#4DA9A0", ceo: "#B9814A",
} as const;

export const floor: Bounds = { x: [-17, 17], z: [-12, 12] };
export const rooms: readonly Room[] = [
  { id: "meeting", label: "Meeting", x: [-17,-7], z: [-12,-5], color: palette.meeting },
  { id: "creative", label: "Creative", x: [-7,5], z: [-12,-5], color: palette.creative },
  { id: "ai", label: "AI Production", x: [5,17], z: [-12,-5], color: palette.ai },
  { id: "ceo", label: "CEO", x: [-17,-11], z: [5,12], color: palette.ceo },
  { id: "pm", label: "PM", x: [-11,-5], z: [5,12], color: palette.pm },
  { id: "post", label: "Post-production", x: [-5,7], z: [5,12], color: palette.post },
  { id: "qa", label: "QA", x: [7,17], z: [5,12], color: palette.qa },
];
export const lounge: Bounds = { x: [-5,5], z: [-2,2] };
export const corridors = [{ id: "negative", z: [-5,-2] as Point }, { id: "positive", z: [2,5] as Point }] as const;

export const workstations: readonly Workstation[] = [
  { id:"pm", role:"Yan — Project Manager", room:"pm", seed:[-8,9], color:palette.pm, prop:"clipboard" },
  { id:"creative_director", role:"Creative Director", room:"creative", seed:[-5,-9], color:palette.creative, prop:"storyboard" },
  { id:"scriptwriter", role:"Scriptwriter", room:"creative", seed:[-1.2,-9], color:palette.creative, prop:"notebook" },
  { id:"shot_planner", role:"Shot Planner", room:"creative", seed:[2.6,-9], color:palette.creative, prop:"framing card" },
  { id:"ai_production_lead", role:"AI Production Lead", room:"ai", seed:[6.9,-9], color:palette.ai, prop:"lead badge" },
  { id:"character_consistency", role:"Character & Consistency", room:"ai", seed:[10,-9], color:palette.ai, prop:"palette board" },
  { id:"visual_generator", role:"Visual Generator", room:"ai", seed:[13.1,-9], color:palette.ai, prop:"headset" },
  { id:"voice_audio", role:"Voice & Audio", room:"ai", seed:[16,-9], color:palette.ai, prop:"microphone" },
  { id:"video_editor", role:"Video Editor", room:"post", seed:[-3,9], color:palette.post, prop:"lead badge" },
  { id:"motion_subtitle", role:"Motion & Subtitle", room:"post", seed:[1,9], color:palette.post, prop:"stylus" },
  { id:"color_sound", role:"Color & Sound Mix", room:"post", seed:[5,9], color:palette.post, prop:"headphones" },
  { id:"qa_reviewer", role:"QA Reviewer", room:"qa", seed:[12,9], color:palette.qa, prop:"magnifier" },
];

/** Door centers follow R3 proposal; inside/outside are corrected to their geometric sides. */
export const doors: readonly Door[] = [
  { id:"D01", room:"meeting", center:[-12,-5], width:1.3, inside:[-12,-5.35], outside:[-12,-4.65] },
  { id:"D02", room:"creative", center:[-1,-5], width:1.3, inside:[-1,-5.35], outside:[-1,-4.65] },
  { id:"D03", room:"ai", center:[11,-5], width:1.3, inside:[11,-5.35], outside:[11,-4.65] },
  { id:"D04", room:"ceo", center:[-14,5], width:1.3, inside:[-14,5.35], outside:[-14,4.65] },
  { id:"D05", room:"pm", center:[-8,5], width:1.3, inside:[-8,5.35], outside:[-8,4.65] },
  { id:"D06", room:"post", center:[1,5], width:1.3, inside:[1,5.35], outside:[1,4.65] },
  { id:"D07", room:"qa", center:[12,5], width:1.3, inside:[12,5.35], outside:[12,4.65] },
];

export const loungeSlots = workstations.map((station, index) => ({
  deskId: station.id,
  id: `rest:${station.id}`,
  at: [(index % 6 - 2.5) * 1.45, index < 6 ? -1.28 : 1.28] as Point,
}));

function unique(xs: number[]) { return [...new Set(xs)].sort((a,b) => a-b); }
const xs = unique([-16,-14,-12,-8,-5.5,-1,0,1,5.5,11,12,16,...loungeSlots.map(slot => slot.at[0])]);
const navNodes: NavNode[] = [];
const navEdges: NavEdge[] = [];
function node(id: string, at: Point, kind: NavNode["kind"]) { navNodes.push({ id, at, kind }); }
function edge(a: string, b: string) { navEdges.push([a,b]); }
for (const side of ["n","p"] as const) {
  const z = side === "n" ? -3.5 : 3.5;
  xs.forEach((x, i) => { node(`${side}:${x}`, [x,z], "spine"); if (i) edge(`${side}:${xs[i-1]}`, `${side}:${x}`); });
}
for (const x of [-16,16]) {
  node(`end:${x}`, [x,0], "connector"); edge(`n:${x}`, `end:${x}`); edge(`end:${x}`, `p:${x}`);
}
for (const door of doors) {
  const side = door.center[1] < 0 ? "n" : "p";
  node(`${door.id}:outside`, door.outside, "doorOutside");
  node(`${door.id}:inside`, door.inside, "doorInside");
  node(`${door.id}:corridor`, [door.center[0], side === "n" ? -3.5 : 3.5], "connector");
  // The corridor point is on the spine; insert it between its neighbouring spine nodes.
  const left = xs.filter(x => x < door.center[0]).at(-1)!;
  const right = xs.find(x => x > door.center[0])!;
  edge(`${side}:${left}`, `${door.id}:corridor`); edge(`${door.id}:corridor`, `${side}:${right}`);
  edge(`${door.id}:corridor`, `${door.id}:outside`); edge(`${door.id}:outside`, `${door.id}:inside`);
  node(`${door.id}:approach`, [door.center[0], side === "n" ? -6.2 : 6.2], "connector");
  edge(`${door.id}:inside`, `${door.id}:approach`);
}
for (const desk of workstations) {
  node(`desk:${desk.id}`, desk.seed, "target");
  const doorId = doors.find(d => d.room === desk.room)!.id;
  // Walk around the desk before exiting. The workstation by the east wall uses its west side.
  const laneX = desk.seed[0] + (desk.seed[0] === 16 ? -1.38 : 1.38);
  node(`lane:${desk.id}:rear`, [laneX, desk.seed[1]], "connector");
  node(`lane:${desk.id}:front`, [laneX, Math.sign(desk.seed[1]) * 6.2], "connector");
  edge(`desk:${desk.id}`, `lane:${desk.id}:rear`);
  edge(`lane:${desk.id}:rear`, `lane:${desk.id}:front`);
  edge(`lane:${desk.id}:front`, `${doorId}:approach`);
}
node("target:ceo-tray", [-14,8], "target"); edge("D04:inside", "target:ceo-tray");
node("target:meeting", [-12,-6.95], "target"); edge("D01:inside", "target:meeting");
for (const [index,x] of [-13.5,-12,-10.5].entries()) {
  node(`meeting:entry:${index}`, [x,-5.64], "connector");
  node(`meeting:seat:${index}`, [x,-7], "target");
  edge(`meeting:entry:${index}`,`meeting:seat:${index}`);
  if(index!==1) edge("meeting:entry:1",`meeting:entry:${index}`);
}
edge("D01:inside","meeting:entry:1");
node("lounge:left", [-5.5,0], "connector"); edge("n:-5.5","lounge:left"); edge("lounge:left","p:-5.5");
node("target:lounge", [0,1.28], "target"); edge("p:0","target:lounge");
for (const slot of loungeSlots) {
  node(slot.id, slot.at, "target");
  edge(`${slot.at[1] < 0 ? "n" : "p"}:${slot.at[0]}`, slot.id);
}
// Visual-only rest activities. The KayKit couches are centered at X ±2.3,
// face toward the middle aisle, and have a ~0.55 m cushion after scene scaling.
// The coffee counter is at (4.2, 0); its interaction point leaves 0.66 m
// between the actor center and the front of the cabinet.
export const loungeActivities = [
  { id: "lounge:sofa:left", at: [-2.3, .12] as Point, from: "rest:voice_audio", kind: "sofa" as const, facing: 0 },
  { id: "lounge:sofa:right", at: [2.3, -.12] as Point, from: "rest:ai_production_lead", kind: "sofa" as const, facing: Math.PI },
  { id: "lounge:coffee", at: [4.2, -1] as Point, from: "rest:character_consistency", kind: "coffee" as const, facing: 0 },
] as const;
for (const activity of loungeActivities) { node(activity.id, activity.at, "target"); edge(activity.from, activity.id); }
export const navigation = { nodes: navNodes, edges: navEdges } as const;

export function pointIn(point: Point, bounds: Bounds, margin = 0) {
  return point[0] >= bounds.x[0]+margin && point[0] <= bounds.x[1]-margin
    && point[1] >= bounds.z[0]+margin && point[1] <= bounds.z[1]-margin;
}

/** Deterministic shortest route on the validated R3 graph; all room exits pass a door pair. */
export function route(from: string, to: string): Point[] | null {
  const nodes = new Map(navigation.nodes.map(n => [n.id,n]));
  if (!nodes.has(from) || !nodes.has(to)) return null;
  const distance = new Map<string, number>([[from,0]]);
  const previous = new Map<string,string>();
  const queue = new Set([from]);
  while (queue.size) {
    const current = [...queue].sort((a,b) => (distance.get(a)!-distance.get(b)!) || a.localeCompare(b))[0]!;
    queue.delete(current); if (current === to) break;
    for (const [a,b] of navigation.edges) {
      const next = a === current ? b : b === current ? a : null;
      if (!next) continue;
      const p = nodes.get(current)!.at, q = nodes.get(next)!.at;
      const candidate = distance.get(current)! + Math.hypot(q[0]-p[0],q[1]-p[1]);
      if (candidate < (distance.get(next) ?? Infinity)) { distance.set(next,candidate); previous.set(next,current); queue.add(next); }
    }
  }
  if (!distance.has(to)) return null;
  const ids = [to]; while (ids[0] !== from) ids.unshift(previous.get(ids[0]!)!);
  return ids.map(id => nodes.get(id)!.at);
}

export function reverseTraversedRoute(path: readonly Point[], nextIndex: number): Point[] {
  return path.slice(0, nextIndex).reverse();
}

export function validateLayout(): string[] {
  const errors: string[] = [];
  if (floor.x[1]-floor.x[0] !== 34 || floor.z[1]-floor.z[0] !== 24) errors.push("floor 34x24");
  if (rooms.length !== 7 || doors.length !== 7 || workstations.length !== 12) errors.push("counts");
  if (lounge.x[1]-lounge.x[0] !== 10 || lounge.z[1]-lounge.z[0] !== 4) errors.push("lounge");
  if (corridors.some(c => c.z[1]-c.z[0] !== 3)) errors.push("corridors");
  for (const room of rooms) {
    if (!pointIn([room.x[0],room.z[0]],floor) || !pointIn([room.x[1],room.z[1]],floor)) errors.push(`bounds:${room.id}`);
    for (const other of rooms) if (other !== room && room.x[0] < other.x[1] && room.x[1] > other.x[0] && room.z[0] < other.z[1] && room.z[1] > other.z[0]) errors.push(`overlap:${room.id}:${other.id}`);
  }
  for (const desk of workstations) if (!pointIn(desk.seed,rooms.find(r => r.id === desk.room)!,0.2)) errors.push(`desk:${desk.id}`);
  for (const door of doors) {
    const room = rooms.find(r => r.id === door.room);
    if (!room || !pointIn(door.inside,room) || pointIn(door.outside,room) || door.width < 1.2 || door.width > 1.4) errors.push(`door:${door.id}`);
    if (!route(`desk:${workstations.find(w => w.room === door.room)?.id ?? "pm"}`, "target:meeting")) errors.push(`route:${door.id}`);
  }
  for (const desk of workstations) if (!route(`desk:${desk.id}`, "target:ceo-tray") || !route(`desk:${desk.id}`, "target:lounge")) errors.push(`connected:${desk.id}`);
  if (workstations[0]?.id !== "pm" || workstations[0]?.seed[0] !== -8 || workstations[0]?.seed[1] !== 9) errors.push("yan-seed");
  return errors;
}
