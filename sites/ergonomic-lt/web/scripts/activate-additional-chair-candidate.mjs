// Explicit local activation after immutable candidate verification. Deployment
// remains a separate, reviewed operation; no source/editorial facts are edited.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve('../research/configurator/all-chairs-20261014');
const candidate=path.resolve(process.argv.find(a=>a.startsWith('--candidate='))?.slice(12)||path.join(root,'staged-runtime'));
assert(candidate.startsWith(root+path.sep),'Unknown candidate root');
const preview=process.argv.includes('--local-preview');
const report=JSON.parse(await fs.readFile(path.join(candidate,'report.json'),'utf8'));
assert(report.articles>0,'Candidate is empty');assert(preview||!report.problems.length,'Unresolved candidate problems');
const index=JSON.parse(await fs.readFile(path.join(candidate,'configurator-additional-index.json'),'utf8'));
const receipts=JSON.parse(await fs.readFile(path.join(candidate,'asset-receipts.json'),'utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
const publicRoot=path.resolve('public');
for(const [asset,sha] of Object.entries(receipts)){
 const file=path.resolve(publicRoot,asset.slice(1));assert(file.startsWith(publicRoot+path.sep));assert.equal(digest(await fs.readFile(file)),sha,'Prepared asset changed '+asset);
}
const copies=new Map();
for(const record of Object.values(index.articles)){
 assert(/^\/models\/configurator\/runtime\/K[A-Z0-9]+-[a-f0-9]{20}\.json$/.test(record.asset));
 const bytes=await fs.readFile(path.join(candidate,'public',record.asset));assert.equal(digest(bytes),record.sha256);copies.set(record.asset,bytes);
}
for(const product of Object.values(index.products))for(const article of product.articles){
 assert(/^\d+$/.test(article.sample));const asset='/media/configurator/'+article.sample+'.jpg';copies.set(asset,await fs.readFile(path.join(candidate,'public',asset)));
}
for(const [asset,bytes] of copies){
 const target=path.resolve(publicRoot,asset.slice(1));assert(target.startsWith(publicRoot+path.sep));
 try{assert.equal(digest(await fs.readFile(target)),digest(bytes),'Existing asset differs '+asset);}catch(error){if(error.code!=='ENOENT')throw error;}
 await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);
}
const active='content/configurator-additional-index.json';
const before=await fs.readFile(active),archive=path.join(root,'index-revisions',digest(before)+'.json');
await fs.mkdir(path.dirname(archive),{recursive:true});await fs.writeFile(archive,before);
await fs.writeFile(active+'.tmp',JSON.stringify(index,null,2)+'\n');await fs.rename(active+'.tmp',active);
await fs.writeFile(path.join(candidate,'activation.json'),JSON.stringify({activatedAt:new Date().toISOString(),localPreview:preview,articles:Object.keys(index.articles).length,priorIndexSha256:digest(before),indexSha256:digest(await fs.readFile(active)),deployed:false},null,2)+'\n');
console.log(JSON.stringify({localPreview:preview,articles:Object.keys(index.articles).length,products:Object.keys(index.products).length,deployed:false}));
