// Portable acceptance of committed content and status outputs; no tenant mutation.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const h=import.meta.dirname,read=async n=>JSON.parse(await fs.readFile(h+'/'+n)),hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=await fs.readFile(h+'/release/content-package.json'),pkg=JSON.parse(bytes),baseline=await read('BASELINE129.json'),assets=await read('release/ASSET-MANIFEST.json'),delivery=await read('DELIVERY.json'),calendar=await read('PUBLICATION-STATUS.json');
assert.equal(hash(bytes),delivery.release.packageSha256);assert.equal(pkg.pages.length,135);assert.equal(pkg.pages.filter(p=>p.type==='guide').length,131);assert.equal(baseline.approvedSnapshots.length,129);
for(const old of baseline.approvedSnapshots)assert.deepEqual(pkg.pages.find(p=>p.id===old.id),old.revision);
assert.equal(assets.assets.length,664);for(const a of assets.assets){const b=await fs.readFile(path.join(h,'release/assets',a.name));assert.equal(hash(b),a.sha256);assert.equal(b.length,a.bytes);}
assert.equal(calendar.entries.length,299);assert.equal(calendar.entries.filter(p=>p.type==='guide').length,295);assert.equal(calendar.entries.filter(p=>p.type==='guide'&&p.state.startsWith('DEPLOYED_')).length,131);assert.equal(calendar.entries.filter(p=>p.type==='guide'&&p.state==='PLANNED_UNWRITTEN').length,164);for(const d of baseline.dates)assert.equal(calendar.entries.find(p=>p.id===d.id)?.publishAt,d.publishAt);
assert.equal(delivery.state,'ACTUAL_DOMAIN_VERIFIED');const receiptBytes=await fs.readFile(h+'/PRODUCTION-RECEIPT.json');assert.equal(hash(receiptBytes),delivery.productionAcceptance.consumerReceiptSha256);
console.log({state:'PASS_PORTABLE_DELIVERY',pages:135,guides:131,assets:664,preservedSnapshots:129,preservedDates:299,remainingGuides:164,packageSha256:hash(bytes)});
