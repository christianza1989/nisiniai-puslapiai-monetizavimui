import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';

const repo=path.resolve(import.meta.dirname,'../../..');
const root=path.join(repo,'sites/madbeauty/cloudflare/output/autonomous-private');
const evidence=path.join(import.meta.dirname,'acceptance');
const json=async name=>JSON.parse(await readFile(path.join(root,name)));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const admission=JSON.parse(await readFile(new URL('ADMISSION.json',import.meta.url)));
const manifest=await json('manifest.json'),before=await json('provider-before.json'),after=await json('provider-after.json');
assert.equal(before.state,'PASS');assert.equal(after.state,'PASS');assert.deepEqual(before.config,after.config);
assert.equal(before.currentDeployment.versions[0].version_id,'1de389a7-3f36-44f5-ad57-bb3a457f2146');
const deployLog=await readFile(path.join(root,'production-deploy.log'),'utf8');
const version=deployLog.match(/Current Version ID:\s*([a-f0-9-]{36})/)?.[1];
assert.ok(version);assert.equal(after.currentDeployment.versions[0].version_id,version);
assert.equal(after.currentDeployment.versions.length,1);assert.equal(after.currentDeployment.versions[0].percentage,100);
assert.match(after.currentDeployment.annotations['workers/message'],/content-only autonomous articles/);
assert.equal(manifest.packageSha256,admission.packageSha256);
assert.equal(hash(await readFile(path.join(root,'production-worker.mjs'))),manifest.productionArtifactSha256);
const acceptance={};
let contentComparison;
for(const mode of ['native','hosted','live-before','live-after']){
  const name=mode+'-proof.json',bytes=await readFile(path.join(root,name)),p=JSON.parse(bytes);
  assert.equal(p.state,'PASS');assert.equal(p.packageSha256,manifest.packageSha256);
  assert.equal(p.runtimeSource,manifest.runtimeSource);assert.equal(p.coreSource,manifest.coreSource);
  assert.equal(p.artifactSha256,mode.startsWith('live')?manifest.productionArtifactSha256:manifest.qaArtifactSha256);
  assert.deepEqual(p.currentProjection,mode==='live-before'?{pages:7,futureBlocked:62,assets:379,served:129,blocked:250}:{pages:7,futureBlocked:62,assets:434,served:129,blocked:305});
  assert.equal(p.publicationCases.length,['native','hosted'].includes(mode)?124:0);
  assert.equal(p.contentComparison.oldPages,58);assert.equal(p.contentComparison.oldSnapshotsUnchanged,true);
  assert.equal(p.contentComparison.newApprovedPages,11);assert.equal(p.contentComparison.specialistExcluded,0);
  contentComparison=p.contentComparison;
  await copyFile(path.join(root,name),path.join(evidence,name));
  acceptance[mode]={at:p.at,finishedAt:p.finishedAt,state:p.state,publicationStates:p.publicationCases.length,gateChecks:p.gateChecks.length,...p.currentProjection,receiptSha256:hash(bytes)};
}
const browserBytes=await readFile(path.join(evidence,'browser-views.json')),browser=JSON.parse(browserBytes);
assert.equal(browser.packageSha256,manifest.packageSha256);assert.equal(browser.views.length,6);
assert.equal(new Set(browser.views.map(v=>v.url+'@'+v.viewport.width)).size,6);
for(const view of browser.views){
  assert.equal(new URL(view.url).origin,'https://madbeauty.lt');assert.ok([390,1440].includes(view.viewport.width));
  assert.ok(view.document<=view.viewport.width);assert.ok(view.main<=view.viewport.width);
  if(view.documentClient!==undefined)assert.equal(view.document,view.documentClient);
  if(view.url.endsWith('/'+admission.representativeFutureSlug)){assert.equal(view.heading,'Puslapis nerastas');assert.equal(view.images,0);}
  else{assert.ok(view.images.every(i=>i.complete&&i.naturalWidth>0));}
  if(view.url.endsWith('/kas-ieina-i-manikiuro-kaina'))assert.equal(view.times[0].date,'2026-10-06T17:09:24.272Z');
  if(view.url.endsWith('/gidai'))assert.equal(new Set(view.guideLinks).size,3);
}
const require=createRequire(path.join(repo,'../dovanos-memorycasting/package.json')),sharp=require('sharp');
const screenshots=[];
for(const name of (await readdir(evidence)).filter(n=>n.endsWith('.jpg')).sort()){
  const bytes=await readFile(path.join(evidence,name)),meta=await sharp(bytes).metadata();
  assert.equal(meta.format,'jpeg');assert.ok(meta.width>0&&meta.height>0);
  screenshots.push({name,sha256:hash(bytes),format:meta.format,width:meta.width,height:meta.height});
}
assert.equal(screenshots.length,7);
const productionBinding=after.config.bindings.find(b=>b.name==='PLATFORM');
assert.equal(productionBinding.namespaceId,'2faf96eedef1425c8d4fc07444cde2f3');
assert.equal(productionBinding.className,'MadbeautyPlatform');assert.equal(after.config.migrationTag,'v1');
assert.ok(!after.config.bindings.some(b=>b.name==='ORG_STAGING'));
const receipt={
  recordedAt:new Date().toISOString(),state:'canonical-autonomous-agent-content-release-accepted',domain:'https://madbeauty.lt',
  releaseSource:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),
  runtimeSource:manifest.runtimeSource,coreSource:manifest.coreSource,packageSource:manifest.packageSource,
  packageSha256:manifest.packageSha256,
  rendererSha256:manifest.rendererSha256,producerReviewedRendererSha256:manifest.producerReviewedRendererSha256,
  productionArtifactSha256:manifest.productionArtifactSha256,productionVersion:version,previousProductionVersion:before.currentDeployment.versions[0].version_id,
  deployedAt:after.currentDeployment.created_on,fullPlatformUpgradeDeployed:false,
  package:{pages:69,guides:65,newApprovedGuides:11,unchangedApprovedPages:58,unchangedMedia:275,newMedia:55,totalMedia:330,publicPages:7,futureGuides:62,specialistDraftsExcluded:0,firstNewPublishAt:contentComparison.additional.map(p=>p.publishAt).sort()[0]},
  acceptance,
  productionConfiguration:{unchanged:true,namespaceId:productionBinding.namespaceId,className:productionBinding.className,migrationTag:after.config.migrationTag,compatibilityDate:after.config.compatibilityDate,compatibilityFlags:after.config.compatibilityFlags,domainAssignments:after.config.domains.map(d=>d.hostname),plainVars:after.config.bindings.filter(b=>b.type==='plain_text').map(b=>({name:b.name,text:b.text})),secretNames:after.config.bindings.filter(b=>b.type==='secret_text').map(b=>b.name),observabilityUnchanged:true},
  qa:{worker:manifest.qaWorker,version:(await readFile(path.join(root,'qa-deploy.log'),'utf8')).match(/Current Version ID:\s*([a-f0-9-]{36})/)?.[1],artifactSha256:manifest.qaArtifactSha256,namespaceId:after.qa.bindings.find(b=>b.namespaceId).namespaceId,clockHookOnlyInQa:true,noSmtpBindings:true},
  browser:{at:browser.at,views:browser.views.length,receiptSha256:hash(browserBytes),scope:browser.scope},screenshots,
  editorialPolicy:admission.policy,
  scope:'Private simulated future-clock acceptance is distinct from canonical current-time HTTP and native browser acceptance. Content-only release on unchanged incumbent runtime/core. No full platform upgrade, real provider pilot, customer record mutation/hash audit, retention erasure, SMTP test, DNS change or storage handoff performed.'
};
// Read the exact historical package identity from its accepted receipt.
const previous=JSON.parse(await readFile(path.join(repo,'sites/madbeauty/content-deploy-next19-20261009/RECEIPT.json')));
receipt.previousPackageSha256=previous.packageSha256;
await writeFile(path.join(import.meta.dirname,'RECEIPT.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({state:receipt.state,version,packageSha256:receipt.packageSha256,receiptSha256:hash(await readFile(path.join(import.meta.dirname,'RECEIPT.json'))),browserViews:browser.views.length,source:receipt.releaseSource}));
