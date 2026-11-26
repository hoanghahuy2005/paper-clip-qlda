// Original CC0 test rig generated for the VPD Office PoC. No external asset inputs.
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chunks = [];
const views = [];
let length = 0;
function add(data, target) {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const padding = (4 - bytes.length % 4) % 4;
  const offset = length;
  chunks.push(bytes, Buffer.alloc(padding)); length += bytes.length + padding;
  views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, ...(target ? { target } : {}) });
  return views.length - 1;
}
const positions = add(new Float32Array([-.25,0,-.15,.25,0,-.15,.25,1,-.15,-.25,1,-.15,-.25,0,.15,.25,0,.15,.25,1,.15,-.25,1,.15]), 34962);
const joints = add(new Uint16Array([0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0]), 34962);
const weights = add(new Float32Array(Array.from({length:8}, () => [1,0,0,0]).flat()), 34962);
const indices = add(new Uint16Array([0,1,2,0,2,3,5,4,7,5,7,6,4,0,3,4,3,7,1,5,6,1,6,2,3,2,6,3,6,7,4,5,1,4,1,0]), 34963);
const inverse = add(new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0,1,0,0,-.7,0,1]));
const times = add(new Float32Array([0,.5,1]));
const turns = add(new Float32Array([0,0,0,1,0,.12,0,.993,0,0,0,1]));
const json = {
  asset:{version:"2.0",generator:"VPD Office original CC0 test rig"},scene:0,scenes:[{nodes:[0]}],
  nodes:[{children:[1,2]},{translation:[0,.7,0]},{mesh:0,skin:0}],
  meshes:[{primitives:[{attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2},indices:3,material:0}]}],
  skins:[{inverseBindMatrices:4,joints:[0,1],skeleton:0}],
  materials:[{pbrMetallicRoughness:{baseColorFactor:[.35,.4,.48,1],metallicFactor:0,roughnessFactor:1}}],
  animations:[{name:"idle_test",samplers:[{input:5,output:6,interpolation:"LINEAR"}],channels:[{sampler:0,target:{node:1,path:"rotation"}}]}],
  buffers:[{byteLength:length}],bufferViews:views,
  accessors:[
    {bufferView:positions,componentType:5126,count:8,type:"VEC3",min:[-.25,0,-.15],max:[.25,1,.15]},
    {bufferView:joints,componentType:5123,count:8,type:"VEC4"},
    {bufferView:weights,componentType:5126,count:8,type:"VEC4"},
    {bufferView:indices,componentType:5123,count:36,type:"SCALAR"},
    {bufferView:inverse,componentType:5126,count:2,type:"MAT4"},
    {bufferView:times,componentType:5126,count:3,type:"SCALAR",min:[0],max:[1]},
    {bufferView:turns,componentType:5126,count:3,type:"VEC4"},
  ],
};
const jsonBytes = Buffer.from(JSON.stringify(json));
const padded = Buffer.concat([jsonBytes,Buffer.alloc((4-jsonBytes.length%4)%4,0x20)]);
const bin = Buffer.concat(chunks);
const output = Buffer.alloc(12+8+padded.length+8+bin.length);
output.writeUInt32LE(0x46546c67,0); output.writeUInt32LE(2,4); output.writeUInt32LE(output.length,8);
output.writeUInt32LE(padded.length,12); output.writeUInt32LE(0x4e4f534a,16); padded.copy(output,20);
const at=20+padded.length; output.writeUInt32LE(bin.length,at); output.writeUInt32LE(0x004e4942,at+4); bin.copy(output,at+8);
const dir=path.join(root,"src/ui/assets"); mkdirSync(dir,{recursive:true}); writeFileSync(path.join(dir,"test-rig.glb"),output);
