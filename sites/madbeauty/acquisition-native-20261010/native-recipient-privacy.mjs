// Native privacy outbox; capture-only parent controls scope and transport permissions.
import {randomUUID,randomBytes,createHash,createHmac,createCipheriv,createDecipheriv} from 'node:crypto';
import {createRetention} from '../backend/retention.mjs';
import {RETENTION_POLICY,monthsBefore} from '../backend/retention-policy.mjs';
import {ADDRESS_RULE,RECIPIENT_VERSION} from './contracts/recipient-binding.mjs';
import {signRequest} from './contracts/server-auth.mjs';
import {validateWire} from './wire.mjs';
const iso=ms=>new Date(ms).toISOString(),json=JSON.stringify,hash=raw=>createHash('sha256').update(raw).digest('hex');
const maxAttempts=10,leaseMs=30000,timeoutMs=15000;
export function createNativeRecipientPrivacy({store,scopeKey,adapterId,sourceRelease,codec,recipientKeyId,recipientKey,transportKeyId,transportKey,permissions}){
 const {db}=store,retention=createRetention(store),cipherKey=Buffer.from(store.hash('native-recipient-privacy-outbox-key-v1'),'hex');
 store.transaction(()=>db.exec(`CREATE TABLE IF NOT EXISTS native_recipient_privacy(scope_key TEXT NOT NULL,request_id TEXT NOT NULL,invitation_ref TEXT NOT NULL,account_key TEXT NOT NULL,payload TEXT,body_sha256 TEXT NOT NULL,state TEXT NOT NULL,receipt TEXT,erasure_id TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0,lease_token TEXT,error_code TEXT,PRIMARY KEY(scope_key,request_id),UNIQUE(scope_key,invitation_ref,account_key));`));
 const accountKey=id=>store.hash('native-recipient-retired-account-v1:'+id);
 const row=id=>db.prepare('SELECT * FROM native_recipient_privacy WHERE scope_key=? AND request_id=?').get(scopeKey,id);
 function seal(raw){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',cipherKey,iv);return json({v:1,iv:iv.toString('base64'),tag:null,encrypted:Buffer.concat([c.update(raw,'utf8'),c.final()]).toString('base64'),...{tag:c.getAuthTag().toString('base64')}});}
 function unseal(record){const e=JSON.parse(record.payload);if(e.v!==1)throw Error('unknown_retirement_payload');const c=createDecipheriv('aes-256-gcm',cipherKey,Buffer.from(e.iv,'base64'));c.setAuthTag(Buffer.from(e.tag,'base64'));const raw=Buffer.concat([c.update(Buffer.from(e.encrypted,'base64')),c.final()]).toString('utf8');if(hash(raw)!==record.body_sha256)throw Error('retirement_payload_corrupt');return raw;}
 function proofFor(candidate,account){
  const prepared=db.prepare("SELECT body,body_sha256 FROM native_recipient_requests WHERE scope_key=? AND invitation_ref=? AND account_ref=? AND operation='verify-recipient'").get(candidate.scope_key,candidate.invitation_ref,account.id);
  if(prepared){if(hash(prepared.body)!==prepared.body_sha256)throw Error('immutable_request_corrupt');return validateWire('RecipientProofRequest',JSON.parse(prepared.body));}
  // A challenge-only candidate has no native account binding at core. For this
  // registered context we can prepare the final proof synchronously before erasure.
  if(candidate.scope_key!==scopeKey||!candidate.challenge_receipt)return null;
  const receipt=JSON.parse(candidate.challenge_receipt),challenge=receipt.challenge;
  if(receipt.state!=='issued'||!challenge)return null;
  if(challenge.recipient_key_id!==recipientKeyId||challenge.address_rule!==ADDRESS_RULE)throw Error('retirement_challenge_key_mismatch');
  const context=JSON.parse(candidate.scope_key),digest='v1='+createHmac('sha256',recipientKey).update(codec.bytes({invitationRef:candidate.invitation_ref,challengeNonce:challenge.challenge_nonce,canonicalRecipient:account.email})).digest('hex');
  return validateWire('RecipientProofRequest',{recipient_contract_version:RECIPIENT_VERSION,scope:context.scope,adapter_id:context.adapter_id,invitation_ref:candidate.invitation_ref,request_id:randomUUID(),challenge_nonce:challenge.challenge_nonce,recipient_key_id:recipientKeyId,address_rule:ADDRESS_RULE,recipient_digest:digest,native_account_ref:account.id,native_verified_at:candidate.verified_at,source_release:sourceRelease});
 }
 function validateNested(body){validateWire('RecipientRetirement',body);const p=body.recipient_proof;if(p&&(json(Object.fromEntries(Object.entries(p.scope).sort()))!==json(Object.fromEntries(Object.entries(body.scope).sort()))||p.adapter_id!==body.adapter_id||p.invitation_ref!==body.invitation_ref||p.native_account_ref!==body.native_account_ref))throw Error('retirement_proof_binding_mismatch');}
 function stageErasure(event){
  const {clientId,requestId,occurredAt,reason}=event;
  if(!['account_erasure','retention_erasure'].includes(reason))throw Error('invalid_native_erasure_reason');
  const account=db.prepare('SELECT id,email FROM accounts WHERE site_id=? AND id=?').get(store.siteId,clientId);
  if(!account)return;
  const candidates=db.prepare('SELECT * FROM native_recipient_pending WHERE scope_key=? AND account_ref=? ORDER BY invitation_ref').all(scopeKey,account.id),drafts=[];
  for(const candidate of candidates){
   const context=JSON.parse(candidate.scope_key),proof=proofFor(candidate,account);
   if(!proof&&candidate.state!=='recipient_bound')continue;
   const body={retirement_contract_version:'0.1.0',scope:context.scope,adapter_id:context.adapter_id,invitation_ref:candidate.invitation_ref,request_id:randomUUID(),native_account_ref:account.id,occurred_at:iso(occurredAt),source_release:sourceRelease,reason,recipient_proof:proof};
   validateNested(body);if(body.scope.site_id!==store.siteId)throw Error('retirement_site_mismatch');drafts.push({scopeKey:candidate.scope_key,body});
  }
  for(const draft of drafts){const raw=json(draft.body);if(Buffer.byteLength(raw)>65536)throw Error('retirement_body_too_large');db.prepare('INSERT INTO native_recipient_privacy(scope_key,request_id,invitation_ref,account_key,payload,body_sha256,state,erasure_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(draft.scopeKey,draft.body.request_id,draft.body.invitation_ref,accountKey(account.id),seal(raw),hash(raw),'ready',requestId,store.clock(),monthsBefore(store.clock(),-RETENTION_POLICY.receiptMonths));}
 }
 // Ephemeral purpose-specific signer callbacks, rebuilt from trusted configuration;
 // no persisted generic task/runner registry. Repeated factories replace their own handler.
 const hookState=store.nativeRecipientErasureHooks||(store.nativeRecipientErasureHooks={previous:store.onAccountErasure,handlers:new Map()});
 hookState.handlers.set(scopeKey,stageErasure);
 store.onAccountErasure=event=>{
  const old=hookState.previous?.(event);if(old?.then)throw Error('Native erasure hook must be synchronous');
  for(const handler of hookState.handlers.values())handler(event);
  for(const handler of hookState.lifecycleHandlers?.values()||[])handler(event);
  const remaining=db.prepare('SELECT * FROM native_recipient_pending WHERE account_ref=?').all(event.clientId),account=db.prepare('SELECT id,email FROM accounts WHERE site_id=? AND id=?').get(store.siteId,event.clientId);
  // Prepared proofs remain valid privacy evidence across contexts even if that
  // signer has not been reloaded after restart. Queue its original proof now;
  // only its explicitly configured scope/grant can later sign and deliver it.
  for(const candidate of remaining.filter(c=>!hookState.handlers.has(c.scope_key))){
   const prepared=db.prepare("SELECT body,body_sha256 FROM native_recipient_requests WHERE scope_key=? AND invitation_ref=? AND account_ref=? AND operation='verify-recipient'").get(candidate.scope_key,candidate.invitation_ref,event.clientId);
   if(!prepared&&candidate.state!=='recipient_bound')continue;
   if(prepared&&hash(prepared.body)!==prepared.body_sha256)throw Error('immutable_request_corrupt');
   const context=JSON.parse(candidate.scope_key),body={retirement_contract_version:'0.1.0',scope:context.scope,adapter_id:context.adapter_id,invitation_ref:candidate.invitation_ref,request_id:randomUUID(),native_account_ref:event.clientId,occurred_at:iso(event.occurredAt),source_release:sourceRelease,reason:event.reason,recipient_proof:prepared?JSON.parse(prepared.body):null};
   validateNested(body);if(body.scope.site_id!==store.siteId)throw Error('retirement_site_mismatch');
   const raw=json(body);if(Buffer.byteLength(raw)>65536)throw Error('retirement_body_too_large');
   db.prepare('INSERT INTO native_recipient_privacy(scope_key,request_id,invitation_ref,account_key,payload,body_sha256,state,erasure_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(candidate.scope_key,body.request_id,candidate.invitation_ref,accountKey(event.clientId),seal(raw),hash(raw),'ready',event.requestId,store.clock(),monthsBefore(store.clock(),-RETENTION_POLICY.receiptMonths));
  }
  if(account)db.prepare('DELETE FROM native_recipient_challenges WHERE challenge_id IN (SELECT id FROM email_challenges WHERE site_id=? AND email=?)').run(store.siteId,account.email);
  db.prepare('DELETE FROM native_recipient_requests WHERE account_ref=?').run(event.clientId);
  db.prepare('DELETE FROM native_recipient_pending WHERE account_ref=?').run(event.clientId);
 };
 function eraseAccount(user,input){return store.transaction(()=>{
  const account=db.prepare('SELECT id,email FROM accounts WHERE site_id=? AND id=?').get(store.siteId,user?.id);
  if(!retention.get(user?.id)&&(!account||account.email!==user.email))throw Error('native_erasure_identity_mismatch');
  const erasure=retention.begin(user,input);
  return {erasure,retirementRequestIds:db.prepare('SELECT request_id FROM native_recipient_privacy WHERE account_key=? ORDER BY request_id').all(accountKey(user.id)).map(r=>r.request_id)};
 });}
 async function packet(id){
  if(!permissions.has('retire-recipient'))throw Error('retirement_permission_required');
  const record=row(id);if(!record||!record.payload||record.state==='accepted'||record.state==='permanent')return null;
  const raw=unseal(record),body=JSON.parse(raw);validateNested(body);
  if(body.adapter_id!==adapterId||json(Object.fromEntries(Object.entries(body.scope).sort()))!==json(Object.fromEntries(Object.entries(JSON.parse(scopeKey).scope).sort())))throw Error('retirement_scope_mismatch');
  const tombstone=db.prepare('SELECT request_id FROM retention_tombstones WHERE site_id=? AND client_id=?').get(store.siteId,body.native_account_ref);
  if(!tombstone||tombstone.request_id!==record.erasure_id||db.prepare('SELECT id FROM accounts WHERE site_id=? AND id=?').get(store.siteId,body.native_account_ref))throw Error('native_erasure_not_committed');
  const path='/integrations/acquisition/v1/sites/madbeauty/retire-recipient',headers=await signRequest({keyId:transportKeyId,secret:transportKey,path,body:raw,timestamp:Math.floor(store.clock()/1000)});
  if(!row(id)?.payload)return null;
  return {method:'POST',path,body:raw,headers};
 }
 function acknowledge(id,receipt,leaseToken){return store.transaction(()=>{
  const record=row(id);if(!record)throw Error('unknown_retirement_request');const raw=json(receipt);
  if(record.state==='accepted'){if(record.receipt!==raw)throw Error('changed_retirement_receipt');return JSON.parse(record.receipt);}
  if(record.state!=='sending'||record.lease_token!==leaseToken||record.lease_until<=store.clock())throw Error('stale_retirement_lease');
  validateWire('RetirementReceipt',receipt);
  if(receipt.retirement_contract_version!=='0.1.0'||receipt.external_sent!==false||receipt.request_id!==id||receipt.invitation_ref!==record.invitation_ref||receipt.adapter_id!==adapterId||json(Object.fromEntries(Object.entries(receipt.scope).sort()))!==json(Object.fromEntries(Object.entries(JSON.parse(scopeKey).scope).sort()))||Date.parse(receipt.retired_at)>store.clock()+300000)throw Error('retirement_receipt_mismatch');
  db.prepare("UPDATE native_recipient_privacy SET state='accepted',receipt=?,payload=NULL,lease_token=NULL,lease_until=0,error_code=NULL WHERE scope_key=? AND request_id=?").run(raw,scopeKey,id);
  return receipt;
 });}
 function claim(id){return store.transaction(()=>{
  const record=row(id),now=store.clock();if(!record||record.state==='accepted'||record.state==='permanent'||record.next_at>now||record.state==='sending'&&record.lease_until>now)return null;
  if(record.attempts>=maxAttempts){db.prepare("UPDATE native_recipient_privacy SET state='permanent',error_code='RETRY_EXHAUSTED',lease_token=NULL,lease_until=0 WHERE scope_key=? AND request_id=?").run(scopeKey,id);return null;}
  const leaseToken=randomUUID();db.prepare("UPDATE native_recipient_privacy SET state='sending',attempts=attempts+1,lease_token=?,lease_until=? WHERE scope_key=? AND request_id=?").run(leaseToken,now+leaseMs,scopeKey,id);return leaseToken;
 });}
 function failed(id,leaseToken,code,permanent){return store.transaction(()=>{
  const record=row(id);if(record?.state!=='sending'||record.lease_token!==leaseToken)return;
  const final=permanent||record.attempts>=maxAttempts;
  db.prepare('UPDATE native_recipient_privacy SET state=?,error_code=?,next_at=?,lease_token=NULL,lease_until=0 WHERE scope_key=? AND request_id=?').run(final?'permanent':'retry',code,store.clock()+Math.min(3600000,1000*2**record.attempts),scopeKey,id);
 });}
 async function readReceipt(response){
  if(!response.body)throw Error('retirement_response_missing');const reader=response.body.getReader(),chunks=[];let size=0;
  try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>65536){await reader.cancel();throw Error('retirement_response_too_large');}chunks.push(next.value);}}finally{reader.releaseLock();}
  return JSON.parse(Buffer.concat(chunks.map(c=>Buffer.from(c))).toString('utf8'));
 }
 async function dispatch(id,exchange){
  if(typeof exchange!=='function')throw Error('registered_retirement_exchange_required');
  const leaseToken=claim(id);if(!leaseToken)return null;
  const controller=new AbortController();let timeout;
  try{
   const task=(async()=>{const payload=await packet(id);if(!payload||controller.signal.aborted)throw Error('retirement_packet_unavailable');const response=await exchange({...payload,signal:controller.signal});
    if(!(response instanceof Response))throw Error('invalid_retirement_transport');
    if(response.status!==200){const permanent=[400,401,403,404,409,410,422].includes(response.status);failed(id,leaseToken,'HTTP_'+response.status,permanent);return null;}
    return acknowledge(id,await readReceipt(response),leaseToken);
   })();
   return await Promise.race([task,new Promise((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(Error('retirement_timeout'));},timeoutMs);})]);
  }catch(error){failed(id,leaseToken,error.message==='retirement_permission_required'?'GRANT_UNAVAILABLE':error.message==='stale_retirement_lease'?'STALE_LEASE':'TRANSPORT_OR_RECEIPT',false);return null;}
  finally{clearTimeout(timeout);}
 }
 function sweep(){return store.transaction(()=>db.prepare("DELETE FROM native_recipient_privacy WHERE state='accepted' AND expires_at<=?").run(store.clock()).changes);}
 const status=()=>db.prepare('SELECT request_id,state,attempts,next_at,lease_until,error_code,created_at,expires_at FROM native_recipient_privacy WHERE scope_key=? ORDER BY created_at,request_id').all(scopeKey);
 return Object.freeze({eraseAccount,packet,dispatch,status,sweep});
}
