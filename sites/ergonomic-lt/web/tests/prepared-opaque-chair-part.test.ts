import {test} from 'node:test';
import assert from 'node:assert/strict';
import {opaqueGlbAdmission} from '../scripts/prepared-review-glb-admission';
function fixture(change:(d:any)=>void=()=>{}){
 const d:any={asset:{version:'2.0'},buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:3}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],scenes:[{nodes:[0]}],scene:0};change(d);
 const raw=Buffer.from(JSON.stringify(d)),json=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(json);const b=Buffer.alloc(28+json.length+36);
 b.writeUInt32LE(0x46546c67,0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);b.writeUInt32LE(36,20+json.length);b.writeUInt32LE(0x004e4942,24+json.length);return b;
}
test('opaque original part keeps embedded texture-transform support without inferred recoloring bindings',()=>assert.deepEqual(opaqueGlbAdmission(fixture(d=>d.extensionsRequired=['KHR_texture_transform'])),{selfContainedOriginalPart:true,primitives:1,independentRecoloringAllowed:false}));
test('external images, cyclic nodes and accessors outside BIN are not admitted',()=>{
 assert.throws(()=>opaqueGlbAdmission(fixture(d=>d.images=[{uri:'https://example.invalid/texture.png'}])),/not embedded/);
 assert.throws(()=>opaqueGlbAdmission(fixture(d=>d.nodes[0].children=[0])),/node graph/);
 assert.throws(()=>opaqueGlbAdmission(fixture(d=>d.accessors[0].count=4)),/outside view/);
 assert.throws(()=>opaqueGlbAdmission(fixture(d=>d.extensionsRequired=['KHR_draco_mesh_compression'])),/extension/);
});
