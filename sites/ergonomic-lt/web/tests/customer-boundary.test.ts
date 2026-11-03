import test from 'node:test';
import assert from 'node:assert/strict';
import {customerCapabilities} from '../src/lib/customer-capability';
import {customerGlb} from '../src/lib/customer-glb';
import {customerLabel} from '../src/lib/customer-names';
import {customerControlIds,resolveCustomerChange} from '../src/lib/customer-configuration';
const cap=customerCapabilities('a-private-test-key-with-more-than-thirty-two-characters');
test('Customer state is encrypted, purpose-bound, tamper-evident and reconstructs every supplier code',()=>{
 const original={product:'product_private',sample:'12345678',state:{family:'private',anchor:'KSUP001WW001',values:{CARMRESTS:'R55POLWBPU',CBASE:'TS30W'}}};
 const token=cap.seal('configuration',original);assert(!token.includes('CARMRESTS'));assert(!Buffer.from(token.slice(3),'base64url').toString().includes('R55POLWBPU'));assert.deepEqual(cap.open('configuration',token),original);
 assert.throws(()=>cap.open('asset',token));assert.throws(()=>customerCapabilities('different-private-test-key-more-than32').open('configuration',token));
 const bytes=Buffer.from(token.slice(3),'base64url');bytes[30]^=1;assert.throws(()=>cap.open('configuration','v1_'+bytes.toString('base64url')));
 assert.notEqual(cap.seal('configuration',original),token);assert.equal(cap.id('field','CARMRESTS'),cap.id('field','CARMRESTS'));assert.notEqual(cap.id('field','CARMRESTS'),cap.id('choice','CARMRESTS'));
 assert.throws(()=>customerCapabilities(''));
});
function sourceGlb(){
 const doc={asset:{version:'2.0',generator:'Supplier KSUP001WW001'},nodes:[{name:'CARMRESTS_R55POLWBPU',mesh:0,extras:{sourceCode:'KSUP001WW001',finishField:'CUPHCOLOR'}}],meshes:[{name:'Supplier mesh',primitives:[{attributes:{POSITION:0},indices:1}]}],accessors:[{bufferView:0,type:'VEC3',componentType:5126,count:1}],buffers:[{byteLength:16}],bufferViews:[{buffer:0,byteOffset:0,byteLength:16}],images:[{uri:'supplier/R55POLWBPU.jpg',name:'Vendor texture'}]};
 const raw=Buffer.from(JSON.stringify(doc)),json=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]),bin=Buffer.from([0,1,2,3,8,4,3,5,8,9,10,11,0,1,2,3]);const out=Buffer.alloc(28+json.length+bin.length);out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);out.writeUInt32LE(bin.length,20+json.length);out.writeUInt32LE(0x004e4942,24+json.length);bin.copy(out,28+json.length);return {out,bin,doc};
}
test('Public GLB removes original metadata and filenames without changing geometry buffers or indices',()=>{
 const {out:original,bin,doc}=sourceGlb(),alias=(name:string)=>'part_'+cap.id('scene',name),out=customerGlb(original,alias,uri=>'/media/p/'+cap.seal('asset',uri));
 assert(!out.toString().includes('KSUP001WW001'));assert(!out.toString().includes('CARMRESTS'));assert(!out.toString().includes('R55POLWBPU'));assert(!out.toString().includes('Supplier'));
 const size=out.readUInt32LE(12),publicDoc=JSON.parse(out.subarray(20,20+size).toString());assert.equal(publicDoc.nodes[0].name,alias('CARMRESTS_R55POLWBPU'));assert.deepEqual(publicDoc.accessors,doc.accessors);assert.deepEqual(publicDoc.bufferViews,doc.bufferViews);assert.deepEqual(publicDoc.meshes[0].primitives,doc.meshes[0].primitives);assert.deepEqual(out.subarray(size+28),bin);assert.deepEqual(original,sourceGlb().out,'source bytes must remain immutable');
 assert.throws(()=>customerGlb(original.subarray(0,-1),alias,x=>x));
});
test('Customer labels remove printed code aliases while retaining physical facts',()=>{
 const codes=['ERST','RAL9016','R55POLWBPU','CARMRESTS'];
 assert.equal(customerLabel('ER-ST · sinchroninis mechanizmas',codes,'Parinktis'),'sinchroninis mechanizmas');
 assert.equal(customerLabel('RAL 9016 · Balta',codes,'Parinktis'),'Balta');
 assert.equal(customerLabel('R55POLWBPU · 4D porankiai',codes,'Parinktis'),'4D porankiai');
 assert.equal(customerLabel('CARMRESTS',codes,'Porankiai'),'Porankiai');
 assert.equal(customerLabel('740 mm',['740'],'Aukštis'),'740 mm');
});
test('Public transitions cannot reuse another field or product choice identity',()=>{
 const scope={product:'one',sample:'a'},ids=customerControlIds(cap,scope),choices={CBASE:['A','B'],CARMRESTS:['A','B']};
 assert.deepEqual(resolveCustomerChange(choices,ids,{field:ids.field('CBASE'),value:ids.choice('CBASE','B')}),{field:'CBASE',value:'B'});
 assert.throws(()=>resolveCustomerChange(choices,ids,{field:ids.field('CBASE'),value:ids.choice('CARMRESTS','B')}));
 assert.throws(()=>resolveCustomerChange(choices,customerControlIds(cap,{product:'other',sample:'a'}),{field:ids.field('CBASE'),value:ids.choice('CBASE','B')}));
 assert.throws(()=>resolveCustomerChange(choices,ids,{field:'CBASE',value:'B'}));
});
