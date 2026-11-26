import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { styleAvatar } from "../src/ui/avatar.ts";
import { workstations } from "../src/layout.ts";

test("original test GLB contains skin and playable clip data", () => {
  const bytes = readFileSync(new URL("../src/ui/assets/test-rig.glb", import.meta.url));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  const document = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  assert.equal(document.skins[0].joints.length, 2);
  assert.equal(document.animations[0].name, "idle_test");
  assert.equal(document.animations[0].channels[0].target.path, "rotation");
  assert.equal(document.accessors[6].count, 3);
});

test("Office base GLB shares one rig and nine clips across 12 independent clones",async()=>{
  const bytes=readFileSync(new URL("../src/ui/assets/office-base-rig.glb",import.meta.url));
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(buffer,"",resolve,reject));
  const names=gltf.animations.map(c=>c.name);
  for(const clip of ["idle_stand","walk","typing","sit_idle","talk","give_document","nod","error_reaction","rest"])assert.ok(names.includes(clip),clip);
  const clones=Array.from({length:12},()=>cloneSkeleton(gltf.scene));
  assert.equal(clones.length,12);
  const skinned=clones.map(root=>root.getObjectByProperty("type","SkinnedMesh"));
  assert.ok(skinned.every(Boolean));
  assert.equal(new Set(skinned.map(mesh=>mesh.skeleton)).size,12);
  const mixer=new THREE.AnimationMixer(clones[0]);const action=mixer.clipAction(gltf.animations.find(c=>c.name==="walk"));action.play();mixer.update(.2);
  assert.equal(action.isRunning(),true);assert.ok(action.time>0);
});

test("Three GLTFLoader parses rig and AnimationMixer advances its clip", async () => {
  const bytes = readFileSync(new URL("../src/ui/assets/test-rig.glb", import.meta.url));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(buffer, "", resolve, reject));
  assert.equal(gltf.animations.length, 1);
  let skinned = false;
  gltf.scene.traverse(node => { if (node.isSkinnedMesh) skinned = true; });
  assert.equal(skinned, true);
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const action = mixer.clipAction(gltf.animations[0]);
  action.play();
  mixer.update(0.2);
  assert.equal(action.isRunning(), true);
  assert.ok(action.time > 0);
});

test("all 12 styled avatars keep sampled poses inside the route and lounge clearances", async () => {
  const bytes = readFileSync(new URL("../src/ui/assets/office-base-rig.glb", import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "",
  );
  const vertex = new THREE.Vector3();
  workstations.forEach((station, index) => {
    const root = cloneSkeleton(gltf.scene);
    const styled = styleAvatar(root, station.color, index, station.id);
    const mixer = new THREE.AnimationMixer(root);
    for (const name of ["idle_stand", "sit_idle", "typing", "walk", "give_document", "rest", "talk", "nod", "error_reaction"]) {
      const clip = gltf.animations.find(candidate => candidate.name === name);
      mixer.stopAllAction();
      mixer.clipAction(clip).play();
      if (styled.cup) styled.cup.visible = name === "rest";
      let radius = 0;
      for (let sample = 0; sample <= 24; sample++) {
        mixer.setTime(clip.duration * sample / 24);
        root.updateMatrixWorld(true);
        root.traverseVisible(mesh => {
          if (!mesh.isMesh) return;
          for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
            mesh.getVertexPosition(i, vertex).applyMatrix4(mesh.matrixWorld);
            radius = Math.max(radius, Math.hypot(vertex.x, vertex.z));
          }
        });
      }
      // Seated clips remain parked at their target; walking clips must fit the narrower route clearance.
      const limit = ["rest", "sit_idle", "typing"].includes(name) ? .68 : .55;
      assert.ok(radius <= limit, `${station.id} clip ${name} exceeds ${limit} m: ${radius.toFixed(3)}`);
    }
    styled.geometry.forEach(geometry => geometry.dispose());
    styled.materials.forEach(material => material.dispose());
  });
});

test("all 12 avatars keep accessories inside clearance during clip crossfades", async () => {
  const bytes = readFileSync(new URL("../src/ui/assets/office-base-rig.glb", import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "",
  );
  const vertex = new THREE.Vector3();
  const clipNames = ["idle_stand", "walk", "typing", "sit_idle", "talk", "give_document", "nod", "error_reaction", "rest"];
  const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
  let inspected = 0;
  workstations.forEach((station, index) => {
    const root = cloneSkeleton(gltf.scene);
    const styled = styleAvatar(root, station.color, index, station.id);
    const mixer = new THREE.AnimationMixer(root);
    for (const fromName of clipNames) for (const toName of clipNames) {
      if (fromName === toName) continue;
      mixer.stopAllAction();
      const from = mixer.clipAction(clips.get(fromName));
      const to = mixer.clipAction(clips.get(toName));
      from.reset().play();
      mixer.setTime(clips.get(fromName).duration * .37);
      to.reset().play();
      from.crossFadeTo(to, .3, false);
      if (styled.cup) styled.cup.visible = fromName === "rest" || toName === "rest";
      for (let step = 0; step <= 6; step++) {
        if (step) mixer.update(.05);
        root.updateMatrixWorld(true);
        let radius = 0;
        root.traverseVisible(mesh => {
          if (!mesh.isMesh) return;
          for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
            mesh.getVertexPosition(i, vertex).applyMatrix4(mesh.matrixWorld);
            radius = Math.max(radius, Math.hypot(vertex.x, vertex.z));
          }
        });
        assert.ok(radius <= .68, `${station.id}: ${fromName} -> ${toName} at ${step * 50}ms: ${radius.toFixed(3)}m`);
        inspected++;
      }
    }
    styled.geometry.forEach(geometry => geometry.dispose());
    styled.materials.forEach(material => material.dispose());
  });
  assert.equal(inspected, 12 * 9 * 8 * 7);
});

test("facial markers sit outside the head shell on the anatomical front", async () => {
  const bytes = readFileSync(new URL("../src/ui/assets/office-base-rig.glb", import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
  const root=cloneSkeleton(gltf.scene);
  const styled=styleAvatar(root,"#75B6AA",11,"qa_reviewer");
  const head=root.getObjectByName("head");
  const detailMesh=head.children.find(child=>child.isMesh && child.geometry.getAttribute("color"));
  assert.ok(detailMesh);
  const colors=detailMesh.geometry.getAttribute("color"),positions=detailMesh.geometry.getAttribute("position");
  const eye=new THREE.Color("#332D32");
  let eyeVertices=0;
  root.rotation.y=Math.PI;root.updateMatrixWorld(true);
  const headCenter=head.getWorldPosition(new THREE.Vector3());
  const point=new THREE.Vector3();
  for(let i=0;i<colors.count;i++){
    if(Math.abs(colors.getX(i)-eye.r)>.001 || Math.abs(colors.getY(i)-eye.g)>.001 || Math.abs(colors.getZ(i)-eye.b)>.001)continue;
    eyeVertices++;
    assert.ok(positions.getZ(i)>.33,"eye must project beyond local +Z head surface");
    point.fromBufferAttribute(positions,i).applyMatrix4(detailMesh.matrixWorld);
    assert.ok(point.z<headCenter.z-.25,"seated agent faces the desk at negative world Z");
  }
  assert.ok(eyeVertices>0);
  styled.geometry.forEach(geometry=>geometry.dispose());styled.materials.forEach(material=>material.dispose());
});

test("all 12 faces follow body forward in standing, walking, working and meeting poses", async () => {
  const bytes=readFileSync(new URL("../src/ui/assets/office-base-rig.glb",import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
  const eye=new THREE.Color("#332D32"),point=new THREE.Vector3(),center=new THREE.Vector3();
  const headForward=new THREE.Vector3(),bodyForward=new THREE.Vector3();
  let checked=0;
  for(const [index,station] of workstations.entries()){
    const root=cloneSkeleton(gltf.scene),styled=styleAvatar(root,station.color,index,station.id);
    const head=root.getObjectByName("head"),mesh=head.children.find(child=>child.isMesh && child.geometry.getAttribute("color"));
    assert.ok(mesh,station.id);
    const colors=mesh.geometry.getAttribute("color"),positions=mesh.geometry.getAttribute("position");
    const mixer=new THREE.AnimationMixer(root);
    for(const state of ["idle_stand","walk","typing","talk"]){
      mixer.stopAllAction();
      const clip=gltf.animations.find(candidate=>candidate.name===state);
      mixer.clipAction(clip).reset().play();
      if(state==="talk")mixer.clipAction(gltf.animations.find(candidate=>candidate.name==="sit_idle")).reset().play();
      for(let sample=0;sample<7;sample++){
        mixer.setTime(clip.duration*sample/6);
        root.rotation.y=state==="walk" ? [0,Math.PI/2,Math.PI,-Math.PI/2][sample%4] : station.seed[1]>0?Math.PI:0;
        root.updateMatrixWorld(true);
        head.getWorldPosition(center);
        headForward.set(0,0,1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
        bodyForward.set(0,0,1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
        assert.ok(headForward.dot(bodyForward)>.8,`${station.id} ${state} head rotated behind torso`);
        let eyes=0;
        for(let i=0;i<colors.count;i++){
          if(Math.abs(colors.getX(i)-eye.r)>.001||Math.abs(colors.getY(i)-eye.g)>.001||Math.abs(colors.getZ(i)-eye.b)>.001)continue;
          point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).sub(center);
          assert.ok(point.dot(headForward)>.25,`${station.id} ${state} eye is behind head`);
          eyes++;
        }
        assert.ok(eyes>0);
        checked++;
      }
    }
    styled.geometry.forEach(geometry=>geometry.dispose());styled.materials.forEach(material=>material.dispose());
  }
  assert.equal(checked,12*4*7);
});
