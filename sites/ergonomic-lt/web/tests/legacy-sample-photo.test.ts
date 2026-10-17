import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifiedLegacySamplePhoto} from '../scripts/verified-legacy-sample-photo.mjs';

const digest=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const original=Buffer.from([0xff,0xd8,0xff,0xe0,0,4,0x41,0x42,0xff,0xda,0,2,0x10,0x20,0xff,0xd9]);
 const comment=Buffer.from('Source provenance');
 const marker=Buffer.alloc(4);marker[0]=0xff;marker[1]=0xfe;marker.writeUInt16BE(comment.length+2,2);
 const annotated=Buffer.concat([original.subarray(0,2),marker,comment,original.subarray(2)]);
 const source='https://www.nowystyl.com/getmedia/approved-image/chair.jpg';
 const receipt={source_url:source+'?height=1000',source_product_ids:['exact-product'],sha256:digest(original),bytes:original.length};
 return {original,annotated,source,receipt};
}

test('legacy photo reuse preserves exact original or provenance-annotated bytes across approved size variants',()=>{
 const {original,annotated,source,receipt}=fixture();
 assert.equal(verifiedLegacySamplePhoto(original,receipt,source+'?height=450','exact-product').provenanceComment,false);
 const proof=verifiedLegacySamplePhoto(annotated,receipt,source+'?height=450','exact-product');
 assert.equal(proof.sourceSha256,digest(original));assert.equal(proof.assetSha256,digest(annotated));assert.equal(proof.provenanceComment,true);
});

test('legacy photo reuse rejects another product, another approved image and modified image payload',()=>{
 const {annotated,source,receipt}=fixture();
 assert.throws(()=>verifiedLegacySamplePhoto(annotated,receipt,source,'other-product'),/another product/);
 assert.throws(()=>verifiedLegacySamplePhoto(annotated,receipt,source.replace('approved-image','other-image'),'exact-product'),/differs/);
 assert.throws(()=>verifiedLegacySamplePhoto(annotated,receipt,source+'?crop=center','exact-product'),/image-size/);
 const changed=Buffer.from(annotated);changed[changed.length-3]^=1;
 assert.throws(()=>verifiedLegacySamplePhoto(changed,receipt,source,'exact-product'),/does not match/);
});
