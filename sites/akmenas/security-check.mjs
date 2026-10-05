import {readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=import.meta.dirname,root=path.resolve(dir,'../..'),core='C:/Users/lenovo/Documents/dovanos-memorycasting',copy=path.join(root,'output/akmenas-production');
const version=JSON.parse(await readFile(path.join(dir,'VERSION.json'),'utf8'));
const pkg=JSON.parse(await readFile(path.join(core,'content-packages/akmenas/content-package.json'),'utf8'));
const forbidden=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/sk-proj-[A-Za-z0-9_-]{20,}/,/(?:api_key|password|smtp_password|access_token)\s*["']?\s*[:=]\s*["'][^"']{8,}/i];
assert.ok(!forbidden.some(r=>r.test(JSON.stringify(pkg))));
const actualAssetFiles=await readdir(path.join(core,'public/content-assets/akmenas'));
assert.equal(actualAssetFiles.length,20);assert.ok(actualAssetFiles.every(v=>v.endsWith('.webp')));
const ownedSourceMatches={};
for(const file of ['components/niche/akmenas-site.tsx','components/niche/akmenas-site.module.css','content-packages/akmenas/content-package.json']) {
 const source=await readFile(path.join(core,file)),isolated=await readFile(path.join(copy,file));
 const sha=buf=>createHash('sha256').update(buf).digest('hex');
 assert.equal(sha(source),version.sourceFingerprints[file]);assert.equal(sha(isolated),sha(source));ownedSourceMatches[file]=sha(source);
}
const excludedSecrets={};for(const name of ['.env','.env.local','.dev.vars','.dev.vars.local']){try{await stat(path.join(copy,name));excludedSecrets[name]=false;}catch(e){if(e.code!=='ENOENT')throw e;excludedSecrets[name]=true;}}
assert.ok(Object.values(excludedSecrets).every(Boolean));
const responses=[];
for(const route of ['/','/.env','/content-studio/data/sites/akmenas.json','/content-assets/akmenas/hero.png','/llms.txt']){
 const r=await fetch('http://127.0.0.1:8887'+route),body=await r.text();assert.ok(!forbidden.some(p=>p.test(body)));
 if(!['/','/llms.txt'].includes(route))assert.equal(r.status,404);
 responses.push({path:route,status:r.status,headers:Object.fromEntries(['content-type','cache-control','x-content-type-options','referrer-policy','set-cookie'].map(k=>[k,r.headers.get(k)])),secretPatternsFound:false});
}
const record={siteId:'akmenas',at:new Date().toISOString(),packageSha256:version.packageSha256,ownedSourceMatches,publicAssetCount:20,publicOriginals:false,excludedSecrets,responses,scope:'Own approved package, own20publicWebP, isolated secret-file exclusions and read-only render/LLM/private-path requests. Does not certify the unrelated repository or third-party dependencies.',controls:'Native/server validation, origin/host gates, body limits, honeypot, D1 before optional SMTP; evidence FORM-VERIFICATION/INTEREST-VERIFICATION/core tests.',syntheticData:'Exact test lead removed; counter increment restored. Browser QA totals are synthetic, not demand.',productionGaps:['Domain and legal identity verification','Production secrets and D1/mail bindings','Rate controls, alerting and mail reconciliation','Production backup/restore and incident/access procedure','Retention/legal basis/processors/transfer decision'],copyRepair:'Initial isolated TypeScript attempt lacked cloudflare-env.d.ts and hooks; only nonsecret declaration/source copied for complete type-check inputs. Build/renderer/media unchanged.',concurrentWork:'Current shared tsc reports optional externalLinks issues in auksarankiams-site.tsx, outside own boundary; no other niche files changed.'};
await writeFile(path.join(dir,'SECURITY-VERIFICATION.json'),JSON.stringify(record,null,2));console.log(JSON.stringify({assets:20,responses:responses.map(v=>[v.path,v.status]),ownedSourceMatches:true,secretFilesExcluded:true}));
