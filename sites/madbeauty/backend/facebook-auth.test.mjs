import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {openStore} from './store.mjs';
import {createAuth} from './auth.mjs';
import {createFacebookAuth,facebookReturnPath} from './facebook-auth.mjs';

function fixture(t,overrides={}){
 let now=Date.parse('2026-10-11T09:00:00Z');const store=openStore({filename:':memory:',clock:()=>now});t.after(()=>store.close());
 const cfg={origin:'https://madbeauty.lt',appId:'123456789',appSecret:'fixture-only-facebook-secret-32-bytes',enabled:true,...overrides};
 let subject='34567890',meEmail='hint@example.com',valid=true,debugApp=cfg.appId,expiry=now/1000+3600;
 const calls=[];
 const fetchImpl=async(url,init)=>{calls.push(new URL(url).pathname);if(url.endsWith('/oauth/access_token'))return Response.json({access_token:'fixture-user-token'});if(new URL(url).pathname.endsWith('/debug_token'))return Response.json({data:{is_valid:valid,app_id:debugApp,user_id:subject,expires_at:expiry,scopes:['public_profile','email']}});if(new URL(url).pathname.endsWith('/me'))return Response.json({id:subject,...(meEmail?{email:meEmail}:{})});throw Error('Unexpected provider URL');};
 const fb=createFacebookAuth(store,{...cfg,fetchImpl}),auth=createAuth(store,{onVerifiedEmail:fb.completeEmail});
 const email=(s,address)=>{const c=auth.start(s,address,'fixture');return auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'fixture');};
 const begin=(s,input={})=>new URL(fb.start(s,input,auth.account(s)).url).searchParams.get('state');
 const callback=(s,state)=>fb.acceptCallback(s,{state,code:'fixture-code'},auth);
 const signed=()=>{const raw=Buffer.from(JSON.stringify({algorithm:'HMAC-SHA256',user_id:subject})).toString('base64url');return createHmac('sha256',cfg.appSecret).update(raw).digest('base64url')+'.'+raw;};
 return {store,auth,fb,cfg,calls,email,begin,callback,signed,setNow:value=>now=value,advance:ms=>now+=ms,setSubject:value=>subject=value,setEmail:value=>meEmail=value,setValid:value=>valid=value,setApp:value=>debugApp=value,setExpiry:value=>expiry=value};
}

test('unconfigured Facebook remains unavailable and return paths reject redirects',t=>{
 const f=fixture(t,{enabled:false}),s=f.auth.session(null);assert.equal(f.fb.status(s).enabled,false);assert.throws(()=>f.begin(s),{code:'FACEBOOK_UNAVAILABLE'});
 for(const p of ['https://evil.invalid','//evil.invalid','/\\evil.invalid','/paskyra\r\nLocation: x','/unknown'])assert.equal(facebookReturnPath(p),'/paskyra');
 assert.equal(facebookReturnPath('/bendruomene?miestas=Vilnius'),'/bendruomene?miestas=Vilnius');
});
test('first Facebook callback never creates or merges account before email confirmation',async t=>{
 const f=fixture(t),s=f.auth.session(null),existing=f.email(f.auth.session(null),'hint@example.com');
 const state=f.begin(s,{returnPath:'/bendruomene'}),result=await f.callback(s,state);
 assert.match(result.redirect,/facebook=verify/);assert.equal(f.fb.status(s).emailHint,'hint@example.com');assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM auth_identities').get().n,0);
 assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,1);
 const verified=f.email(s,'hint@example.com');assert.equal(verified.user.id,existing.user.id);assert.equal(f.fb.status(verified.session).linked,true);
 assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM auth_identities').get().n,1);assert.equal(f.auth.session(s.token,{create:false}),null);
});
test('linked login rotates session and signs in the actual existing account without a new OTP',async t=>{
 const f=fixture(t),first=f.auth.session(null);await f.callback(first,f.begin(first));const linked=f.email(first,'client@example.com');
 const s=f.auth.session(null),result=await f.callback(s,f.begin(s,{returnPath:'/paskyra/vizitai'}));
 assert.equal(result.redirect,'/paskyra/vizitai');assert.equal(f.auth.account(result.session).id,linked.user.id);assert.equal(f.auth.account(result.session).operator,0);assert.equal(f.auth.session(s.token,{create:false}),null);assert.ok(result.session.token);
});
test('OAuth state rejects a different session, replay and expiry',async t=>{
 const f=fixture(t),s=f.auth.session(null),other=f.auth.session(null),state=f.begin(s);
 await assert.rejects(f.callback(other,state),{code:'INVALID_OAUTH_STATE'});await f.callback(s,state);await assert.rejects(f.callback(s,state),{code:'INVALID_OAUTH_STATE'});
 const next=f.begin(s);f.advance(300001);await assert.rejects(f.callback(s,next),{code:'INVALID_OAUTH_STATE'});
});
test('wrong app, invalid token and expired token never create a pending identity',async t=>{
 const f=fixture(t),s=f.auth.session(null);f.setApp('999');await assert.rejects(f.callback(s,f.begin(s)),{code:'INVALID_FACEBOOK_TOKEN'});f.setApp(f.cfg.appId);f.setValid(false);await assert.rejects(f.callback(s,f.begin(s)),{code:'INVALID_FACEBOOK_TOKEN'});f.setValid(true);f.setExpiry(1);await assert.rejects(f.callback(s,f.begin(s)),{code:'INVALID_FACEBOOK_TOKEN'});assert.equal(f.fb.status(s).pending,false);
});
test('Facebook missing email still requires a real verified email',async t=>{
 const f=fixture(t),s=f.auth.session(null);f.setEmail(null);await f.callback(s,f.begin(s));assert.equal(f.fb.status(s).emailHint,'');assert.equal(f.fb.status(s).pending,true);
 const result=f.email(s,'actual@example.com');assert.equal(f.fb.status(result.session).linked,true);
});
test('explicit link rejects a subject belonging to a different account atomically',async t=>{
 const f=fixture(t),s=f.auth.session(null);await f.callback(s,f.begin(s));const a=f.email(s,'one@example.com'),b=f.email(f.auth.session(null),'two@example.com');
 await assert.rejects(f.callback(b.session,f.begin(b.session,{intent:'link'})),{code:'IDENTITY_CONFLICT'});assert.equal(f.fb.status(b.session).linked,false);assert.equal(f.fb.status(a.session).linked,true);
});
test('logout during provider exchange invalidates original OAuth session',async t=>{
 const f=fixture(t),s=f.auth.session(null),state=f.begin(s);f.auth.logout(s);await assert.rejects(f.callback(s,state),{code:'INVALID_OAUTH_STATE'});assert.equal(f.fb.status(s).pending,false);
});
test('cancelled permission is consumed and allows independent email login',async t=>{
 const f=fixture(t),s=f.auth.session(null),state=f.begin(s);assert.equal((await f.fb.acceptCallback(s,{state,error:'access_denied'},f.auth)).redirect,'/paskyra?facebook=cancelled');assert.equal(f.calls.length,0);assert.ok(f.email(s,'cancelled@example.com').user.id);
});
test('deletion verifies signature, is idempotent, and preserves platform email account',async t=>{
 const f=fixture(t),s=f.auth.session(null);await f.callback(s,f.begin(s));const first=f.email(s,'client@example.com');const guest=f.auth.session(null),login=await f.callback(guest,f.begin(guest));
 assert.throws(()=>f.fb.providerDeletion('bad.payload'),{code:'INVALID_SIGNATURE'});assert.equal(f.fb.status(first.session).linked,true);
 const signed=f.signed(),receipt=f.fb.providerDeletion(signed);assert.deepEqual(f.fb.providerDeletion(signed),receipt);assert.equal(f.fb.deletionStatus(receipt.confirmation_code).status,'deleted');assert.equal(f.fb.status(first.session).linked,false);assert.ok(f.auth.account(first.session));assert.equal(f.auth.session(login.session.token,{create:false}),null);
 assert.throws(()=>f.fb.deletionStatus('unknown'),{code:'NOT_FOUND'});
});
test('fresh explicit link and unlink preserve email access, stale session requires reauthentication',async t=>{
 const f=fixture(t),login=f.email(f.auth.session(null),'owner@example.com');await f.callback(login.session,f.begin(login.session,{intent:'link'}));assert.equal(f.fb.status(login.session).linked,true);assert.deepEqual(f.fb.unlink(login.session,login.user),{linked:false});assert.ok(f.auth.account(login.session));f.advance(600001);assert.throws(()=>f.begin(login.session,{intent:'link'}),{code:'REAUTH_REQUIRED'});
});
test('login kill switch does not block signed provider data deletion',t=>{
 const f=fixture(t,{enabled:false});assert.equal(f.fb.status(f.auth.session(null)).enabled,false);assert.equal(f.fb.deletionStatus(f.fb.providerDeletion(f.signed()).confirmation_code).status,'deleted');
});
