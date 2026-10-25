import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// An early pilot retained a higher-resolution original with a JPEG provenance
// comment. Verify the original bytes and the exact approved supplier image,
// rather than replacing it with a smaller responsive WebP derivative.
export function verifiedLegacySamplePhoto(bytes,receipt,approvedPrimary,productId){
 assert(receipt.source_product_ids?.includes(productId),'Legacy photo belongs to another product');
 const source=new URL(receipt.source_url),approved=new URL(approvedPrimary);
 assert(source.protocol==='https:'&&source.hostname==='www.nowystyl.com'&&source.pathname.startsWith('/getmedia/'));
 assert.equal(source.origin+source.pathname,approved.origin+approved.pathname,'Legacy photo source differs from approved model');
 for(const url of [source,approved])for(const [key,value] of url.searchParams)
  assert(['height','width'].includes(key)&&/^\d+$/.test(value),'Only image-size query variants are reusable');
 assert(/^[a-f0-9]{64}$/.test(receipt.sha256)&&Number.isInteger(receipt.bytes));
 if(sha(bytes)===receipt.sha256&&bytes.length===receipt.bytes)return {sourceSha256:receipt.sha256,assetSha256:sha(bytes),provenanceComment:false};
 assert(bytes[0]===0xff&&bytes[1]===0xd8,'Legacy original must be JPEG');
 let offset=2;
 while(offset+4<=bytes.length){
  assert.equal(bytes[offset],0xff,'Malformed JPEG metadata');
  const marker=bytes[offset+1];if(marker===0xda||marker===0xd9)break;
  const length=bytes.readUInt16BE(offset+2);assert(length>=2&&offset+2+length<=bytes.length);
  if(marker===0xfe){
   const original=Buffer.concat([bytes.subarray(0,offset),bytes.subarray(offset+2+length)]);
   if(original.length===receipt.bytes&&sha(original)===receipt.sha256)
    return {sourceSha256:receipt.sha256,assetSha256:sha(bytes),provenanceComment:true};
  }
  offset+=2+length;
 }
 throw Error('Legacy JPEG does not match its original source receipt');
}
