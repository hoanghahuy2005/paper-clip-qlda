import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { edgeFurniture } from "../dist/ui/fixtures.js";
import { navigation } from "../dist/layout.js";
import { corridorEdgeDoors, premiumEdgeProps, premiumPlantProps } from "../src/ui/corridor-lounge.ts";

test("new Lounge and corridor edge furniture leaves R3 waypoints and routes clear", () => {
  const nodes=new Map(navigation.nodes.map(node=>[node.id,node.at]));
  let samples=0;
  for(const prop of edgeFurniture){
    const gltf=JSON.parse(readFileSync(new URL(`../src/ui/assets/kaykit/${prop.model}.gltf`,import.meta.url)));
    const {min,max}=gltf.accessors[0];
    const halfX=Math.max(Math.abs(min[0]),Math.abs(max[0]))*prop.scale;
    const halfZ=Math.max(Math.abs(min[2]),Math.abs(max[2]))*prop.scale;
    for(const [from,to] of navigation.edges){
      const a=nodes.get(from),b=nodes.get(to);
      const steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.05);
      for(let step=0;step<=steps;step++){
        const x=a[0]+(b[0]-a[0])*step/steps,z=a[1]+(b[1]-a[1])*step/steps;
        const dx=Math.max(Math.abs(x-prop.x)-halfX,0),dz=Math.max(Math.abs(z-prop.z)-halfZ,0);
        assert.ok(Math.hypot(dx,dz)>=.55,`${prop.model} at ${prop.x},${prop.z} blocks ${from} → ${to}`);
        samples++;
      }
    }
  }
  assert.ok(samples>1000);
});

test("two render-only exterior corridor doors stay outside R3 navigation clearance",()=>{
  assert.deepEqual(corridorEdgeDoors.map(door=>door.x),[-17,17]);
  const nodes=new Map(navigation.nodes.map(node=>[node.id,node.at]));
  for(const door of corridorEdgeDoors){
    assert.equal(door.width,1.5);
    for(const [from,to] of navigation.edges){
      const a=nodes.get(from),b=nodes.get(to),steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.05);
      for(let i=0;i<=steps;i++){
        const x=a[0]+(b[0]-a[0])*i/steps,z=a[1]+(b[1]-a[1])*i/steps;
        // Includes the glass wings on both sides of the door, not just its leaf.
        const dx=Math.max(Math.abs(x-door.x)-.11,0),dz=Math.max(Math.abs(z)-5,0);
        assert.ok(Math.hypot(dx,dz)>=.55,`${door.id} exterior glass blocks ${from} → ${to}`);
      }
    }
  }
});

test("premium corridor and Lounge props clear every R3 route by at least 0.55 m", () => {
  const nodes=new Map(navigation.nodes.map(node=>[node.id,node.at]));
  let checked=0;const blocked=new Set();
  for(const prop of [...premiumEdgeProps,...premiumPlantProps]){
    let halfX,halfZ;
    if(prop.model.startsWith("quaternius")){
      const bytes=readFileSync(new URL(`../src/ui/assets/plants/${prop.model}.glb`,import.meta.url));
      const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
      const positions=doc.meshes.flatMap(mesh=>mesh.primitives.map(part=>doc.accessors[part.attributes.POSITION]));
      const min=positions.reduce((a,b)=>a.map((v,i)=>Math.min(v,b.min[i])),[Infinity,Infinity,Infinity]);
      const max=positions.reduce((a,b)=>a.map((v,i)=>Math.max(v,b.max[i])),[-Infinity,-Infinity,-Infinity]);
      const scale=Math.min(prop.height/(max[1]-min[1]),.95/Math.max(max[0]-min[0],max[2]-min[2]));
      halfX=Math.max(Math.abs(min[0]),Math.abs(max[0]))*scale;
      halfZ=Math.max(Math.abs(min[2]),Math.abs(max[2]))*scale;
      if(prop.rotation===Math.PI/2)[halfX,halfZ]=[halfZ,halfX];
    }else{
      const doc=JSON.parse(readFileSync(new URL(`../src/ui/assets/kaykit/${prop.model}.gltf`,import.meta.url)));
      const {min,max}=doc.accessors[0];halfX=Math.max(Math.abs(min[0]),Math.abs(max[0]))*prop.scale;
      halfZ=Math.max(Math.abs(min[2]),Math.abs(max[2]))*prop.scale;
    }
    for(const [from,to] of navigation.edges){
      const a=nodes.get(from),b=nodes.get(to),steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.05);
      for(let step=0;step<=steps;step++){
        const x=a[0]+(b[0]-a[0])*step/steps,z=a[1]+(b[1]-a[1])*step/steps;
        const dx=Math.max(Math.abs(x-prop.x)-halfX,0),dz=Math.max(Math.abs(z-prop.z)-halfZ,0);
        if(Math.hypot(dx,dz)<.55)blocked.add(`${prop.model} at ${prop.x},${prop.z} blocks ${from} → ${to}`);
        checked++;
      }
    }
  }
  assert.ok(checked>1000);
  assert.deepEqual([...blocked],[]);
});
