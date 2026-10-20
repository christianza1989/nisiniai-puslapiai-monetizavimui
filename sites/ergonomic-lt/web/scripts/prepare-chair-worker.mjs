// Distinct articles, distinct newly inserted source item IDs and per-code
// checkpoints. Workers never mutate a live app registry, active index or DB.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const worker=Number(option('worker','0')),workers=Number(option('workers','2'));
const only=option('article',''),validateExisting=process.argv.includes('--validate-existing');
const convertExisting=process.argv.includes('--convert-existing');
assert(!(validateExisting&&convertExisting),'Choose one existing-data verification mode');
assert(Number.isInteger(worker)&&worker>=0&&worker<workers&&workers<=2,'At most two owned acquisition workers');
const root=path.resolve('../research/configurator/all-chairs-20261014');
const selection=path.join(root,'selection-available.json');
const data=JSON.parse(fs.readFileSync(selection,'utf8'));
const records=data.products.flatMap(product=>product.articles.map(article=>({product,article})));
const source=path.join(root,'source-v3'),prepared=path.join(root,'prepared-v3'),logs=path.join(root,'logs-v3'),states=path.join(root,'status-v4'),locks=path.join(root,'article-locks');
for(const folder of [states,locks,prepared,logs])fs.mkdirSync(folder,{recursive:true});
function save(file,value){const temporary=file+'.tmp-'+process.pid;fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');fs.renameSync(temporary,file);}
function alive(pid){try{process.kill(pid,0);return true;}catch{return false;}}
function acquire(code){
 const file=path.join(locks,code+'.json');
 if(fs.existsSync(file)){
  const prior=JSON.parse(fs.readFileSync(file,'utf8'));if(alive(prior.pid))return;
  fs.renameSync(file,path.join(locks,code+'-stale-'+Date.now()+'.json'));
 }
 try{const fd=fs.openSync(file,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,code,worker,createdAt:new Date().toISOString()}));fs.closeSync(fd);return file;}catch(error){if(error.code==='EEXIST')return;throw error;}
}
function run(executable,args,log){const fd=fs.openSync(path.join(logs,log),'a');try{
 const result=spawnSync(executable,args,{cwd:process.cwd(),env:{...process.env,PYTHONUTF8:'1'},stdio:['ignore',fd,fd]});
 if(result.error)throw result.error;if(result.status!==0)throw Error(log+' exited '+result.status);
}finally{fs.closeSync(fd);}}
const deferred=[];
function prepare({product,article}){
 const code=article.code,file=path.join(states,code+'.json');
 if(fs.existsSync(file)){const prior=JSON.parse(fs.readFileSync(file,'utf8'));if(prior.phase==='verified'&&prior.recipe==='source-v4-materials-labels-identity'&&!(only&&(validateExisting||convertExisting)))return;}
 const deferredFile=path.join(root,'deferred-for-final-pass-20261015.json');
 if(!process.argv.includes('--include-deferred')&&fs.existsSync(deferredFile)){
  const policy=JSON.parse(fs.readFileSync(deferredFile,'utf8'));
  if(policy.codes.includes(code)){deferred.push(code);console.log('DEFERRED TO FINAL PASS',code);return;}
 }
 const lock=acquire(code);if(!lock){deferred.push(code);console.log('DEFERRED',code);return;}
 const state={productId:product.productId,code,worker,pid:process.pid,recipe:'source-v4-materials-labels-identity',phase:'capture',startedAt:new Date().toISOString()};
 const phase=value=>{state.phase=value;save(file,state);};phase('capture');
 try{
  console.log(validateExisting?'VALIDATE EXISTING':'CAPTURE',code,product.id);
  const capture=['../collect_catalog_configurators.py','--obx',path.join(root,'own-public-session.obx'),'--selection',selection,'--output',source,'--atomic-restore','--article',code];
  if(['KCAF010WW001','KCAF011WW001'].includes(code))capture.push('--constructor-closure');
  if(!validateExisting){if(!convertExisting){run(path.resolve('../.venv/Scripts/python.exe'),[...capture,'--capture'],code+'-v4-capture.log');
  phase('plan');run(process.execPath,['scripts/replan-additional-chair-components.mjs','--article='+code],code+'-v4-plan.log');
  phase('dependencies');run(path.resolve('../.venv/Scripts/python.exe'),[...capture,'--components'],code+'-v4-components.log');
  }
  phase('convert');
  run(process.execPath,['scripts/prepare-catalog-configurators.mjs','--selection='+selection,'--source='+source,'--article='+code,'--target=public/models/configurator/all-chairs-v3','--checkpoint='+path.join(root,'checkpoints-v3'),'--output='+path.join(prepared,code+'.json'),'--fixtures='+path.join(prepared,code+'-fixtures.json'),'--report='+path.join(prepared,code+'-verification.json'),'--write-partial','--recipe=all-chairs-authoritative-source-v3'],code+'-v4-prepare.log');
  }
  phase('validate-materials-rules');
  const candidate=path.join(root,'candidates-v4',code);
  run(process.execPath,['--import','tsx','scripts/stage-additional-chair-runtime.ts','--article='+code,'--stage='+candidate],code+'-v4-stage.log');
  phase('validate-model-binding');
  run(process.execPath,['--import','tsx','scripts/verify-additional-runtime-integration.ts','--stage='+candidate],code+'-v4-models.log');
  const receipt=JSON.parse(fs.readFileSync(path.join(candidate,'report.json'),'utf8'));
  state.anchors=receipt.checks[0].anchors;state.models=receipt.modelSamples;state.candidate=candidate;
  state.finishedAt=new Date().toISOString();phase('verified');console.log('VERIFIED',code,state.anchors,state.models);
 }catch(error){state.reason=error.message;state.finishedAt=new Date().toISOString();phase('needs-review');console.log('REVIEW',code,state.reason);}
 finally{const current=JSON.parse(fs.readFileSync(lock,'utf8'));assert.equal(current.pid,process.pid);fs.unlinkSync(lock);}
}
for(const [index,record] of records.entries())if(only?record.article.code===only:index%workers===worker)prepare(record);
save(path.join(root,'worker-'+worker+(only?'-'+only:'')+'-completion.json'),{completedAt:new Date().toISOString(),worker,deferred});
console.log('WORKER FINISHED',worker,'deferred',deferred.length);
