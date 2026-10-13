import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {core} from '../release-20261010/pinned-core.mjs';
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js')));
async function load(file){const b=await build({entryPoints:[path.resolve(import.meta.dirname,'../prototype/public',file)],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'browser-root',setup(b){b.onResolve({filter:/^\/[a-z-]+\.mjs$/},a=>({path:path.resolve(import.meta.dirname,'../prototype',a.path.slice(1))}));}}]});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
const {invitation,inviteDialog,invitationAction}=await load('profile-invite.mjs'),{renderAuthEntry}=await load('auth-entry.mjs');
const {accountForm}=await load('account-ui.mjs');
test('Lost cookie recovery clears the consumed challenge, explains the failure and preserves the intended return route',async()=>{
 const calls=[],ctx={authChallenge:{challengeId:'fixture-challenge'},authTarget:'/bendruomene/zmones',state:{session:{role:'guest'}},realAdapter:{authVerify:async()=>{throw Object.assign(Error('Fixture session recovery <safe>'),{code:'AUTH_SESSION_NOT_PERSISTED'});}},render:async()=>calls.push('render'),navigate:async()=>calls.push('navigate')};
 const fd=new FormData();fd.set('code','123456');await accountForm(ctx,{id:'email-verify'},fd);assert.equal(ctx.authChallenge,null);assert.equal(ctx.authTarget,'/bendruomene/zmones');assert.deepEqual(calls,['render']);assert.equal(ctx.state.session.role,'guest');const html=renderAuthEntry({...ctx,media:new Map()});assert.match(html,/role="alert"/);assert.match(html,/Fixture session recovery &lt;safe&gt;/);assert.match(html,/id="email-start"/);assert.ok(!html.includes('id="email-verify"'));
});
test('Confirmed cookie-backed login returns to the requested route and removes the recovery notice',async()=>{
 let target;const ctx={authChallenge:{challengeId:'fixture-challenge'},authTarget:'/bendruomene/zmones',authNotice:'Old failure',state:{afterAuth:'old',session:{}},realAdapter:{authVerify:async()=>({user:{id:'fixture-user'},organizations:[]})},navigate:async path=>target=path};const fd=new FormData();fd.set('code','123456');await accountForm(ctx,{id:'email-verify'},fd);assert.equal(target,'/bendruomene/zmones');assert.equal(ctx.authChallenge,null);assert.equal(ctx.authNotice,null);assert.equal(ctx.state.session.clientId,'fixture-user');
});
const profile={id:'real-org-1',name:'Meistras <Jonas>',kind:'solo',approved:true},ctx={media:new Map()};
test('Invitations share only an approved public provider URL, never incoming private query/hash or a foreign origin',()=>{
 const d=invitation(profile,'https://madbeauty.lt/paskyra?token=private#secret');assert.equal(d.url,'https://madbeauty.lt/meistrai/real-org-1');assert.equal(new URL(d.facebook).searchParams.get('u'),d.url);assert.ok(!d.facebook.includes('private'));
 assert.equal(invitation({...profile,kind:'salon'},'https://bandymas.madbeauty.lt').url,'https://bandymas.madbeauty.lt/salonai/real-org-1');
 assert.throws(()=>invitation({...profile,approved:false},'https://madbeauty.lt'));assert.throws(()=>invitation(profile,'https://evil.invalid'));
 const html=inviteDialog(ctx,d);assert.match(html,/rel="noopener noreferrer"/);assert.match(html,/readonly/);assert.ok(!html.includes('invite-device'));
});
test('Opening invitation never sends a message; copy failure and device-share cancellation are recoverable',async()=>{
 const events=[],c={...ctx,currentProfile:profile,openDialog:(...a)=>events.push(['dialog',...a]),toast:t=>events.push(['toast',t])};let copied='',shared=0;
 const nav={clipboard:{writeText:async t=>{copied=t;}},share:async()=>{shared++;throw Object.assign(Error(),{name:'AbortError'});}},options={navigator:nav,origin:'https://madbeauty.lt'};
 await invitationAction(c,'invite-profile',options);assert.equal(copied,'');assert.equal(shared,0);
 await invitationAction(c,'invite-copy',options);assert.equal(copied,c.invitation.url);
 const count=events.length;await invitationAction(c,'invite-device',options);assert.equal(shared,1);assert.equal(events.length,count);
 await invitationAction(c,'invite-copy',{...options,navigator:{clipboard:{writeText:async()=>{throw Error('denied');}}}});assert.match(events.at(-1)[1],/Pažymėk nuorodą/);
});
test('Registration and login retain verified email-only forms; code screen escapes account data and keeps native OTP affordances',()=>{
 const login=renderAuthEntry(ctx),registration=renderAuthEntry({...ctx,authMode:'register'});assert.match(login,/id="email-start"/);assert.match(registration,/Registruotis el. paštu/);assert.ok(!registration.includes('type="password"'));assert.ok(!login.includes('facebook-login'));
 const code=renderAuthEntry({...ctx,authChallenge:{email:'<bad>@example.com',testCode:'123456'},temporaryTest:true});assert.match(code,/&lt;bad&gt;@example.com/);assert.match(code,/autocomplete="one-time-code"/);assert.match(code,/maxlength="6"/);assert.match(code,/data-draft="off"/);assert.match(code,/email-resend/);assert.match(code,/Bandymo kodas/);
});
