// Wire contract only: receives the producer's already-filtered public projection.
import { createHash, randomUUID } from 'node:crypto';

export const canonical = value => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort()
    .map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
};
export const hash = value => createHash('sha256').update(value).digest('hex');

export function transport(metadata, pages, baseRevision=0, transferId=randomUUID()) {
  if (!pages.length || pages.length > 1000 || new Set(pages.map(p=>p.id)).size !== pages.length)
    throw new Error('knowledge_page_inventory_invalid');
  const fragments=[];
  pages.forEach((page,pageOrdinal)=> {
    // Slice Unicode code points, never split a UTF-16 surrogate pair.
    const chars=Array.from(page.text), parts=Math.max(1,Math.ceil(chars.length/18000));
    for(let part=0;part<parts;part++) fragments.push({...page,text:chars.slice(part*18000,(part+1)*18000).join(''),
      ordinal:fragments.length,page_ordinal:pageOrdinal,part,parts});
  });
  if (fragments.length > 1000 || Buffer.byteLength(canonical(Object.fromEntries(
    fragments.map(f=>[String(f.ordinal),f]))),'utf8') > 8000000) throw new Error('knowledge_transfer_too_large');
  const contentHash=hash(canonical({metadata,pages}));
  const header={schema_version:2,transfer_id:transferId,base_revision:baseRevision,metadata,
    page_count:pages.length,fragment_count:fragments.length,content_hash:contentHash};
  const batches=[];
  let pending=[];
  for (const fragment of fragments) {
    const proposed=[...pending,fragment];
    if(proposed.length>10 || Buffer.byteLength(canonical({transfer_id:transferId,fragments:proposed}),'utf8')>512000){
      batches.push({transfer_id:transferId,fragments:pending});pending=[];
    }
    pending.push(fragment);
  }
  if(pending.length)batches.push({transfer_id:transferId,fragments:pending});
  return {header,batches,commit:{transfer_id:transferId,content_hash:contentHash}};
}
