import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { Box3, Ray, Vector3 } from "three";
import { buildSync } from "esbuild";
import { fileURLToPath } from "node:url";

function bundled(src) {
  const output = buildSync({
    entryPoints: [fileURLToPath(new URL(src, import.meta.url))],
    bundle: true, write: false, platform: "node", format: "esm",
  }).outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}
const { route, reverseTraversedRoute, workstations, loungeSlots, loungeActivities, rooms } = await bundled("../src/layout.ts");
const { officeBoxes, plantLocations } = await bundled("../src/ui/fixtures.ts");
const { createRouteTraffic } = await bundled("../src/ui/route-traffic.ts");

test("all 12 rigs have swept clearance to lounge, CEO and meeting using rendered geometry", () => {
  const radius = .55;
  const boxes = [
    ...officeBoxes(),
    ...plantLocations.map(([x,z]) => [x,.9,z,.76,.8,.76,"","plant"]),
  ].filter(([,y]) => y > .05).map(([x,y,z,w,h,d,,name]) => ({
    name: name ?? `${x},${y},${z}`,
    box: new Box3(new Vector3(x-w/2-radius,y-h/2,z-d/2-radius),
      new Vector3(x+w/2+radius,y+h/2,z+d/2+radius)),
  }));
  for (const station of workstations) {
    for (const target of [`rest:${station.id}`, "target:ceo-tray", "target:meeting", "meeting:seat:0", "meeting:seat:1", "meeting:seat:2"]) {
      const path = route(`desk:${station.id}`, target);
      assert.ok(path);
      for (let i=1;i<path.length;i++) {
        const [x,z] = path[i-1], [u,v] = path[i];
        for (const {box,name} of boxes) {
          const direction = new Vector3(u-x,0,v-z);
          if (direction.length() === 0) continue;
          const origin = new Vector3(x,box.getCenter(new Vector3()).y,z);
          const hit = new Ray(origin,direction.clone().normalize()).intersectBox(box,new Vector3());
          assert.ok(!box.containsPoint(origin) && (!hit || origin.distanceTo(hit) > direction.length()),
            `${station.id} → ${target}: ${x},${z} → ${u},${v} hits ${name}`);
        }
      }
    }
  }
  for (const slot of loungeSlots) for (const other of loungeSlots) {
    if (slot !== other) assert.ok(Math.hypot(slot.at[0]-other.at[0],slot.at[1]-other.at[1]) > radius*2);
  }
});

test("crossing and opposing routes wait while disjoint routes can move concurrently", () => {
  const traffic = createRouteTraffic();
  assert.equal(traffic.reserve("a", [[0,0],[10,0]]), true);
  assert.equal(traffic.reserve("b", [[5,-4],[5,4]]), false);
  assert.equal(traffic.reserve("c", [[10,0],[0,0]]), false);
  assert.equal(traffic.reserve("d", [[0,3],[10,3]]), true);
  traffic.release("a");
  assert.equal(traffic.reserve("c", [[10,0],[0,0]]), true);
});

test("a parked meeting attendee frees the doorway but reserves its seat", () => {
  const traffic = createRouteTraffic();
  assert.equal(traffic.reserve("first", [[0,0],[0,3]]), true);
  assert.equal(traffic.reserve("second", [[0,0],[2,0],[2,3]]), false);
  assert.equal(traffic.occupy("first", [[0,3]]), true);
  assert.equal(traffic.reserve("second", [[0,0],[2,0],[2,3]]), true);
  assert.equal(traffic.reserve("third", [[-2,3],[0,3]]), false);
  assert.equal(traffic.occupy("first", [[0,3],[0,0]]), false);
  traffic.release("second");
  assert.equal(traffic.occupy("first", [[0,3],[0,0]]), true);
});

test("12 lounge routes and all handoff approaches avoid other parked agents", () => {
  for (const sender of workstations) {
    const targets = [`rest:${sender.id}`, ...workstations
      .filter(receiver => receiver !== sender).map(receiver => `lane:${receiver.id}:rear`)];
    const parked = [...workstations.filter(w => w !== sender).map(w => w.seed),
      ...loungeSlots.filter(slot => slot.deskId !== sender.id).map(slot => slot.at)];
    for (const target of targets) {
      const path = route(`desk:${sender.id}`, target);
      const traffic = createRouteTraffic();
      assert.equal(traffic.reserve("moving", path), true);
      for (const point of parked) {
        assert.equal(traffic.reserve("parked", [point]), true, `${sender.id} to ${target} near ${point}`);
        traffic.release("parked");
      }
    }
  }
});

test("interrupting any lounge journey backtracks along the graph from the current edge", () => {
  for (const station of workstations) {
    const path = route(`desk:${station.id}`, `rest:${station.id}`);
    for (let next = 1; next <= path.length; next++) {
      const back = reverseTraversedRoute(path, next);
      assert.equal(back[0], path[next-1]);
      assert.equal(back.at(-1), path[0]);
      for (let i = 1; i < back.length; i++) assert.equal(back[i], path[next-i-1]);
    }
  }
});

test("cosmetic roam stays in corridor/Lounge and can return through the home slot",()=>{
 for(const [index,slot] of loungeSlots.entries()){
  const spine=`${index<6?'n':'p'}:${slot.at[0]}`;
  const outbound=route(slot.id,spine),back=route(spine,slot.id),desk=route(spine,`desk:${slot.deskId}`);
  assert.ok(outbound?.length>1&&back?.length>1&&desk?.length>1,slot.id);
  for(const path of [outbound,back])for(let i=1;i<path.length;i++){
   const [x,z]=path[i-1],[u,v]=path[i];
   for(let step=0;step<=10;step++){
    const p=[x+(u-x)*step/10,z+(v-z)*step/10];
    assert.ok(!rooms.some(r=>p[0]>r.x[0]&&p[0]<r.x[1]&&p[1]>r.z[0]&&p[1]<r.z[1]),`${slot.id} enters a room`);
   }
  }
  assert.deepEqual(desk.at(-1),workstations[index].seed);
 }
});

test("real KayKit sofa and coffee anchors have a clear front approach and exclusive slots",()=>{
 const asset=name=>JSON.parse(readFileSync(new URL(`../src/ui/assets/kaykit/${name}.gltf`,import.meta.url)));
 const couch=asset('couch_pillows').accessors[0],cabinet=asset('cabinet_medium_decorated').accessors[0];
 assert.equal(loungeActivities.length,3);
 for(const activity of loungeActivities){
  const approach=route(activity.from,activity.id),back=route(activity.id,`desk:${workstations.find(w=>`rest:${w.id}`===activity.from).id}`);
  assert.ok(approach?.length===2&&back?.length>2,activity.id);
  assert.ok(!rooms.some(r=>activity.at[0]>r.x[0]&&activity.at[0]<r.x[1]&&activity.at[1]>r.z[0]&&activity.at[1]<r.z[1]));
  if(activity.kind==='sofa'){
   const center=activity.id.endsWith('left')?-2.3:2.3,front=activity.id.endsWith('left')?1:-1;
   assert.ok(Math.abs(activity.at[0]-center)<.2);
   assert.ok(activity.at[1]*front>0);
   const frontEdge=front>0?couch.max[2]*.76:-couch.min[2]*.76;
   assert.ok(Math.abs(approach[0][1])-frontEdge>.55,'walk stops before KayKit cushion; sit transition enters seat');
  }else{
   assert.equal(activity.at[0],4.2);
   assert.ok(Math.abs(activity.at[1])-(cabinet.max[2]*.68)>.55,'coffee cabinet clearance');
  }
  const traffic=createRouteTraffic();
  assert.ok(traffic.reserve('first',approach));
  assert.equal(traffic.reserve('second',approach),false,activity.id);
  traffic.release('first');assert.ok(traffic.reserve('second',approach));
 }
});
