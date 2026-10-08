import {ApiError,randomId,reject} from './primitives.mjs';
import {organizationTransferProof as proof,sameTransferProof as equal} from './organization-handoff.mjs';

const json=JSON.stringify,maxRecords=4096;
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=160;
const hash=(store,id,accountId,actorId,input)=>proof(store,'client-admission',{id,accountId,actorId,input});
export function clientAdmissionInput(input){
 const email=typeof input.email==='string'?input.email.trim().toLowerCase():'',name=typeof input.name==='string'?input.name.trim():'';
 if(!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||name.length>80)reject('INVALID_INPUT','Įrašykite kliento vardą ir teisingą el. paštą.');
 return {organizationId:input.organizationId,email,name};
}
const view=row=>({...row,input:JSON.parse(row.input),result:row.result?JSON.parse(row.result):null});

// Central provisioning and its durable business intent commit together. This is
// a private unverified account, not a new authenticated session or team grant.
export function createClientAdmissionQueue(store){
 const {db,siteId}=store;
 db.exec('CREATE TABLE IF NOT EXISTS directory_client_admissions(site_id TEXT NOT NULL,id TEXT NOT NULL,organization_id TEXT NOT NULL,epoch INTEGER NOT NULL,actor_id TEXT NOT NULL,request_key TEXT NOT NULL,account_id TEXT NOT NULL,input TEXT NOT NULL,request_hash TEXT NOT NULL,state TEXT NOT NULL,result TEXT,due_at INTEGER NOT NULL,created_at INTEGER NOT NULL,error_code TEXT,error_message TEXT,PRIMARY KEY(site_id,id),UNIQUE(site_id,organization_id,actor_id,request_key)); CREATE INDEX IF NOT EXISTS client_admissions_due ON directory_client_admissions(site_id,state,due_at);');
 const get=id=>{const row=db.prepare('SELECT * FROM directory_client_admissions WHERE site_id=? AND id=?').get(siteId,id);return row?view(row):null;};
 return {
  prepare:(transfer,actor,input,key,capacity=true)=>store.transaction(()=>{
   if(!actor?.id)reject('UNAUTHENTICATED','Prisijunkite.',401);
   if(typeof key!=='string'||!key.trim()||key.length>120)reject('INVALID_INPUT','Pradėkite kliento pridėjimą iš naujo.');
   const value=clientAdmissionInput(input),existing=db.prepare('SELECT * FROM directory_client_admissions WHERE site_id=? AND organization_id=? AND actor_id=? AND request_key=?').get(siteId,transfer.organization_id,actor.id,key);
   if(existing){
    if(existing.epoch!==transfer.epoch||existing.input!==json(value))reject('IDEMPOTENCY_CONFLICT','Pridėjimo duomenys pasikeitė. Pradėkite naują veiksmą.',409);
    if(existing.state==='failed'){db.prepare("UPDATE directory_client_admissions SET state='pending',due_at=?,error_code=NULL,error_message=NULL WHERE site_id=? AND id=?").run(store.clock(),siteId,existing.id);return get(existing.id);}
    return view(existing);
   }
   if(!capacity)reject('LIMIT','Klientų sąrašo limitas pasiektas.');
   if(db.prepare('SELECT COUNT(*) AS n FROM directory_client_admissions WHERE site_id=?').get(siteId).n>=maxRecords)reject('CAPACITY','Klientų pridėjimo žurnalo talpa pasiekta.',503);
   let account=db.prepare('SELECT id FROM accounts WHERE site_id=? AND email=?').get(siteId,value.email);
   if(!account){account={id:randomId('account')};db.prepare('INSERT INTO accounts(id,site_id,email,name,created_at) VALUES(?,?,?,?,?)').run(account.id,siteId,value.email,value.name,store.clock());}
   store.ensureClient(account.id);
   const id=randomId('client-admission');db.prepare('INSERT INTO directory_client_admissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(siteId,id,transfer.organization_id,transfer.epoch,actor.id,key,account.id,json(value),hash(store,id,account.id,actor.id,value),'pending',null,store.clock(),store.clock(),null,null);
   return get(id);
  }),
  pending:()=>db.prepare("SELECT * FROM directory_client_admissions WHERE site_id=? AND state='pending' AND due_at<=? ORDER BY due_at,id LIMIT 32").all(siteId,store.clock()).map(view),
  applied:(row,result)=>{
   if(result?.id!==row.account_id||result.email!==row.input.email||result.name!==row.input.name)reject('DIRECTORY_CONTEXT_INVALID','Kliento pridėjimo atsakymas nepatvirtintas.',403);
   db.prepare("UPDATE directory_client_admissions SET state='applied',result=?,error_code=NULL,error_message=NULL WHERE site_id=? AND id=? AND state!='applied'").run(json(result),siteId,row.id);return get(row.id);
  },
  failed:(row,error)=>{
   const permanent=error instanceof ApiError&&['FORBIDDEN','UNAUTHENTICATED','INVALID_INPUT','LIMIT','DIRECTORY_CONTEXT_INVALID','IDEMPOTENCY_CONFLICT'].includes(error.code);
   db.prepare("UPDATE directory_client_admissions SET state=?,due_at=?,error_code=?,error_message=? WHERE site_id=? AND id=? AND state!='applied'").run(permanent?'failed':'pending',store.clock()+30000,permanent?error.code:null,permanent?error.message:null,siteId,row.id);return get(row.id);
  },
  nextAt:()=>db.prepare("SELECT MIN(due_at) AS due FROM directory_client_admissions WHERE site_id=? AND state='pending'").get(siteId)?.due??null,
  get,
  envelope:row=>({id:row.id,accountId:row.account_id,requestHash:row.request_hash}),
  result:row=>{if(row.state==='failed')throw new ApiError(row.error_code,row.error_message,row.error_code==='UNAUTHENTICATED'?401:row.error_code==='IDEMPOTENCY_CONFLICT'?409:['FORBIDDEN','DIRECTORY_CONTEXT_INVALID'].includes(row.error_code)?403:400);return {...(row.result||{id:row.account_id,...row.input}),admission:{id:row.id,state:row.state}};}
 };
}

// A business receipt outlives its short transport nonce. Its own actor/input
// binding lets a lost reply recover without creating another link or event.
export function createClientAdmissionReceipts(store){
 const {db,siteId}=store;
 db.exec('CREATE TABLE IF NOT EXISTS organization_client_admissions(site_id TEXT NOT NULL,id TEXT NOT NULL,request_hash TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(site_id,id));');
 return {
  check:(method,actor,input,admission,cache)=>{
   if(!admission)return null;
   if(method!=='createClient'||!actor||Object.keys(admission).some(k=>!['id','accountId','requestHash'].includes(k))||!validId(admission.id)||!validId(admission.accountId)||cache?.recipientId!==admission.accountId||!equal(admission.requestHash,hash(store,admission.id,admission.accountId,actor.id,input)))reject('DIRECTORY_CONTEXT_INVALID','Kliento pridėjimo tapatybė nepatvirtinta.',403);
   const row=db.prepare('SELECT request_hash,result FROM organization_client_admissions WHERE site_id=? AND id=?').get(siteId,admission.id);
   if(row&&row.request_hash!==admission.requestHash)reject('IDEMPOTENCY_CONFLICT','Pridėjimo tapatybė jau panaudota.',409);
   return row?JSON.parse(row.result):null;
  },
  capture:(admission,result)=>{
   if(!admission)return;
   if(result?.id!==admission.accountId)reject('DIRECTORY_CONTEXT_INVALID','Kliento pridėjimo tapatybė nesutampa.',403);
   if(db.prepare('SELECT COUNT(*) AS n FROM organization_client_admissions WHERE site_id=?').get(siteId).n>=maxRecords)reject('CAPACITY','Klientų pridėjimo žurnalo talpa pasiekta.',503);
   db.prepare('INSERT INTO organization_client_admissions VALUES(?,?,?,?)').run(siteId,admission.id,admission.requestHash,json(result));
  }
 };
}
