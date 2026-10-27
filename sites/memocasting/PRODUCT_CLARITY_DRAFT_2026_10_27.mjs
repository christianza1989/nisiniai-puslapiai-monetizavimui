// Only edit an isolated snapshot; never use actual Studio as the target.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {productClarityChanges} from './PRODUCT_CLARITY_2026_10_27.mjs';
import {stable,releaseSha} from '../../content-studio/src/scoped-content-release.mjs';
const core=path.resolve(import.meta.dirname,'../..');
const pub=process.env.MEMO_PUBLIC_CORE_DIR, baseRelease=process.env.MEMO_BASE_RELEASE;
assert.ok(pub && baseRelease,'Pass explicit public checkout and baseline release.');
const out=path.join(core,'sites/memocasting/qa/product-clarity-20261027');
const data=path.join(core,'sites/memocasting/studio-data');
assert.notEqual(path.resolve(data),path.resolve(process.env.MEMO_ACTUAL_STUDIO_DATA || 'missing-actual'));
await fs.mkdir(out,{recursive:true});
process.env.STUDIO_DATA_DIR=data;process.env.STUDIO_OUTPUT_DIR=path.join(core,'sites/memocasting/studio-output');
process.env.STUDIO_PUBLIC_CORE_DIR=pub;process.env.STUDIO_NETWORK_SETTINGS=path.join(pub,'config/niche-network.json');
const m=await import(pathToFileURL(core+'/content-studio/src/model.mjs'));
const bytes=await fs.readFile(path.join(pub,'content-packages/memocasting/content-package.json'));
const sha=releaseSha(bytes);assert.equal(sha,'dfe2f7bf5ea4ef9550a68221e85468f62f380fd53e133f102f2346a4457e544a');
const pkg=JSON.parse(bytes),changes=productClarityChanges(pkg,new Date().toISOString()),before=await m.getSite('memocasting');
assert.equal((await m.listJobs()).filter(j=>j.siteId==='memocasting'&&['queued','running'].includes(j.status)).length,0);
const manifest=JSON.parse(await fs.readFile(path.join(baseRelease,'release-manifest.json'),'utf8'));
assert.equal(manifest.packageSha256,sha);
const ids=changes.map(c=>c.id), selected=new Set(ids), assetNames=new Set(pkg.pages.filter(p=>selected.has(p.id)).flatMap(p=>p.media.map(x=>path.basename(x.src))));
const target=path.join(data,'media/memocasting');await fs.mkdir(target,{recursive:true});
for(const name of assetNames){const bytes=await fs.readFile(path.join(baseRelease,'assets',name));assert.equal(releaseSha(bytes),manifest.assets.find(x=>x.name===name)?.sha256);await fs.writeFile(path.join(target,name),bytes,{flag:'wx'});}
for(const c of changes){const old=before.pages.find(p=>p.id===c.id);assert.equal(m.revisionHash(old),c.expectedRevisionHash,c.slug);assert.equal(old.publishedRevision?.revisionHash,c.expectedRevisionHash,c.slug);assert.equal(old.publishAt,c.publishAt);assert.ok(!old.factChecks?.length);}
await fs.writeFile(out+'/baseline-content-package.private.json',bytes,{flag:'wx'});
await fs.writeFile(out+'/before-native.private.json',JSON.stringify(before,null,2),{flag:'wx'});
for(const c of changes)await m.editPage('memocasting',c.id,c.input);
await m.finalizeInternalLinks('memocasting',ids);
const after=await m.getSite('memocasting');
for(const c of changes){const p=after.pages.find(p=>p.id===c.id),old=before.pages.find(p=>p.id===c.id);assert.equal(stable(p.body),stable(c.input.body));assert.equal(stable(p.publishedRevision),stable(old.publishedRevision));assert.equal(p.publishAt,c.publishAt);}
for(const p of before.pages.filter(p=>!selected.has(p.id)))assert.equal(stable(p),stable(after.pages.find(q=>q.id===p.id)));
const rows=changes.map(c=>{const p=after.pages.find(p=>p.id===c.id);return {id:p.id,slug:p.slug,revisionHash:m.revisionHash(p),publishAt:p.publishAt,links:p.links};});
await fs.writeFile(out+'/drafts.private.json',JSON.stringify(rows,null,2),{flag:'wx'});
await fs.writeFile(out+'/final-text.private.txt',changes.map(c=>{const p=after.pages.find(p=>p.id===c.id);return ['# '+p.slug,p.title,p.description,...p.body.map(b=>b.text||b.items?.join('\n')||''),'LINKS',JSON.stringify(p.links)].join('\n\n');}).join('\n\n==========\n\n'),{flag:'wx'});
console.log(JSON.stringify({state:'isolated-draft-not-approved',pages:rows.length,baselineSha256:sha,selectedAssets:assetNames.size}));
