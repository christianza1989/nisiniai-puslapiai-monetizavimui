// Filter only our generated chair directories in a fresh deployment build.
// Preserve source assets and archive the removed build copies for inspection.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve('../research/configurator/all-chairs-20261014');
const candidate=path.resolve(process.argv.find(a=>a.startsWith('--candidate='))?.slice(12)||path.join(root,'stage-integrated-current'));
assert(candidate.startsWith(root+path.sep));
const report=JSON.parse(await fs.readFile(path.join(candidate,'report.json'),'utf8'));
assert(report.articles>0&&!report.problems.length,'Unverified release candidate');
const index=JSON.parse(await fs.readFile(path.join(candidate,'configurator-additional-index.json'),'utf8'));
const active=await fs.readFile('content/configurator-additional-index.json');
assert.deepEqual(JSON.parse(active),index,'Active runtime changed after candidate QA');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const receipts=JSON.parse(await fs.readFile(path.join(candidate,'asset-receipts.json'),'utf8'));
const dist=path.resolve('dist/client'),publicRoot=path.resolve('public');
assert.equal(dist,path.resolve(process.cwd(),'dist/client'));
await fs.access(path.join(dist,'_headers'));
const archive=path.join(root,'release-build-assets',new Date().toISOString().replace(/[:.]/g,'-'));
const moved=[];
for(const folder of ['all-chairs','all-chairs-v3']){
 const from=path.resolve(dist,'models/configurator',folder),to=path.join(archive,folder);
 assert(from.startsWith(dist+path.sep)&&to.startsWith(root+path.sep));
 try{await fs.access(from);}catch(error){if(error.code==='ENOENT')continue;throw error;}
 await fs.mkdir(path.dirname(to),{recursive:true});await fs.rename(from,to);moved.push(folder);
}
let selectedModels=0;
for(const [asset,digest] of Object.entries(receipts)){
 if(!asset.startsWith('/models/configurator/all-chairs-v3/'))continue;
 const source=path.resolve(publicRoot,asset.slice(1)),target=path.resolve(dist,asset.slice(1));
 assert(source.startsWith(publicRoot+path.sep)&&target.startsWith(dist+path.sep));
 const bytes=await fs.readFile(source);assert.equal(sha(bytes),digest,asset+' changed after verification');
 await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);selectedModels++;
}
for(const entry of Object.values(index.articles)){
 const bytes=await fs.readFile(path.join(dist,entry.asset));assert.equal(sha(bytes),entry.sha256,'Build omitted immutable runtime '+entry.asset);
}
// A previous article-only release excluded these entire directories. A fresh
// build must not carry those exclusions once real chair assets are selected.
const ignore=path.join(dist,'.assetsignore');
try{
 const text=await fs.readFile(ignore,'utf8');
 assert(!text.split(/\r?\n/).some(line=>/all-chairs-v3/.test(line)&&!line.startsWith('#')),'Stale release exclusion');
}catch(error){if(error.code!=='ENOENT')throw error;}
const files=(await fs.readdir(dist,{recursive:true,withFileTypes:true})).filter(entry=>entry.isFile());
const oversized=[];let totalBytes=0;
for(const entry of files){const file=path.join(entry.parentPath,entry.name),stat=await fs.stat(file);totalBytes+=stat.size;if(stat.size>25*1024*1024)oversized.push(path.relative(dist,file));}
assert.deepEqual(oversized,[],'Asset exceeds Cloudflare static asset limit');
const receipt={createdAt:new Date().toISOString(),indexSha256:sha(active),articles:report.articles,models:report.modelSamples,selectedModels,files:files.length,totalBytes,archive,moved,sourceAssetsPreserved:true};
await fs.writeFile(path.join(candidate,'release-build-assets.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({articles:receipt.articles,models:receipt.models,selectedModels,files:files.length,totalBytes,sourceAssetsPreserved:true}));
