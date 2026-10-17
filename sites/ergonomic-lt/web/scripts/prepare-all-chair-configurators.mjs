// Resumable, sequential acquisition/conversion of the owner's published chair
// allowlist. No credentials, gatekeeper calls, live-site proxy or deployment.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve('../research/configurator/all-chairs-20261014');
const selection=path.join(root,'selection-available.json');
const data=JSON.parse(fs.readFileSync(selection,'utf8'));
const source=path.join(root,'source-v3'),prepared=path.join(root,'prepared-v3'),logs=path.join(root,'logs-v3');
for(const dir of [prepared,logs])fs.mkdirSync(dir,{recursive:true});
const python=path.resolve('../.venv/Scripts/python.exe');
const collector=path.resolve('../collect_catalog_configurators.py');
const obx=path.join(root,'own-public-session.obx');
const statusFile=path.join(root,'preparation-status-v3.json');
const status=fs.existsSync(statusFile)?JSON.parse(fs.readFileSync(statusFile,'utf8')):{startedAt:new Date().toISOString(),articles:{}};
function save(){const temp=statusFile+'.tmp';fs.writeFileSync(temp,JSON.stringify(status,null,2)+'\n');fs.renameSync(temp,statusFile);}
function run(executable,args,log){const fd=fs.openSync(path.join(logs,log),'a');try{const result=spawnSync(executable,args,{cwd:process.cwd(),env:{...process.env,PYTHONUTF8:'1'},stdio:['ignore',fd,fd]});if(result.error)throw result.error;if(result.status!==0)throw Error(log+' exited '+result.status);}finally{fs.closeSync(fd);}}
const captureArgs=['--obx',obx,'--selection',selection,'--output',source,'--atomic-restore'];
for(const product of data.products)for(const article of product.articles){
 const key=article.code,prior=status.articles[key];
 if(prior?.phase==='verified'&&fs.existsSync(path.join(prepared,key+'.json')))continue;
 const entry=status.articles[key]={productId:product.productId,code:key,phase:'capture',startedAt:new Date().toISOString()};save();
 try{
  console.log('CAPTURE',key,product.id);
  run(python,[collector,...captureArgs,'--article',key,'--capture'],key+'-capture.log');
  entry.phase='plan';save();
  run(process.execPath,['scripts/plan-catalog-configurators.mjs','--selection='+selection,'--source='+source,'--article='+key],key+'-plan.log');
  entry.phase='dependencies';save();
  run(python,[collector,...captureArgs,'--article',key,'--components'],key+'-components.log');
  entry.phase='convert';save();
  run(process.execPath,['scripts/prepare-catalog-configurators.mjs','--selection='+selection,'--source='+source,'--article='+key,'--target=public/models/configurator/all-chairs-v3','--checkpoint='+path.join(root,'checkpoints-v3'),'--output='+path.join(prepared,key+'.json'),'--fixtures='+path.join(prepared,key+'-fixtures.json'),'--report='+path.join(prepared,key+'-verification.json'),'--write-partial','--recipe=all-chairs-authoritative-source-v3'],key+'-prepare.log');
  const verification=JSON.parse(fs.readFileSync(path.join(prepared,key+'-verification.json'),'utf8'));
  if(!verification.length||verification.some(v=>!v.passed))throw Error('Missing or failed composite geometry verification');
  entry.phase='validate-rules';save();
  run(process.execPath,['--import','tsx','scripts/verify-additional-chair-data.ts','--article='+key,'--folder='+prepared],key+'-rules.log');
  entry.phase='verified';entry.anchors=verification.length;entry.finishedAt=new Date().toISOString();console.log('VERIFIED',key,entry.anchors);
 }catch(error){entry.phase='needs-review';entry.reason=String(error.message);entry.finishedAt=new Date().toISOString();console.log('REVIEW',key,entry.reason);}
 save();
}
status.finishedAt=new Date().toISOString();save();
console.log(JSON.stringify({verified:Object.values(status.articles).filter(a=>a.phase==='verified').length,needsReview:Object.values(status.articles).filter(a=>a.phase==='needs-review').length}));
