export function createMediaUploadIntents(storage=null){
 const pending=new Map();
 const storageKey=(accountId,organizationId)=>'madbeauty:media-upload:'+accountId+':'+organizationId;
 function read(key){
  if(pending.has(key))return pending.get(key);
  try{const raw=storage?.getItem(key);if(!raw||raw.length>1024)return null;const value=JSON.parse(raw);if(/^[a-f0-9]{64}$/.test(value.fingerprint)&&/^[a-zA-Z0-9_-]{8,160}$/.test(value.idempotencyKey))return value;}catch{}
  return null;
 }
 return {
  reserve(accountId,organizationId,fingerprint){
   if(!accountId||!organizationId||!(/^[a-f0-9]{64}$/).test(fingerprint))throw Error('Invalid upload intent');
   const key=storageKey(accountId,organizationId),old=read(key),record=old?.fingerprint===fingerprint?old:{fingerprint,idempotencyKey:crypto.randomUUID()};
   pending.set(key,record);try{storage?.setItem(key,JSON.stringify(record));}catch{}
   return {...record,key};
  },
  complete(record){
   if(read(record.key)?.idempotencyKey!==record.idempotencyKey)return;
   pending.delete(record.key);try{storage?.removeItem(record.key);}catch{}
  }
 };
}
export async function mediaUploadFingerprint(file,{organizationId,alt,rights,usage}){
 const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join(''),original=hex(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()));
 return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({organizationId,alt:alt.trim(),rights:rights.trim(),usage,mime:file.type,size:file.size,original}))));
}
