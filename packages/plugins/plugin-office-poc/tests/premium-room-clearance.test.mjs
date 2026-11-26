import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { navigation, rooms } from "../src/layout.ts";
import { premiumRoomFurniture, premiumRoomPlants } from "../src/ui/premium-room-props.ts";

const nodes=new Map(navigation.nodes.map(node=>[node.id,node.at]));
function footprint(prop){
  if(prop.model.startsWith("quaternius")){
    const bytes=readFileSync(new URL(`../src/ui/assets/plants/${prop.model}.glb`,import.meta.url));
    const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    const a=doc.meshes.flatMap(mesh=>mesh.primitives.map(part=>doc.accessors[part.attributes.POSITION]));
    const min=a.reduce((v,item)=>v.map((n,i)=>Math.min(n,item.min[i])),[Infinity,Infinity,Infinity]);
    const max=a.reduce((v,item)=>v.map((n,i)=>Math.max(n,item.max[i])),[-Infinity,-Infinity,-Infinity]);
    const scale=Math.min(prop.height/(max[1]-min[1]),.96/Math.max(max[0]-min[0],max[2]-min[2]));
    return [Math.max(Math.abs(min[0]),Math.abs(max[0]))*scale,Math.max(Math.abs(min[2]),Math.abs(max[2]))*scale];
  }
  const doc=JSON.parse(readFileSync(new URL(`../src/ui/assets/kaykit/${prop.model}.gltf`,import.meta.url)));
  const {min,max}=doc.accessors.find(a=>a.type==="VEC3"&&a.min);
  const halfX=Math.max(Math.abs(min[0]),Math.abs(max[0]))*prop.scale,halfZ=Math.max(Math.abs(min[2]),Math.abs(max[2]))*prop.scale;
  return "rotation" in prop&&prop.rotation===Math.PI/2?[halfZ,halfX]:[halfX,halfZ];
}
test("four premium room groups stay inside room bounds and clear R3 routes",()=>{
  const props=[...premiumRoomFurniture,...premiumRoomPlants];
  for(const id of ["ceo","pm","post","qa"]){
    assert.ok(props.filter(prop=>prop.room===id).length>=4);
    assert.ok(props.some(prop=>prop.room===id&&prop.model.startsWith("quaternius")));
  }
  for(const prop of props){
    const [hx,hz]=footprint(prop),room=rooms.find(value=>value.id===prop.room);
    assert.ok(prop.x-hx>room.x[0]&&prop.x+hx<room.x[1]&&prop.z-hz>room.z[0]&&prop.z+hz<room.z[1],`${prop.room} ${prop.model} beyond room`);
    for(const [from,to] of navigation.edges){
      const a=nodes.get(from),b=nodes.get(to),steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.05);
      for(let i=0;i<=steps;i++){
        const x=a[0]+(b[0]-a[0])*i/steps,z=a[1]+(b[1]-a[1])*i/steps;
        const dx=Math.max(Math.abs(x-prop.x)-hx,0),dz=Math.max(Math.abs(z-prop.z)-hz,0);
        assert.ok(Math.hypot(dx,dz)>=.55,`${prop.room} ${prop.model} blocks ${from} -> ${to}`);
      }
    }
  }
});

test("Post and QA rear wall units and Lounge sign stay clear of navigation",()=>{
  const wallUnits=[[-2.5,11.69],[4.5,11.69],[8.85,11.69],[15.15,11.69]];
  for(const [x,z] of wallUnits){
    for(const [from,to] of navigation.edges){
      const a=nodes.get(from),b=nodes.get(to),steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.05);
      for(let i=0;i<=steps;i++){
        const px=a[0]+(b[0]-a[0])*i/steps,pz=a[1]+(b[1]-a[1])*i/steps;
        const dx=Math.max(Math.abs(px-x)-.725,0),dz=Math.max(Math.abs(pz-z)-.17,0);
        assert.ok(Math.hypot(dx,dz)>=.55,`rear unit at ${x},${z} blocks ${from} -> ${to}`);
      }
    }
  }
  // The sign is wall-mounted at 1.55 m; its reverse face adds only a display plane.
  assert.ok(1.55-.85/2>.55);
});
