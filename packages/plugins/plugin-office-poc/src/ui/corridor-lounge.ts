// Render-only placements; route nodes, colliders and Lounge interaction slots stay in layout.ts.
export const corridorEdgeDoors = [
  {id:"west",x:-17,z:0,width:1.5,height:2.05},
  {id:"east",x:17,z:0,width:1.5,height:2.05},
] as const;

export const premiumEdgeProps = [
  {model:"lamp_standing",x:-12.4,z:-2.16,scale:.73},
  {model:"shelf_A_big",x:8.55,z:-2.16,scale:.72},
  {model:"lamp_standing",x:-11.2,z:2.16,scale:.73},
  {model:"cactus_medium_B",x:7.1,z:2.16,scale:.83},
  {model:"shelf_A_big",x:5.8,z:2.16,scale:.72},
  {model:"lamp_standing",x:-4.55,z:-.72,scale:.7},
  {model:"lamp_standing",x:4.55,z:.72,scale:.7},
] as const;

export const premiumPlantProps = [
  {model:"quaternius-houseplant-c",x:-10.5,z:-2.16,height:1.15,rotation:Math.PI/2},
  {model:"quaternius-houseplant-flower",x:-7.5,z:-2.16,height:1.0,rotation:Math.PI/2},
  {model:"quaternius-houseplant-a",x:10.5,z:-2.16,height:1.15,rotation:Math.PI/2},
  {model:"quaternius-houseplant-b",x:-12.7,z:2.16,height:1.1,rotation:Math.PI/2},
  {model:"quaternius-houseplant-c",x:-9.1,z:2.16,height:1.1,rotation:Math.PI/2},
  {model:"quaternius-houseplant-flower",x:11.4,z:2.16,height:1.0,rotation:Math.PI/2},
] as const;
