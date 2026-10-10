import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {core,coreSource,pinCore} from '../release-20261010/pinned-core.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),out=path.resolve(repo,'sites/madbeauty/cloudflare/output/services-release-20261010');
await mkdir(out,{recursive:true});
const phase=process.argv[2];assert.ok(['auth-start','auth-verify','before','build','deploy','after'].includes(phase));
const hash=b=>createHash('sha256').update(b).digest('hex'),json=async f=>JSON.parse(await readFile(path.join(out,f),'utf8'));
async function provider(){
 const token=(await readFile('C:/Users/Lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8')).match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];assert.ok(token);
 const records=[];
 for(const name of ['madbeauty-platform-preview','madbeauty-ui-acceptance-20261009','madbeauty-temporary-test-20261010']){
  const get=async suffix=>{const r=await fetch('https://api.cloudflare.com/client/v4/accounts/d102163f74a45ab6d33bca786ce281ec/workers/'+suffix,{headers:{Authorization:'Bearer '+token}}),v=await r.json();assert.ok(v.success,'Provider status '+r.status);return v.result;};
  records.push({name,settings:await get('scripts/'+name+'/settings'),deployments:await get('scripts/'+name+'/deployments')});
 }return records;
}
async function account(){
 const session=await json('session.private.json');
 const get=async(p,input)=>{const r=await fetch('https://madbeauty.lt/api/madbeauty/'+p,{method:input?'POST':'GET',headers:{cookie:session.cookie,origin:'https://madbeauty.lt',...(input?{'content-type':'application/json','x-csrf-token':session.csrf}:{})},...(input?{body:JSON.stringify(input)}:{})});assert.equal(r.status,200,p);return r.json();};
 const current=await get('session');assert.equal(current.user?.id,session.accountId);
 const recovery=await get('recovery-status');assert.ok(recovery.bookmark);
 const customer=(await get('rpc',{siteId:'madbeauty',method:'workspace',input:{role:'customer'}})).result;
 const catalog=(await get('rpc',{siteId:'madbeauty',method:'catalog',input:{}})).result;
 return {accountId:current.user.id,customer,recovery,catalog};
}
if(phase.startsWith('auth-')){
 const sessionFile=path.join(out,'session.private.json');
 let session;if(phase==='auth-start'){try{await readFile(sessionFile);throw Error('Existing auth attempt; inspect before resending');}catch(e){if(e.code!=='ENOENT')throw e;}session={cookie:'',csrf:''};}else session=await json('session.private.json');
 const send=async(p,body)=>{const r=await fetch('https://madbeauty.lt/api/madbeauty/'+p,{method:body?'POST':'GET',headers:{cookie:session.cookie,origin:'https://madbeauty.lt',...(body?{'content-type':'application/json','x-csrf-token':session.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))session.cookie=r.headers.get('set-cookie').split(';')[0];const v=await r.json();if(v.csrf)session.csrf=v.csrf;await writeFile(sessionFile,JSON.stringify(session));assert.equal(r.status,200,p);return v;};
 await send('session');
 if(phase==='auth-start'){const v=await send('auth/start',{email:'info@pinet.lt'});session.challengeId=v.challengeId;await writeFile(sessionFile,JSON.stringify(session));console.log(JSON.stringify({state:'OWN_AUTH_MAIL_ACCEPTED',attempts:1}));}
 else{const code=(await readFile(path.join(out,'otp.private.txt'),'utf8')).trim();assert.match(code,/^\d{6}$/);const v=await send('auth/verify',{challengeId:session.challengeId,code});assert.equal(v.user.email,'info@pinet.lt');assert.equal(v.operator,true);session.accountId=v.user.id;await writeFile(sessionFile,JSON.stringify(session));console.log(JSON.stringify({state:'OWN_ORDINARY_ACCOUNT_VERIFIED',operator:true}));}
}
if(phase==='before'){
 const records=await provider();assert.equal(records[0].deployments.deployments[0].versions[0].version_id,'c4cd8a88-2c2b-43db-8cf0-7a309549f19a');
 await writeFile(path.join(out,'before.private.json'),JSON.stringify({at:new Date().toISOString(),records,account:await account()},null,2));
 console.log(JSON.stringify({state:'BEFORE_CAPTURED',currentVersion:records[0].deployments.deployments[0].versions[0].version_id,ordinaryAccount:true}));
}
if(phase==='build'){
 const before=await json('before.private.json'),config=JSON.parse(await readFile(path.resolve(repo,'sites/madbeauty/cloudflare/wrangler.production.json'),'utf8'));
 const baseline=before.records[0].settings;assert.equal(config.compatibility_date,baseline.compatibility_date);assert.deepEqual(config.compatibility_flags,baseline.compatibility_flags);
 for(const b of baseline.bindings.filter(b=>b.type==='plain_text'))assert.equal(config.vars[b.name],b.text);
 const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js')));
 const bundle=await build({entryPoints:[path.resolve(repo,'sites/madbeauty/cloudflare/worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[pinCore]}),script=bundle.outputFiles[0].text;
 for(const marker of ['ACCEPTANCE_KEY','HostedSource','qa_mail_captures','NATIVE_CONTENT_CLOCK'])assert.ok(!script.includes(marker));
 const release=JSON.parse(await readFile(path.resolve(repo,'sites/madbeauty/cloudflare/output/content-release-receipt.json'),'utf8'));
 assert.equal(release.packageSha256,'e20c3b95b57ae9f813e55ffd0ef46688a937a7d63fe1c70246a92b8a71e71953');assert.equal(release.approvedPages.length,129);
 config.main='worker.mjs';config.no_bundle=true;config.keep_vars=true;delete config.$schema;config.assets.directory=path.resolve(repo,'sites/madbeauty/cloudflare/output/assets-release');config.observability=baseline.observability;
 const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
 assert.equal(execFileSync('git',['diff','--name-only',sourceCommit,'--','sites/madbeauty/prototype','sites/madbeauty/cloudflare','sites/madbeauty/content','sites/madbeauty/backend'],{cwd:repo,encoding:'utf8'}).trim(),'','Source changes must be committed');
 await writeFile(path.join(out,'worker.mjs'),script);await writeFile(path.join(out,'wrangler.json'),JSON.stringify(config,null,2));
 await writeFile(path.join(out,'manifest.json'),JSON.stringify({sourceCommit,coreSource,artifactSha256:hash(script),packageSha256:release.packageSha256,pages:129,assets:release.assets,previousVersion:before.records[0].deployments.deployments[0].versions[0].version_id},null,2));
 console.log(JSON.stringify({state:'BUILT',sourceCommit,assets:release.assets,artifactSha256:hash(script)}));
}
if(phase==='deploy'){
 const manifest=await json('manifest.json'),proof=await json('native.json');assert.equal(proof.state,'PASS');assert.equal(proof.artifactSha256,manifest.artifactSha256);
 const records=await provider(),before=await json('before.private.json');assert.deepEqual(records,before.records,'Deployment lease changed');
 assert.equal(hash(await readFile(path.join(out,'worker.mjs'))),manifest.artifactSha256);
 assert.equal(execFileSync('git',['diff','--name-only',manifest.sourceCommit,'--','sites/madbeauty/prototype','sites/madbeauty/cloudflare','sites/madbeauty/content','sites/madbeauty/backend'],{cwd:repo,encoding:'utf8'}).trim(),'');
 const cli=path.join(core,'node_modules/wrangler/bin/wrangler.js'),child=spawn(process.execPath,[cli,'deploy','--config',path.join(out,'wrangler.json'),'--keep-vars','--message','Madbeauty illustrated services directory; preserve129e20 data storage and mail'],{cwd:repo,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});await writeFile(path.join(out,'deploy.txt'),output);assert.equal(code,0,'Inspect deploy log before retrying');
 const version=output.match(/Current Version ID: ([a-f0-9-]{36})/)?.[1];assert.ok(version);await writeFile(path.join(out,'deployment.json'),JSON.stringify({at:new Date().toISOString(),state:'DEPLOYED_ACCEPTANCE_PENDING',version,...manifest},null,2));console.log(JSON.stringify({state:'DEPLOYED_ACCEPTANCE_PENDING',version}));
}
if(phase==='after'){
 const before=await json('before.private.json'),records=await provider(),current=await account(),deployment=await json('deployment.json');
 assert.equal(records[0].deployments.deployments[0].versions[0].version_id,deployment.version);
 assert.deepEqual(records[0].settings.bindings,before.records[0].settings.bindings,'All namespaces and variable/secret bindings preserved');
 assert.deepEqual(records[0].settings.observability,before.records[0].settings.observability);
 assert.deepEqual(records.slice(1),before.records.slice(1),'Protected QA and dummy trial preserved');
 assert.equal(current.accountId,before.account.accountId);assert.deepEqual(current.catalog,before.account.catalog);
 for(const k of ['bookings','messages','favorites','clients','inquiries','waitlist'])if(before.account.customer[k])assert.deepEqual(current.customer[k],before.account.customer[k]);
 await writeFile(path.join(out,'after.private.json'),JSON.stringify({at:new Date().toISOString(),records,account:current},null,2));console.log(JSON.stringify({state:'PASS',version:deployment.version,allBindingsPreserved:true,ordinaryAccountPreserved:true,qaAndTrialUnchanged:true}));
}
