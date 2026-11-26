import { doors, palette, rooms, workstations } from "../layout.js";

export type OfficeBox = readonly [x: number, y: number, z: number, width: number, height: number, depth: number, color: string, name?: string];
export const plantLocations = [[-16,10.8],[-6,10.8],[6,10.8],[16,10.8],[-16,-10.8],[16,-10.8]] as const;
// Furnish only the outer edge of the 3 m corridors and the outer corners of the lounge.
// These are visual props; R3 navigation nodes and collision fixtures remain unchanged.
export const edgeFurniture = [
  {model:"cabinet_medium_decorated",x:-4.2,z:0,scale:.68,area:"lounge"},
  {model:"cabinet_medium_decorated",x:4.2,z:0,scale:.68,area:"lounge"},
  {model:"cabinet_medium_decorated",x:-9,z:-2.08,scale:.68,area:"corridor"},
  {model:"cabinet_medium_decorated",x:9,z:2.08,scale:.68,area:"corridor"},
  {model:"table_low",x:-6.7,z:2.08,scale:.46,area:"corridor"},
  {model:"table_low",x:6.7,z:-2.08,scale:.46,area:"corridor"},
  {model:"cactus_medium_A",x:-14,z:-2.08,scale:1.1,area:"corridor"},
  {model:"cactus_medium_A",x:14,z:2.08,scale:1.1,area:"corridor"},
] as const;
const roomFloor: Record<string, string> = {
  meeting: "#E5E9ED", creative: "#F3E3BD", ai: "#CADFEA", ceo: "#E5C6A8",
  pm: "#CCD0D3", post: "#E0D5EE", qa: "#CBE6DC",
};

export function officeBoxes(): OfficeBox[] {
  const boxes: OfficeBox[] = [];
  const box = (...args: OfficeBox) => boxes.push(args);
  const mat = (color: string) => color;
  const wood=mat(palette.wood),ivory=mat(palette.ivory),dark=mat(palette.charcoal),white=mat("#FFFFFF");
  box(0,-.16,0,34,.3,24,mat(palette.beige),"floor-34x24");
  for(const room of rooms){
    const cx=(room.x[0]+room.x[1])/2,cz=(room.z[0]+room.z[1])/2,w=room.x[1]-room.x[0],d=room.z[1]-room.z[0];
    box(cx,.01,cz,w,.04,d,roomFloor[room.id] ?? room.color,`room:${room.id}`);
    box(cx,.032,cz,w-.5,.006,d-.6,room.color,`floor-inlay:${room.id}`);
    const door=doors.find(v=>v.room===room.id)!, near=room.z[1]<0?room.z[1]:room.z[0],far=room.z[1]<0?room.z[0]:room.z[1];
    for(const [a,b] of [[room.x[0],door.center[0]-door.width/2],[door.center[0]+door.width/2,room.x[1]]])if(b>a)box((a+b)/2,.36,near,b-a,.72,.12,ivory);
    box(cx,far<0?1.12:.38,far,w,far<0?2.24:.76,.12,ivory,"rear-wall");for(const x of room.x)box(x,.65,cz,.12,1.3,d,ivory,"partition-wall");
    box(cx,.08,far+.18*(far<0?1:-1),w-.25,.12,.16,wood,"baseboard");
    box(cx,.70,far,w-.13,.04,.123,room.color,"wall-cap");
    box(door.center[0],.02,near,door.width,.04,.28,wood,`door:${door.id}`);
  }
  box(0,.02,0,10,.05,4,"#E6E1C8","lounge");
  box(0,.047,0,9.3,.008,3.56,"#ABC4A0","lounge-rug");
  for(const station of workstations){const [x,z]=station.seed,accent=mat(station.color), side=Math.sign(z);
    box(x,.48,z-side*.98,1.5,.13,.75,wood,`desk:${station.id}`);
    for(const dx of [-.62,.62])box(x+dx,.24,z-side*.98,.09,.45,.55,dark);
    box(x,.72,z-side*1.24,.6,.46,.07,dark);box(x,.74,z-side*1.19,.48,.34,.015,accent);
    box(x,.58,z-side*.84,.39,.026,.17,"#DDE4E7","keyboard");
    box(x-.48,.58,z-side*.96,.25,.035,.26,accent,"desk-mat");
    box(x,.39,z+side*.88,.66,.13,.6,accent,`seat:${station.id}`);box(x,.64,z+side*1.16,.66,.5,.1,accent,`seat-back:${station.id}`);
    box(x+.53,.58,z-side*.98,.18,.12,.2,white,`prop:${station.prop}`);
    box(x,.59,z-side*1.2,.08,.14,.08,"#52606B","monitor-stand");
    box(x-.48,.61,z-side*.96,.2,.035,.22,"#F8F1E2","notebook");
    if (["ai_lead","character_consistency","visual_generator","voice_audio","video_editor","motion_subtitle","color_sound"].includes(station.id)) {
      box(x+.47,.70,z-side*1.21,.31,.3,.045,dark,"side-display");
      box(x+.47,.71,z-side*1.18,.25,.23,.012,accent,"side-display-glass");
    }
  }
  box(-14,.48,9.1,2.3,.15,1,wood,"ceo-desk");box(-14,.4,10.2,.8,.16,.7,dark,"ceo-empty-chair");box(-14,.63,9.1,.52,.04,.35,white,"ceo-approval-tray");
  box(-12,.48,-9,3.4,.16,1.6,wood,"meeting-table");for(const x of [-13.3,-12.4,-11.5,-10.6])for(const z of [-10.2,-7.8])box(x,.31,z,.55,.6,.48,dark,"meeting-seat");
  for (const x of [-3.1,3.1]) {
    const back = x < 0 ? -.46 : .46;
    box(x,.37,0,2.3,.38,.8,"#739784","lounge-sofa");
    box(x,.38,back,2.3,.68,.15,"#739784","sofa-back");
    for (const offset of [-.53,.53]) box(x+offset,.59,0,.99,.12,.73,"#A6C1A9","sofa-cushion");
    box(x+.68,.69,back*.67,.32,.24,.23,"#EAC28C","sofa-pillow");
  }
  box(0,.32,0,1.25,.15,.75,wood,"lounge-table");
  box(-.16,.415,0,.38,.032,.33,"#EFE4CC","coffee-tray");
  box(.18,.445,.1,.14,.11,.14,"#F8F0DD","lounge-cup");
  box(0,.54,-.27,.37,.28,.22,"#475C59","coffee-machine");
  box(0,.7,-.27,.3,.045,.19,"#D2B888","coffee-machine-top");
  box(0,.46,-.14,.18,.035,.08,"#E6C598","coffee-machine-drip");
  for (const [x,z] of plantLocations) box(x,.23,z,.42,.46,.42,wood,"planter");
  return boxes;
}
