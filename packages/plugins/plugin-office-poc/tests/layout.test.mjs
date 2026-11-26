import assert from "node:assert/strict";
import test from "node:test";
import { floor, rooms, lounge, corridors, workstations, doors, navigation, pointIn, route, validateLayout } from "../src/layout.ts";

test("R3 source geometry, 12 seeds and seven proposed door anchors validate", () => {
  assert.deepEqual(validateLayout(), []);
  assert.deepEqual(floor, { x:[-17,17], z:[-12,12] });
  assert.deepEqual(rooms.map(r => r.id), ["meeting","creative","ai","ceo","pm","post","qa"]);
  assert.deepEqual(lounge, { x:[-5,5], z:[-2,2] });
  assert.deepEqual(corridors.map(c => c.z), [[-5,-2],[2,5]]);
  assert.deepEqual(workstations.map(w => w.seed), [[-8,9],[-5,-9],[-1.2,-9],[2.6,-9],[6.9,-9],[10,-9],[13.1,-9],[16,-9],[-3,9],[1,9],[5,9],[12,9]]);
  assert.equal(workstations.length,12);
  assert.equal(doors.length,7);
  assert.ok(doors.every(d => pointIn(d.inside,rooms.find(r => r.id === d.room))));
  assert.ok(doors.every(d => !pointIn(d.outside,rooms.find(r => r.id === d.room))));
});

test("all desk routes reach meeting, CEO tray and lounge through room doors", () => {
  for (const desk of workstations) for (const destination of ["target:meeting","target:ceo-tray","target:lounge"]) {
    const path = route(`desk:${desk.id}`, destination);
    assert.ok(path, `${desk.id} to ${destination}`);
    if (desk.room !== "meeting") {
      const door = doors.find(d => d.room === desk.room);
      assert.ok(path.some(([x,z]) => x === door.inside[0] && z === door.inside[1]), `${desk.id} must use door`);
    }
  }
  const nodes = new Map(navigation.nodes.map(n => [n.id,n]));
  for (const [a,b] of navigation.edges) {
    const p = nodes.get(a).at, q = nodes.get(b).at;
    // Each edge must lie in a single room, a corridor/side connector, or cross exactly one paired door.
    const mid = [(p[0]+q[0])/2,(p[1]+q[1])/2];
    const interiors = rooms.filter(r => pointIn(mid,r,0.01));
    assert.ok(interiors.length <= 1, `${a}–${b} overlaps rooms`);
    if (interiors.length && (a.includes("outside") || b.includes("outside"))) {
      assert.ok(a.startsWith("D") && b.startsWith("D") && a.slice(0,3) === b.slice(0,3), `${a}–${b} crosses wall without door`);
    }
  }
});

test("positive-Z workstation exits avoid their desk tops in 2D",()=>{
  for(const desk of workstations.filter(w=>w.seed[1]>0)){
    const path=route(`desk:${desk.id}`,"target:meeting");
    for(let i=1;i<path.length;i++)for(let t=0;t<=20;t++){
      const x=path[i-1][0]+(path[i][0]-path[i-1][0])*t/20;
      const z=path[i-1][1]+(path[i][1]-path[i-1][1])*t/20;
      assert.ok(!(x>desk.seed[0]-.75&&x<desk.seed[0]+.75&&z>desk.seed[1]-1.195&&z<desk.seed[1]-.445),`${desk.id}: path hits desk`);
    }
  }
});
