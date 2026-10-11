import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {reject} from './primitives.mjs';

const schema=`
CREATE TABLE IF NOT EXISTS facebook_states(state_hash TEXT PRIMARY KEY,site_id TEXT NOT NULL,session_hash TEXT NOT NULL,app_id TEXT NOT NULL,return_path TEXT NOT NULL,intent TEXT NOT NULL,account_id TEXT,expires_at INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0) STRICT;
CREATE TABLE IF NOT EXISTS facebook_pending(session_hash TEXT PRIMARY KEY,site_id TEXT NOT NULL,app_id TEXT NOT NULL,subject_id TEXT NOT NULL,email_hint TEXT NOT NULL,expires_at INTEGER NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS auth_identities(site_id TEXT NOT NULL,provider TEXT NOT NULL,app_id TEXT NOT NULL,subject_id TEXT NOT NULL,account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,PRIMARY KEY(site_id,provider,app_id,subject_id),UNIQUE(site_id,provider,app_id,account_id)) STRICT;
CREATE TABLE IF NOT EXISTS facebook_sessions(session_hash TEXT PRIMARY KEY REFERENCES sessions(token_hash) ON DELETE CASCADE,site_id TEXT NOT NULL,app_id TEXT NOT NULL,subject_id TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS facebook_deletions(code TEXT PRIMARY KEY,site_id TEXT NOT NULL,subject_hash TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(site_id,subject_hash)) STRICT;
CREATE INDEX IF NOT EXISTS facebook_states_expiry ON facebook_states(site_id,expires_at);
CREATE INDEX IF NOT EXISTS facebook_pending_expiry ON facebook_pending(site_id,expires_at);
`;
const id=value=>typeof value==='string'&&/^\d{1,40}$/.test(value);
export function facebookReturnPath(value){
 const p=String(value||'/paskyra');
 if(p.length>1000||!p.startsWith('/')||p.startsWith('//')||/[\\\r\n]/.test(p)||!/^\/(paskyra|meistrui|bendruomene|meistrai|salonai|paieska|rezervuoti)(\/|\?|#|$)/.test(p))return '/paskyra';
 const u=new URL(p,'https://return.invalid');return u.origin==='https://return.invalid'?u.pathname+u.search+u.hash:'/paskyra';
}
export function createFacebookAuth(store,{origin,appId='',appSecret='',graphVersion='v26.0',enabled=false,fetchImpl=fetch}={}){
 const {db,siteId,clock}=store;
 if(!store.facebookSchemaInitialized){db.exec(schema);store.facebookSchemaInitialized=true;}
 const configured=id(appId)&&typeof appSecret==='string'&&appSecret.length>=16&&/^v\d+\.\d+$/.test(graphVersion)&&new URL(origin).protocol==='https:',loginEnabled=configured&&enabled===true;
 const callback=origin+'/api/madbeauty/auth/facebook/callback';
 const ready=(login=true)=>{if(!(login?loginEnabled:configured))reject('FACEBOOK_UNAVAILABLE','Facebook prisijungimas dar neįjungtas. Tęsk el. paštu.',503);};
 const cleanup=()=>{db.prepare('DELETE FROM facebook_states WHERE site_id=? AND expires_at<?').run(siteId,clock()-86400000);db.prepare('DELETE FROM facebook_pending WHERE site_id=? AND expires_at<?').run(siteId,clock());};
 const status=s=>{
  const pending=s?db.prepare('SELECT email_hint,expires_at FROM facebook_pending WHERE site_id=? AND session_hash=? AND expires_at>?').get(siteId,s.token_hash,clock()):null;
  const linked=s?.account_id?!!db.prepare("SELECT account_id FROM auth_identities WHERE site_id=? AND provider='facebook' AND app_id=? AND account_id=?").get(siteId,appId,s.account_id):false;
  return {enabled:loginEnabled,linked,pending:loginEnabled&&!!pending,emailHint:loginEnabled?pending?.email_hint||'':''};
 };
 const start=(s,input={},user=null)=>{
  ready();cleanup();store.limit('facebook-start:'+s.token_hash,10,600);
  const intent=input.intent==='link'?'link':'login';
  if(intent==='link'&&(!user||s.account_id!==user.id||clock()-s.created_at>10*60000))reject('REAUTH_REQUIRED','Pirmiausia prisijunk iš naujo el. pašto kodu.',403);
  const state=randomBytes(32).toString('base64url'),returnPath=facebookReturnPath(input.returnPath);
  store.transaction(()=>{db.prepare('UPDATE facebook_states SET consumed=1 WHERE site_id=? AND session_hash=? AND consumed=0').run(siteId,s.token_hash);db.prepare('DELETE FROM facebook_pending WHERE site_id=? AND session_hash=?').run(siteId,s.token_hash);db.prepare('INSERT INTO facebook_states(state_hash,site_id,session_hash,app_id,return_path,intent,account_id,expires_at) VALUES(?,?,?,?,?,?,?,?)').run(store.hash(state),siteId,s.token_hash,appId,returnPath,intent,intent==='link'?user.id:null,clock()+300000);});
  const u=new URL('https://www.facebook.com/'+graphVersion+'/dialog/oauth');u.search=new URLSearchParams({client_id:appId,redirect_uri:callback,state,scope:'public_profile,email',response_type:'code'}).toString();
  return {url:u.href};
 };
 const graph=async(path,params)=>{
  const response=await fetchImpl('https://graph.facebook.com/'+graphVersion+path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params).toString(),signal:AbortSignal.timeout(15000)});
  if(!response.ok)reject('FACEBOOK_PROVIDER_ERROR','Facebook nepatvirtino prisijungimo. Bandyk dar kartą arba tęsk el. paštu.',502);
  let value;try{value=await response.json();}catch{reject('FACEBOOK_PROVIDER_ERROR','Facebook atsakymo perskaityti nepavyko.',502);}
  if(value.error)reject('FACEBOOK_PROVIDER_ERROR','Facebook nepatvirtino prisijungimo.',502);return value;
 };
 const getGraph=async(path,token,extra={})=>{
  const u=new URL('https://graph.facebook.com/'+graphVersion+path);u.search=new URLSearchParams(extra).toString();
  const response=await fetchImpl(u.href,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
  if(!response.ok)reject('FACEBOOK_PROVIDER_ERROR','Facebook nepatvirtino prisijungimo.',502);
  let value;try{value=await response.json();}catch{reject('FACEBOOK_PROVIDER_ERROR','Facebook atsakymo perskaityti nepavyko.',502);}
  if(value.error)reject('FACEBOOK_PROVIDER_ERROR','Facebook nepatvirtino prisijungimo.',502);return value;
 };
 const attach=(accountId,subject)=>{
  const existing=db.prepare("SELECT account_id FROM auth_identities WHERE site_id=? AND provider='facebook' AND app_id=? AND subject_id=?").get(siteId,appId,subject);
  if(existing&&existing.account_id!==accountId)reject('IDENTITY_CONFLICT','Šis Facebook jau susietas su kita paskyra.',409);
  const other=db.prepare("SELECT subject_id FROM auth_identities WHERE site_id=? AND provider='facebook' AND app_id=? AND account_id=?").get(siteId,appId,accountId);
  if(other&&other.subject_id!==subject)reject('IDENTITY_CONFLICT','Paskyra jau susieta su kitu Facebook. Pirmiausia jį atsiek.',409);
  db.prepare("INSERT OR IGNORE INTO auth_identities(site_id,provider,app_id,subject_id,account_id,created_at) VALUES(?,'facebook',?,?,?,?)").run(siteId,appId,subject,accountId,clock());
 };
 const completeEmail=(s,user)=>{
  const p=db.prepare('SELECT * FROM facebook_pending WHERE site_id=? AND session_hash=? AND expires_at>?').get(siteId,s.token_hash,clock());
  if(!p)return;
  if(!loginEnabled||p.app_id!==appId)reject('FACEBOOK_UNAVAILABLE','Facebook konfigūracija pasikeitė. Prisijunk iš naujo.',409);
  attach(user.id,p.subject_id);db.prepare('DELETE FROM facebook_pending WHERE site_id=? AND session_hash=?').run(siteId,s.token_hash);
 };
 const acceptCallback=async(s,params,auth)=>{
  ready();if(!s||!params.state||params.state.length>200)reject('INVALID_OAUTH_STATE','Facebook sesija nebegalioja. Pradėk iš naujo.',400);
  const state=store.transaction(()=>{const row=db.prepare('SELECT * FROM facebook_states WHERE state_hash=? AND site_id=? AND session_hash=? AND app_id=?').get(store.hash(params.state),siteId,s.token_hash,appId);if(!row||row.consumed||row.expires_at<=clock())reject('INVALID_OAUTH_STATE','Facebook sesija nebegalioja. Pradėk iš naujo.',400);db.prepare('UPDATE facebook_states SET consumed=1 WHERE state_hash=? AND site_id=?').run(row.state_hash,siteId);return row;});
  if(params.error)return {redirect:'/paskyra?facebook=cancelled'};
  if(!params.code||params.code.length>4096)reject('INVALID_INPUT','Facebook patvirtinimo kodas netinkamas.');
  const exchanged=await graph('/oauth/access_token',{client_id:appId,client_secret:appSecret,redirect_uri:callback,code:params.code});
  if(typeof exchanged.access_token!=='string'||exchanged.access_token.length>8192)reject('FACEBOOK_PROVIDER_ERROR','Facebook nepatvirtino prisijungimo.',502);
  const token=exchanged.access_token;
  const debug=await getGraph('/debug_token',appId+'|'+appSecret,{input_token:token}),data=debug.data;
  if(!data?.is_valid||String(data.app_id)!==appId||!id(String(data.user_id||''))||!Number.isFinite(data.expires_at)||data.expires_at*1000<=clock()||data.data_access_expires_at&&data.data_access_expires_at*1000<=clock()||!Array.isArray(data.scopes)||!data.scopes.includes('public_profile'))reject('INVALID_FACEBOOK_TOKEN','Facebook tapatybės patikrinti nepavyko.',403);
  const me=await getGraph('/me',token,{fields:'id,email',appsecret_proof:createHmac('sha256',appSecret).update(token).digest('hex')});
  if(String(me.id)!==String(data.user_id))reject('INVALID_FACEBOOK_TOKEN','Facebook tapatybės patikrinti nepavyko.',403);
  // Re-read the original session after external I/O. Logout/replacement wins.
  const current=db.prepare('SELECT * FROM sessions WHERE site_id=? AND token_hash=? AND expires_at>? AND touched_at>?').get(siteId,s.token_hash,clock(),clock()-1800000);
  if(!current)reject('INVALID_OAUTH_STATE','Sesija pasikeitė. Pradėk iš naujo.',400);
  const subject=String(me.id);
  return store.transaction(()=>{
   if(state.intent==='link'){
    const user=auth.account(current);if(!user||user.id!==state.account_id||clock()-current.created_at>10*60000)reject('REAUTH_REQUIRED','Prisijunk iš naujo el. pašto kodu.',403);
    attach(user.id,subject);return {redirect:state.return_path};
   }
   const linked=db.prepare("SELECT account_id FROM auth_identities WHERE site_id=? AND provider='facebook' AND app_id=? AND subject_id=?").get(siteId,appId,subject);
   if(linked){const result=auth.signIn(current,linked.account_id);db.prepare('INSERT INTO facebook_sessions(session_hash,site_id,app_id,subject_id) VALUES(?,?,?,?)').run(result.session.token_hash,siteId,appId,subject);return {redirect:state.return_path,session:result.session};}
   const emailHint=typeof me.email==='string'&&me.email.length<=254&&/^\S+@\S+\.\S+$/.test(me.email)?me.email.toLowerCase():'';
   db.prepare('INSERT INTO facebook_pending(session_hash,site_id,app_id,subject_id,email_hint,expires_at) VALUES(?,?,?,?,?,?) ON CONFLICT(session_hash) DO UPDATE SET subject_id=excluded.subject_id,email_hint=excluded.email_hint,expires_at=excluded.expires_at,app_id=excluded.app_id').run(s.token_hash,siteId,appId,subject,emailHint,clock()+600000);
   return {redirect:'/paskyra?facebook=verify&grizti='+encodeURIComponent(state.return_path)};
  });
 };
 const unlink=(s,user)=>{
  if(clock()-s.created_at>10*60000)reject('REAUTH_REQUIRED','Prieš atsiedamas prisijunk iš naujo el. pašto kodu.',403);
  return store.transaction(()=>{
   const identity=db.prepare("SELECT subject_id FROM auth_identities WHERE site_id=? AND provider='facebook' AND app_id=? AND account_id=?").get(siteId,appId,user.id);
   if(identity){for(const row of db.prepare('SELECT session_hash FROM facebook_sessions WHERE site_id=? AND app_id=? AND subject_id=?').all(siteId,appId,identity.subject_id))db.prepare('DELETE FROM sessions WHERE site_id=? AND token_hash=?').run(siteId,row.session_hash);db.prepare('DELETE FROM facebook_pending WHERE site_id=? AND app_id=? AND subject_id=?').run(siteId,appId,identity.subject_id);}
   db.prepare("DELETE FROM auth_identities WHERE site_id=? AND provider='facebook' AND app_id=? AND account_id=?").run(siteId,appId,user.id);return {linked:false};
  });
 };
 const signedSubject=raw=>{
  ready(false);if(typeof raw!=='string'||raw.length>16384)reject('INVALID_SIGNATURE','Netinkamas parašas.',403);
  const parts=raw.split('.');if(parts.length!==2||parts.some(p=>!/^[A-Za-z0-9_-]+$/.test(p)))reject('INVALID_SIGNATURE','Netinkamas parašas.',403);
  const sig=Buffer.from(parts[0],'base64url'),expected=createHmac('sha256',appSecret).update(parts[1]).digest();
  if(sig.length!==expected.length||!timingSafeEqual(sig,expected))reject('INVALID_SIGNATURE','Netinkamas parašas.',403);
  let payload;try{payload=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));}catch{reject('INVALID_SIGNATURE','Netinkamas parašas.',403);}
  if(payload.algorithm!=='HMAC-SHA256'||!id(String(payload.user_id||'')))reject('INVALID_SIGNATURE','Netinkamas parašas.',403);
  return String(payload.user_id);
 };
 const removeProviderData=subject=>store.transaction(()=>{
  const sessions=db.prepare('SELECT session_hash FROM facebook_sessions WHERE site_id=? AND app_id=? AND subject_id=?').all(siteId,appId,subject);
  for(const row of sessions)db.prepare('DELETE FROM sessions WHERE site_id=? AND token_hash=?').run(siteId,row.session_hash);
  db.prepare('DELETE FROM facebook_sessions WHERE site_id=? AND app_id=? AND subject_id=?').run(siteId,appId,subject);
  db.prepare("DELETE FROM auth_identities WHERE site_id=? AND provider='facebook' AND app_id=? AND subject_id=?").run(siteId,appId,subject);
  db.prepare('DELETE FROM facebook_pending WHERE site_id=? AND app_id=? AND subject_id=?').run(siteId,appId,subject);
  const subjectHash=store.hash('facebook-delete:'+appId+':'+subject),prior=db.prepare('SELECT code FROM facebook_deletions WHERE site_id=? AND subject_hash=?').get(siteId,subjectHash);
  const code=prior?.code||randomBytes(24).toString('base64url');if(!prior)db.prepare('INSERT INTO facebook_deletions(code,site_id,subject_hash,created_at) VALUES(?,?,?,?)').run(code,siteId,subjectHash,clock());
  return {url:origin+'/api/madbeauty/auth/facebook/deletion-status?code='+code,confirmation_code:code};
 });
 const providerDeletion=raw=>removeProviderData(signedSubject(raw));
 const deletionStatus=code=>{if(!/^[A-Za-z0-9_-]{32}$/.test(String(code||''))||!db.prepare('SELECT code FROM facebook_deletions WHERE site_id=? AND code=?').get(siteId,code))reject('NOT_FOUND','Puslapis nerastas.',404);return {status:'deleted',message:'Facebook paskyros ryšys ir iš jo gauti prisijungimo duomenys pašalinti. Madbeauty paskyros šalinimas yra atskiras veiksmas.'};};
 return {status,start,completeEmail,acceptCallback,unlink,providerDeletion,deletionStatus,cleanup};
}
