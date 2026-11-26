import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import * as THREE from 'three';
import {vinishModels,vinishClips,compactYanBriefcase} from '../src/ui/vinish-rig.ts';

test('Yan briefcase geometry is tucked toward the hand without deleting it',()=>{
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.88,0,0,-.6,0,0],3));geometry.setIndex([0,1]);geometry.addGroup(0,2,0);
 const material=new THREE.MeshStandardMaterial();material.name='Bag_Black';const root=new THREE.Group();const mesh=new THREE.SkinnedMesh(geometry,[material]);root.add(mesh);
 assert.equal(compactYanBriefcase(root),2);
 assert.ok(mesh.geometry.getAttribute('position').getX(0)*.78>-.55);
 assert.equal(mesh.geometry.getAttribute('position').count,2);
});

test('Yan bind pose fits the moving clearance after briefcase tuck',()=>{
 const bytes=readFileSync(new URL('../src/ui/assets/vinish/businessman-with-briefcase.glb',import.meta.url));
 const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 for(const primitive of doc.meshes[0].primitives){
  const bounds=doc.accessors[primitive.attributes.POSITION],name=doc.materials[primitive.material].name;
  const xs=[bounds.min[0],bounds.max[0]].map(x=>/^(Bag_Black|Gold)$/.test(name)?x*.7-.08:x);
  const radius=Math.max(...xs.map(Math.abs),Math.abs(bounds.min[2]),Math.abs(bounds.max[2]))*.78;
  assert.ok(radius<.55,`${name} bind radius ${radius.toFixed(3)} m`);
 }
});

test('12 Vinish rigs load and retain the nine Office animation states',async()=>{
 for(const name of vinishModels){
  const bytes=readFileSync(new URL(`../src/ui/assets/vinish/${name}.glb`,import.meta.url));
  const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.equal(doc.skins[0].joints.length,17,name);
  const root=new THREE.Group();for(const joint of doc.skins[0].joints){const bone=new THREE.Bone();bone.name=doc.nodes[joint].name;root.add(bone);}
  const source=['Idle','Walk'].map(clipName=>new THREE.AnimationClip(clipName,1,[new THREE.QuaternionKeyframeTrack('Head.quaternion',[0,1],[0,0,0,1,0,0,0,1])]));
  const clips=vinishClips(root,source);
  assert.equal(clips.size,14,name);
  for(const state of ['sit_idle','typing','talk','social_talk','give_document','nod','error_reaction','rest','look_around','drink_coffee','sit_down','stand_up']) {
   const clip=clips.get(state), head=clip.tracks.find(track=>track.name==='Head.quaternion');
   assert.ok(clip && head,`${name} ${state}`);
   assert.ok(clip.tracks.some(track=>JSON.stringify(Array.from(track.values.slice(0,4)))!==JSON.stringify(Array.from(track.values.slice(4,8)))),`${name} ${state} must move`);
  }
  assert.ok(doc.meshes.length>0,name);
  const mixer=new THREE.AnimationMixer(root);
  for(const clip of clips.values()){
   mixer.stopAllAction();const action=mixer.clipAction(clip).reset().play();mixer.update(.12);
   assert.ok(action.isRunning(),`${name} ${clip.name}`);
  }
 }
});
