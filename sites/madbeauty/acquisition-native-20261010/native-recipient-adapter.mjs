// Server-only, capture-only component. Not imported by the deployed Worker or browser.
import {randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {createAuth} from '../backend/auth.mjs';
import {canonicalNativeEmail,createRecipientCodec,ADDRESS_RULE,RECIPIENT_VERSION} from './contracts/recipient-binding.mjs';
import {signRequest} from './contracts/server-auth.mjs';
import {validateWire} from './wire.mjs';
const encode=value=>JSON.stringify(value);
const timestamp=ms=>new Date(ms).toISOString();
const bytesEqual=(a,b)=>a instanceof Uint8Array&&b instanceof Uint8Array&&a.length===b.length&&timingSafeEqual(a,b);
const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v)&&!v.endsWith('\n');

export async function createNativeRecipientCapture({store,scope,adapterId,sourceRelease,recipientKeyId,recipientSecret,transportKeyId,transportSecret,captureOnly}){
 if(captureOnly!==true||scope?.site_id!==store.siteId||scope?.site_id!=='madbeauty'||scope?.environment_class!=='test')throw Error('isolated_capture_scope_required');
 if(!identifier(sourceRelease)||!identifier(transportKeyId)||!(transportSecret instanceof Uint8Array)||transportSecret.length<32||bytesEqual(recipientSecret,transportSecret))throw Error('separate_transport_grant_required');
 const trustedScope=Object.freeze({...scope}),scopeKey=encode({scope:Object.fromEntries(Object.keys(trustedScope).sort().map(k=>[k,trustedScope[k]])),adapter_id:adapterId}),transportKey=transportSecret.slice();
 const codec=await createRecipientCodec({secret:recipientSecret,scope:trustedScope,adapterId,keyId:recipientKeyId});
 const auth=createAuth(store),{db}=store;
 store.transaction(()=>{
  db.exec(`CREATE TABLE IF NOT EXISTS native_recipient_challenges(scope_key TEXT NOT NULL,challenge_id TEXT NOT NULL,invitation_ref TEXT NOT NULL,PRIMARY KEY(scope_key,challenge_id));
CREATE TABLE IF NOT EXISTS native_recipient_pending(scope_key TEXT NOT NULL,invitation_ref TEXT NOT NULL,account_ref TEXT NOT NULL,signup_at TEXT NOT NULL,verified_at TEXT NOT NULL,state TEXT NOT NULL,challenge_receipt TEXT,PRIMARY KEY(scope_key,invitation_ref,account_ref));
CREATE TABLE IF NOT EXISTS native_recipient_requests(scope_key TEXT NOT NULL,request_id TEXT NOT NULL,invitation_ref TEXT NOT NULL,account_ref TEXT NOT NULL,operation TEXT NOT NULL,body TEXT NOT NULL,body_sha256 TEXT NOT NULL,state TEXT NOT NULL,receipt TEXT,created_at INTEGER NOT NULL,PRIMARY KEY(scope_key,request_id),UNIQUE(scope_key,invitation_ref,account_ref,operation));`);
 });
 const pending=(ref,accountRef)=>{
  if(accountRef!==undefined)return db.prepare('SELECT * FROM native_recipient_pending WHERE scope_key=? AND invitation_ref=? AND account_ref=?').get(scopeKey,ref,accountRef);
  const candidates=db.prepare('SELECT * FROM native_recipient_pending WHERE scope_key=? AND invitation_ref=? LIMIT 2').all(scopeKey,ref);
  if(candidates.length>1)throw Error('native_account_context_required');
  return candidates[0];
 };
 const request=id=>db.prepare('SELECT * FROM native_recipient_requests WHERE scope_key=? AND request_id=?').get(scopeKey,id);
 const context=(ref,id)=>({recipient_contract_version:RECIPIENT_VERSION,scope:trustedScope,adapter_id:adapterId,invitation_ref:ref,request_id:id});
 function queue(operation,ref,accountRef,body){
  const schema=operation==='recipient-challenge'?'RecipientChallengeRequest':'RecipientProofRequest';
  validateWire(schema,body);
  const raw=encode(body),hash=createHash('sha256').update(raw).digest('hex');
  db.prepare('INSERT INTO native_recipient_requests(scope_key,request_id,invitation_ref,account_ref,operation,body,body_sha256,state,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(scopeKey,body.request_id,ref,accountRef,operation,raw,hash,'ready',store.clock());
  return request(body.request_id);
 }
 function assertNative(row){
  const account=db.prepare('SELECT id,email FROM accounts WHERE site_id=? AND id=?').get(store.siteId,row.account_ref);
  if(!account||canonicalNativeEmail(account.email)!==account.email)throw Error('native_account_unavailable');
  return account;
 }
 return Object.freeze({
  auth,
  startInvitation(session,{invitationRef,email,ip}){
   validateWire('RecipientChallengeRequest',context(invitationRef,randomUUID()));
   return store.transaction(()=>{
    const started=auth.start(session,email,ip);
    db.prepare('INSERT INTO native_recipient_challenges VALUES(?,?,?)').run(scopeKey,started.challengeId,invitationRef);
    return started;
   });
  },
  verifyInvitation(session,{challengeId,code,ip}){
   const previous=store.onVerifiedAccount;
   // createAuth calls this hook only inside successful OTP verification's transaction.
   // Native attempts still commit on invalid OTP; do not wrap verify in an outer transaction.
   store.onVerifiedAccount=user=>{
    const actual=previous?previous(user):user;
    const c=db.prepare('SELECT * FROM email_challenges WHERE site_id=? AND id=? AND session_hash=? AND consumed=1').get(store.siteId,challengeId,session.token_hash);
    const link=db.prepare('SELECT invitation_ref FROM native_recipient_challenges WHERE scope_key=? AND challenge_id=?').get(scopeKey,challengeId);
    if(!c||!link)return actual;
    const account=db.prepare('SELECT id,email FROM accounts WHERE site_id=? AND id=?').get(store.siteId,actual.id);
    if(!account||account.email!==c.email)throw Error('native_verified_identity_mismatch');
    // These are private account candidates, not a ref→recipient binding. A forwarded-link
    // candidate must not prevent the intended recipient's later independent proof.
    if(!pending(link.invitation_ref,account.id))db.prepare('INSERT INTO native_recipient_pending(scope_key,invitation_ref,account_ref,signup_at,verified_at,state) VALUES(?,?,?,?,?,?)').run(scopeKey,link.invitation_ref,account.id,timestamp(c.created_at),timestamp(store.clock()),'verified');
    db.prepare('DELETE FROM native_recipient_challenges WHERE scope_key=? AND challenge_id=?').run(scopeKey,challengeId);
    return actual;
   };
   try{return auth.verify(session,challengeId,code,ip);}finally{store.onVerifiedAccount=previous;}
  },
  async prepare(invitationRef,nativeAccountRef){
   // Account context is supplied by trusted native server logic, never a browser account field.
   const row=pending(invitationRef,nativeAccountRef);if(!row)return null;
   const existing=db.prepare("SELECT * FROM native_recipient_requests WHERE scope_key=? AND invitation_ref=? AND account_ref=? AND state='ready' ORDER BY created_at,request_id LIMIT 1").get(scopeKey,invitationRef,row.account_ref);
   if(existing)return existing.request_id;
   if(row.state==='verified')return store.transaction(()=>{
    assertNative(row);
    // Recheck after entering the transaction; another prepare cannot duplicate the operation.
    const old=db.prepare("SELECT request_id FROM native_recipient_requests WHERE scope_key=? AND invitation_ref=? AND account_ref=? AND operation='recipient-challenge'").get(scopeKey,invitationRef,row.account_ref);
    if(old)return old.request_id;
    return queue('recipient-challenge',invitationRef,row.account_ref,context(invitationRef,randomUUID())).request_id;
   });
   if(row.state!=='challenge_issued')return null;
   const receipt=JSON.parse(row.challenge_receipt),challenge=receipt.challenge;
   if(Date.parse(challenge.expires_at)<=store.clock()){
    store.transaction(()=>db.prepare("UPDATE native_recipient_pending SET state='expired' WHERE scope_key=? AND invitation_ref=? AND account_ref=? AND state='challenge_issued'").run(scopeKey,invitationRef,row.account_ref));return null;
   }
   const account=assertNative(row);
   const digest=await codec.digest({invitationRef,challengeNonce:challenge.challenge_nonce,canonicalRecipient:account.email});
   return store.transaction(()=>{
    const current=pending(invitationRef,row.account_ref);
    if(assertNative(current).email!==account.email)throw Error('native_recipient_changed');
    if(current.account_ref!==row.account_ref||current.state!=='challenge_issued')throw Error('recipient_state_changed');
    if(Date.parse(challenge.expires_at)<=store.clock())throw Error('recipient_challenge_expired');
    const old=db.prepare("SELECT request_id FROM native_recipient_requests WHERE scope_key=? AND invitation_ref=? AND account_ref=? AND operation='verify-recipient'").get(scopeKey,invitationRef,row.account_ref);
    if(old)return old.request_id;
    return queue('verify-recipient',invitationRef,row.account_ref,{...context(invitationRef,randomUUID()),challenge_nonce:challenge.challenge_nonce,recipient_key_id:recipientKeyId,address_rule:ADDRESS_RULE,recipient_digest:digest,native_account_ref:row.account_ref,native_verified_at:row.verified_at,source_release:sourceRelease}).request_id;
   });
  },
  async packet(requestId){
   const row=request(requestId);if(!row||row.state!=='ready')return null;
   if(createHash('sha256').update(row.body).digest('hex')!==row.body_sha256)throw Error('immutable_request_corrupt');
   const current=pending(row.invitation_ref,row.account_ref);if(!current)throw Error('native_attribution_unavailable');const account=assertNative(current);
   const path='/integrations/acquisition/v1/sites/madbeauty/'+row.operation;
   const headers=await signRequest({keyId:transportKeyId,secret:transportKey,path,body:row.body,timestamp:Math.floor(store.clock()/1000)});
   // Crypto awaits can interleave with native erasure/receipt processing. Recheck before handing bytes to a caller.
   if(request(requestId)?.state!=='ready')return null;
   const latest=pending(row.invitation_ref,row.account_ref);if(!latest||assertNative(latest).email!==account.email)throw Error('native_recipient_changed');
   return {method:'POST',path,body:row.body,headers};
  },
  // Caller must supply the actual authenticated server response. There is no fetch/route here.
  acceptReceipt(requestId,receipt){return store.transaction(()=>{
   const row=request(requestId);if(!row)throw Error('unknown_recipient_request');
   const raw=encode(receipt);
   if(row.state==='accepted'){if(row.receipt!==raw)throw Error('changed_recipient_receipt');return JSON.parse(row.receipt);}
   validateWire(row.operation==='recipient-challenge'?'RecipientChallengeReceipt':'RecipientProofReceipt',receipt);
   if(receipt.recipient_contract_version!==RECIPIENT_VERSION||receipt.external_sent!==false||receipt.request_id!==requestId||receipt.adapter_id!==adapterId||receipt.invitation_ref!==row.invitation_ref||Object.entries(trustedScope).some(([k,v])=>receipt.scope[k]!==v))throw Error('recipient_receipt_scope_mismatch');
   const current=pending(row.invitation_ref,row.account_ref);assertNative(current);
   if(row.operation==='recipient-challenge'){
    if(receipt.state==='issued'){
     const c=receipt.challenge,issue=Date.parse(c?.issued_at),expiry=Date.parse(c?.expires_at),now=store.clock();
     if(!c||c.address_rule!==ADDRESS_RULE||c.recipient_key_id!==recipientKeyId||!Number.isFinite(issue)||!Number.isFinite(expiry)||expiry<=issue||expiry-issue>300000||issue>now+300000)throw Error('invalid_registered_challenge');
     db.prepare('UPDATE native_recipient_pending SET state=?,challenge_receipt=? WHERE scope_key=? AND invitation_ref=? AND account_ref=?').run(expiry<=now?'expired':'challenge_issued',raw,scopeKey,row.invitation_ref,row.account_ref);
    }else{
     if(receipt.challenge!==null)throw Error('unexpected_recipient_challenge');
     db.prepare('UPDATE native_recipient_pending SET state=? WHERE scope_key=? AND invitation_ref=? AND account_ref=?').run(receipt.state,scopeKey,row.invitation_ref,row.account_ref);
    }
   }else{
    if(receipt.state!=='recipient_bound'||Date.parse(receipt.bound_at)>store.clock()+300000)throw Error('invalid_recipient_binding');
    db.prepare("UPDATE native_recipient_pending SET state='recipient_bound' WHERE scope_key=? AND invitation_ref=? AND account_ref=?").run(scopeKey,row.invitation_ref,row.account_ref);
   }
   db.prepare("UPDATE native_recipient_requests SET state='accepted',receipt=? WHERE scope_key=? AND request_id=?").run(raw,scopeKey,requestId);
   return receipt;
  });},
  state:(invitationRef,nativeAccountRef)=>pending(invitationRef,nativeAccountRef)?.state||null,
 });
}
