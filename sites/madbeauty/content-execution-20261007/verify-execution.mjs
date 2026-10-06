import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateV2Draft,v2RevisionHash} from '../../../content-studio/src/content-package-v2.mjs';
const read=async f=>JSON.parse(await readFile(new URL(f,import.meta.url),'utf8'));
const [execution,identity,snapshot,receipt,plan]=await Promise.all(['EXECUTION.json','STUDIO-IDENTITY-MAP.json','DRAFT-V2.json','GENERATION-RECEIPT.json','../topical-authority-20261006/PLAN.json'].map(read));
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.deepEqual(receipt.observed,{model:'gpt-6-luna',reasoningEffort:'xhigh'});
assert.equal(receipt.savedArticleSha256,hash(await readFile(new URL('ARTICLE.json',import.meta.url))));
assert.equal(snapshot.status,'PRIVATE_DRAFT_NOT_APPROVED');
validateV2Draft(snapshot.page,snapshot.page.siteSnapshot);
assert.equal(v2RevisionHash(snapshot.page),snapshot.revisionHash);assert.equal(snapshot.revisionHash,execution.revisionHash);
assert.equal(identity.pages.length,303);assert.equal(new Set(identity.pages.map(p=>p.pageId)).size,303);
for(const p of [...plan.pages,...plan.retained]){const stored=identity.pages.find(s=>s.planId===p.id);assert.equal(stored.slug,p.slug);assert.equal(stored.publishAt,p.publishAt);}
for(const p of plan.retained)assert.equal(identity.pages.find(s=>s.planId===p.id).pageId,plan.existing.find(s=>s.id===p.id).actualPageId);
assert.equal(execution.pageId,identity.pages.find(s=>s.planId===execution.planId).pageId);assert.equal(snapshot.page.publishAt,execution.publishAt);
for(const a of execution.assets){const bytes=await readFile(new URL(a.file,import.meta.url));assert.equal(bytes.length,a.bytes);assert.equal(hash(bytes),a.sha256);}
assert.equal(execution.approvedPages,0);assert.equal(execution.productionDeployed,false);assert.equal(execution.writtenPages,1);
const html=await readFile(new URL('REGISTRACIJOS-GIDAS.html',import.meta.url),'utf8');assert.ok(html.includes('noindex,nofollow'));assert.ok(!html.includes('/api/media/'));assert.ok(html.includes('assets/'));
for(const url of snapshot.page.editorial.sources.map(s=>s.url))assert.ok(html.includes(url));
console.log('PASS: real Luna/xhigh receipt, exact article/V2/media hashes, all303 identities/dates, retained UUIDs and private portable preview.');
