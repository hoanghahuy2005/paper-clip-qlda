// Original CC0 humanoid GLB for the Office MVP. Geometry and clips are generated here; no external asset inputs.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chunks = [], views = [], accessors = [];
let length = 0;
function view(data, target) {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const offset = length, pad = (4 - bytes.length % 4) % 4;
  chunks.push(bytes, Buffer.alloc(pad)); length += bytes.length + pad;
  views.push({ buffer:0, byteOffset:offset, byteLength:bytes.length, ...(target ? { target } : {}) });
  return views.length-1;
}
function accessor(data, type, componentType=5126, target, min, max) {
  const i = view(data,target);
  accessors.push({ bufferView:i, componentType, count:data.length/({SCALAR:1,VEC3:3,VEC4:4,MAT4:16}[type]), type, ...(min ? {min,max} : {}) });
  return accessors.length-1;
}
const parts = [
  // center xyz, half extents, joint index: pelvis, torso, head, arms, legs.
  [0,.76,0,.23,.20,.15,1,2], [0,1.19,0,.29,.39,.18,2,0],
  [0,1.70,0,.24,.25,.22,3,1],
  [-.39,1.24,0,.105,.29,.12,4,0], [.39,1.24,0,.105,.29,.12,7,0],
  [-.39,.93,0,.091,.082,.10,4,1], [.39,.93,0,.091,.082,.10,7,1],
  [-.14,.40,0,.12,.37,.13,5,2], [.14,.40,0,.12,.37,.13,6,2],
  [-.14,.06,.045,.124,.065,.176,5,3], [.14,.06,.045,.124,.065,.176,6,3],
];
const vertices=[], normals=[], joints=[], weights=[], indices=[[],[],[],[]];
const faces = [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
for (const [cx,cy,cz,hx,hy,hz,joint,material] of parts) {
  const corners = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  for (const face of faces) {
    const a=corners[face[0]], b=corners[face[1]], c=corners[face[2]];
    const ux=(b[0]-a[0])*hx, uy=(b[1]-a[1])*hy, uz=(b[2]-a[2])*hz;
    const vx=(c[0]-a[0])*hx, vy=(c[1]-a[1])*hy, vz=(c[2]-a[2])*hz;
    const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx, mag=Math.hypot(nx,ny,nz)||1;
    const start=vertices.length/3;
    for (const index of face) {
      const [x,y,z]=corners[index]; vertices.push(cx+x*hx,cy+y*hy,cz+z*hz);
      normals.push(nx/mag,ny/mag,nz/mag); joints.push(joint,0,0,0); weights.push(1,0,0,0);
    }
    indices[material].push(start,start+1,start+2,start,start+2,start+3);
  }
}
const positions=accessor(new Float32Array(vertices),"VEC3",5126,34962,[-.50,-.01,-.23],[.50,1.95,.23]);
const normal=accessor(new Float32Array(normals),"VEC3",5126,34962);
const joint=accessor(new Uint16Array(joints),"VEC4",5123,34962);
const weight=accessor(new Float32Array(weights),"VEC4",5126,34962);
const primitives=indices.map((values,material)=>({
  attributes:{POSITION:positions,NORMAL:normal,JOINTS_0:joint,WEIGHTS_0:weight},
  indices:accessor(new Uint16Array(values),"SCALAR",5123,34963),material,
}));
const world = [[0,0,0],[0,.75,0],[0,1.2,0],[0,1.68,0],[-.39,1.45,0],[-.14,.70,0],[.14,.70,0],[.39,1.45,0]];
const inverses = world.flatMap(([x,y,z]) => [1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1]);
const inverse=accessor(new Float32Array(inverses),"MAT4");
const nodes = [
  {name:"root",children:[1,8]},
  {name:"pelvis",translation:[0,.75,0],children:[2,5,6]},
  {name:"torso",translation:[0,.45,0],children:[3,4,7]},
  {name:"head",translation:[0,.48,0]},
  {name:"left_arm",translation:[-.39,.25,0]},
  {name:"left_leg",translation:[-.14,-.05,0]},
  {name:"right_leg",translation:[.14,-.05,0]},
  {name:"right_arm",translation:[.39,.25,0]},
  {name:"body_mesh",mesh:0,skin:0},
];
const animations=[];
const q=(axis,angle) => { const s=Math.sin(angle/2); return [axis[0]*s,axis[1]*s,axis[2]*s,Math.cos(angle/2)]; };
function clip(name, tracks) {
  const input=accessor(new Float32Array([0,.5,1]),"SCALAR",5126,undefined,[0],[1]);
  const samplers=[],channels=[];
  for (const [jointIndex,axis,angles] of tracks) {
    const output=accessor(new Float32Array(angles.flatMap(a=>q(axis,a))),"VEC4");
    channels.push({sampler:samplers.length,target:{node:jointIndex,path:"rotation"}});
    samplers.push({input,output,interpolation:"LINEAR"});
  }
  animations.push({name,samplers,channels});
}
clip("idle_stand",[[3,[0,1,0],[0,.08,0]]]);
clip("walk",[[5,[1,0,0],[-.35,.35,-.35]],[6,[1,0,0],[.35,-.35,.35]],[4,[1,0,0],[.25,-.25,.25]],[7,[1,0,0],[-.25,.25,-.25]]]);
clip("typing",[[4,[1,0,0],[-.58,-.42,-.58]],[7,[1,0,0],[-.42,-.58,-.42]],[5,[1,0,0],[-1.05,-1.05,-1.05]],[6,[1,0,0],[-1.05,-1.05,-1.05]]]);
clip("sit_idle",[[5,[1,0,0],[-1.05,-1.05,-1.05]],[6,[1,0,0],[-1.05,-1.05,-1.05]]]);
clip("talk",[[4,[0,0,1],[0,.3,0]],[3,[0,1,0],[0,.1,0]]]);
clip("give_document",[[7,[1,0,0],[0,-.58,0]]]);
clip("nod",[[3,[1,0,0],[0,.2,0]]]);
clip("error_reaction",[[3,[1,0,0],[0,.35,.35]],[4,[0,0,1],[0,-.2,-.2]]]);
clip("rest",[[3,[1,0,0],[0,-.13,0]],[7,[1,0,0],[-.2,-1.95,-.2]]]);
const json={asset:{version:"2.0",generator:"VPD Office original CC0 humanoid rig"},scene:0,scenes:[{nodes:[0]}],nodes,
  meshes:[{name:"shared_body",primitives}],
  skins:[{inverseBindMatrices:inverse,joints:[0,1,2,3,4,5,6,7],skeleton:0}],
  materials:[["outfit_base",[.32,.38,.49,1]],["skin",[.74,.46,.28,1]],
    ["trousers",[.11,.14,.18,1]],["shoes",[.05,.06,.07,1]]].map(([name,baseColorFactor])=>({
      name,pbrMetallicRoughness:{baseColorFactor,metallicFactor:0,roughnessFactor:1},
    })),
  animations,buffers:[{byteLength:length}],bufferViews:views,accessors};
const jsonBytes=Buffer.from(JSON.stringify(json));
const padded=Buffer.concat([jsonBytes,Buffer.alloc((4-jsonBytes.length%4)%4,0x20)]);
const bin=Buffer.concat(chunks);
const output=Buffer.alloc(12+8+padded.length+8+bin.length);
output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);
output.writeUInt32LE(padded.length,12);output.writeUInt32LE(0x4e4f534a,16);padded.copy(output,20);
const at=20+padded.length;output.writeUInt32LE(bin.length,at);output.writeUInt32LE(0x004e4942,at+4);bin.copy(output,at+8);
writeFileSync(path.join(root,"src/ui/assets/office-base-rig.glb"),output);
