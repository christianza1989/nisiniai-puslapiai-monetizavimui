'use strict';
// Loopback-only account adapter. Hosted auth is a separate deployment contract.
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomBytes,scrypt,timingSafeEqual,createHash}=require('node:crypto');
const {promisify}=require('node:util');
const derive=promisify(scrypt);
const hash=value=>createHash('sha256').update(value).digest('hex');
function createAccounts({storePath,origin,prefix}){
 if(!['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname))throw Error('Account preview must be loopback');
 let queue=Promise.resolve();const rates=new Map();
 const empty=()=>({version:1,users:[],sessions:[]});
 async function load(){try{const db=JSON.parse(await fs.readFile(storePath,'utf8'));if(db.version!==1||!Array.isArray(db.users)||!Array.isArray(db.sessions))throw Error('Invalid account store');return db;}catch(e){if(e.code==='ENOENT')return empty();throw e;}}
 async function save(db){await fs.mkdir(path.dirname(storePath),{recursive:true});const temp=storePath+'.'+randomBytes(8).toString('hex')+'.tmp';await fs.writeFile(temp,JSON.stringify(db),{mode:0o600});await fs.rename(temp,storePath);}
 function transaction(fn){const run=queue.then(async()=>{const db=await load();db.sessions=db.sessions.filter(s=>s.expires>Date.now());const result=await fn(db);await save(db);return result;});queue=run.catch(()=>{});return run;}
 function respond(res,status,data,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(JSON.stringify(data));}
 function cookie(token,maxAge=28800){return `pb_session=${token}; HttpOnly; SameSite=Strict; Path=${prefix}; Max-Age=${maxAge}`;}
 function sessionToken(req){return /(?:^|;\s*)pb_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];}
 async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>4096)throw Object.assign(Error('Request is too large.'),{status:413});}try{return JSON.parse(text);}catch(_){throw Object.assign(Error('Use a valid JSON request.'),{status:400});}}
 function limited(key){const now=Date.now();for(const [id,r]of rates)if(r.until<now)rates.delete(id);const r=rates.get(key)||{count:0,until:now+600000};r.count++;rates.set(key,r);return r.count>20;}
 const publicUser=user=>({email:user.email,createdAt:user.createdAt});
 async function issue(db,user){const token=randomBytes(32).toString('hex');db.sessions.push({digest:hash(token),userId:user.id,expires:Date.now()+28800000});db.sessions=db.sessions.slice(-2000);return {token,user:publicUser(user)};}
 return async function handle(req,res,url){
  if(!url.startsWith(prefix+'api/account/'))return false;
  const endpoint=url.slice((prefix+'api/account/').length);
  if(req.headers.host!==new URL(origin).host){respond(res,403,{error:'This account service is only available on its local preview origin.'});return true;}
  try{
   if(endpoint==='session'&&req.method==='GET'){
    const token=sessionToken(req);const db=await load();const session=token&&db.sessions.find(s=>s.digest===hash(token)&&s.expires>Date.now());const user=session&&db.users.find(u=>u.id===session.userId);
    respond(res,200,{user:user?publicUser(user):null,mode:'local-preview'});return true;
   }
   if(req.method!=='POST'){respond(res,405,{error:'Method not allowed.'},{Allow:'POST'});return true;}
   if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){respond(res,403,{error:'Open the form on this website and try again.'});return true;}
   if(endpoint==='logout'){const token=sessionToken(req);if(token)await transaction(db=>{db.sessions=db.sessions.filter(s=>s.digest!==hash(token));});respond(res,200,{ok:true},{'Set-Cookie':cookie('',0)});return true;}
   if(!['register','login'].includes(endpoint)){respond(res,404,{error:'Account action not found.'});return true;}
   if(limited(req.socket.remoteAddress||'local')){respond(res,429,{error:'Too many attempts. Please wait ten minutes and try again.'},{'Retry-After':'600'});return true;}
   const payload=await body(req);if(!payload||typeof payload!=='object'||Array.isArray(payload)){respond(res,400,{error:'Enter a valid email and password.'});return true;}const email=typeof payload.email==='string'?payload.email.trim().toLowerCase():'';const password=payload.password;
   if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string'||password.length>128){respond(res,400,{error:'Enter a valid email and password.'});return true;}
   if(endpoint==='register'){
    if(password.length<12){respond(res,400,{error:'Use at least 12 characters for your password.'});return true;}
    const salt=randomBytes(16).toString('hex');const derived=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:67108864});
    const result=await transaction(async db=>{if(db.users.some(u=>u.email===email))throw Object.assign(Error('An account already uses this email. Sign in or contact support.'),{status:409});const user={id:randomBytes(16).toString('hex'),email,salt,passwordHash:derived.toString('hex'),createdAt:new Date().toISOString()};db.users.push(user);return issue(db,user);});
    respond(res,201,{user:result.user,mode:'local-preview'},{'Set-Cookie':cookie(result.token)});return true;
   }
   const db=await load();const user=db.users.find(u=>u.email===email);const derived=await derive(password,user?.salt||'00000000000000000000000000000000',64,{N:32768,r:8,p:1,maxmem:67108864});
   if(!user||!timingSafeEqual(derived,Buffer.from(user.passwordHash,'hex'))){respond(res,401,{error:'The email or password does not match. Try again or contact support.'});return true;}
   const result=await transaction(db=>issue(db,user));respond(res,200,{user:result.user,mode:'local-preview'},{'Set-Cookie':cookie(result.token)});return true;
  }catch(e){respond(res,e.status||503,{error:e.status?e.message:'Account service is temporarily unavailable. Try again.'});return true;}
 };
}
module.exports={createAccounts};
