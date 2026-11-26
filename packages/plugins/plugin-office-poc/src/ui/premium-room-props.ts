// Display-only placements along the rear and outer edges of the four positive-Z rooms.
export const premiumRoomFurniture = [
  {room:"ceo",model:"cabinet_medium_decorated",x:-16.15,z:8.5,scale:.9,rotation:Math.PI/2},
  {room:"ceo",model:"shelf_B_large_decorated",x:-11.85,z:9.9,scale:.64},
  {room:"ceo",model:"lamp_standing",x:-16.05,z:6.45,scale:.63},
  {room:"pm",model:"cabinet_medium_decorated",x:-10.15,z:8.5,scale:.85,rotation:Math.PI/2},
  {room:"pm",model:"shelf_B_large_decorated",x:-5.85,z:9.9,scale:.64},
  {room:"pm",model:"lamp_standing",x:-10.2,z:6.45,scale:.63},
  {room:"post",model:"cabinet_medium_decorated",x:-4.15,z:9,scale:.9,rotation:Math.PI/2},
  {room:"post",model:"cabinet_medium_decorated",x:-4.15,z:6.35,scale:.95,rotation:Math.PI/2},
  {room:"post",model:"shelf_B_large_decorated",x:6.1,z:11.15,scale:.7},
  {room:"post",model:"lamp_standing",x:4,z:10.5,scale:.63},
  {room:"qa",model:"cabinet_medium_decorated",x:8.05,z:8.5,scale:.9,rotation:Math.PI/2},
  {room:"qa",model:"cabinet_medium_decorated",x:10,z:7,scale:1.05},
  {room:"qa",model:"shelf_B_large_decorated",x:16.05,z:9.9,scale:.7},
  {room:"qa",model:"lamp_standing",x:16.05,z:6.45,scale:.63},
] as const;

export const premiumRoomPlants = [
  {room:"ceo",model:"quaternius-houseplant-c",x:-11.8,z:7.55,height:1.5},
  {room:"pm",model:"quaternius-houseplant-a",x:-5.8,z:7.55,height:1.4},
  {room:"post",model:"quaternius-houseplant-b",x:3.5,z:7.8,height:1.5,pedestal:true},
  {room:"qa",model:"quaternius-houseplant-c",x:16.05,z:7.55,height:1.45,pedestal:true},
] as const;
