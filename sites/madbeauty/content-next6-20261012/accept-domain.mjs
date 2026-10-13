import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const h=import.meta.dirname, receiptPath=process.argv[2],sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=await fs.readFile(receiptPath),receipt=JSON.parse(bytes),main=receipt.editions.main,c=receipt.contentConsumer;
const packageBytes=await fs.readFile(h+'/release/content-package.json'),pkg=JSON.parse(packageBytes),packageSha256=sha(packageBytes),delivery=JSON.parse(await fs.readFile(h+'/DELIVERY.json'));
assert.equal(receipt.state,'FAVICON_AND_EXACT_CONTENT135_LIVE_ACCEPTED');assert.equal(c.state,'CANONICAL_CONTENT135_LIVE_ACCEPTED');assert.equal(c.origin,'https://madbeauty.lt');
assert.equal(main.packageSha256,packageSha256);assert.equal(c.packageSha256,packageSha256);assert.equal(delivery.release.packageSha256,packageSha256);
assert.equal(pkg.pages.length,135);assert.equal(pkg.pages.filter(p=>p.type==='guide').length,131);assert.equal(c.pages,135);assert.equal(c.guides,131);assert.equal(c.contentAssets,664);assert.equal(c.preservedSnapshots,129);assert.equal(c.preservedPublicationDates,299);assert.equal(c.futureClockDeployed,false);
assert.equal(main.runtimeBase,'9dcd67cf1f5bd1500564b47ea6b4a2dbd8ce8f63');assert.equal(main.coreSource,'5661d5d6907d6f5d11514ae69c0decc6130d65e2');assert.equal(main.totalAssets,923);
assert.match(main.sourceCommit,/^[a-f0-9]{40}$/);assert.match(main.version,/^[a-f0-9-]{36}$/);assert.match(main.artifactSha256,/^[a-f0-9]{64}$/);assert.ok(Number.isFinite(Date.parse(main.at)));
const selection=JSON.parse(await fs.readFile(h+'/SELECTION.json'));assert.equal(c.additional.length,6);
for(const s of selection.pages){const p=pkg.pages.find(p=>p.id===s.pageId),r=c.additional.find(p=>p.id===s.pageId);assert.ok(r);assert.equal(r.publishAt,s.publishAt);assert.equal(r.publishAt,p.publishAt);assert.equal(r.revisionHash,p.revisionHash);assert.equal(r.slug,p.slug);}
const proofRecords=[];for(const [name,e]of Object.entries(c.proofs)){const b=await fs.readFile(e.evidence),p=JSON.parse(b);assert.equal(sha(b),e.sha256,name);assert.equal(p.state,'PASS',name);assert.equal(p.artifactSha256,main.artifactSha256,name);proofRecords.push({name,sha256:e.sha256,at:p.at,scope:p.scope||p.mode||null});}
const native=JSON.parse(await fs.readFile(c.proofs['native.json'].evidence));assert.equal(native.publicationCases.length,12);assert.equal(native.uniqueCommerceTargets,10);assert.equal(native.all664ContentAssetsAtDue,true);
for(const s of selection.pages){const cases=native.publicationCases.filter(x=>x.slug===s.slug);assert.equal(cases.length,2);assert.ok(cases.some(x=>Date.parse(x.now)===Date.parse(s.publishAt)-1&&x.visible===false));assert.ok(cases.some(x=>Date.parse(x.now)===Date.parse(s.publishAt)&&x.visible===true&&x.schemaAndOgChecked===true));}
const live=JSON.parse(await fs.readFile(c.proofs['live-after.json'].evidence));assert.equal(live.pages.length,135);assert.equal(live.assets.length,923);assert.equal(live.packageSha256,packageSha256);
const nativeBrowser=JSON.parse(await fs.readFile(c.proofs['browser/native.json'].evidence));assert.equal(nativeBrowser.currentViews.length,2);assert.equal(nativeBrowser.observedImagesLoaded,true);assert.equal(nativeBrowser.currentMobileOverflow,false);assert.equal(nativeBrowser.browserErrorsAfterProxyRepair.length,0);
for(const view of nativeBrowser.currentViews)assert.equal(sha(await fs.readFile(path.join(receipt.browser.directory,view.file))),view.sha256);
const worker=await fs.readFile(path.resolve(path.dirname(c.proofs['native.json'].evidence),'worker.mjs'));assert.equal(sha(worker),main.artifactSha256);
const domain=JSON.parse(await fs.readFile(h+'/DOMAIN-ACCEPTANCE.json')),provider=JSON.parse(await fs.readFile(h+'/PROVIDER-ACCEPTANCE.json'));
assert.equal(domain.state,'PASS_ACTUAL_CANONICAL_DOMAIN');assert.equal(domain.packageSha256,packageSha256);assert.equal(provider.state,'PASS_CURRENT_PROVIDER_DEPLOYMENT');assert.equal(provider.version,main.version);assert.equal(provider.percentage,100);
const acceptedAt=new Date().toISOString();await fs.writeFile(h+'/PRODUCTION-RECEIPT.json',bytes);
delivery.state='ACTUAL_DOMAIN_VERIFIED';delivery.release.state='actual-domain-verified';delivery.productionAcceptance={...domain,acceptedAt,runtimeSource:main.runtimeBase,consumerSource:main.sourceCommit,coreSource:main.coreSource,productionVersion:main.version,productionArtifactSha256:main.artifactSha256,totalMainAssets:main.totalAssets,deployedAt:main.at,consumerReceiptSha256:sha(bytes),consumerReceiptSource:receiptPath,consumerProofs:proofRecords,currentProviderVersionConfirmed:true};
delivery.limitations=['Future six-guide browser views are isolated native views; actual hosted browser checks cover current eligible content. This is content release acceptance, not whole-platform certification, indexing or current-core migration.'];
await fs.writeFile(h+'/DELIVERY.json',JSON.stringify(delivery,null,2)+'\n');
const handoff=JSON.parse(await fs.readFile(h+'/CONSUMER-HANDOFF.json'));handoff.state='ACTUAL_CONSUMER_AND_DOMAIN_ACCEPTED';handoff.productionDeployed=true;handoff.canonicalLeaseOwner=null;handoff.acceptedAt=acceptedAt;handoff.actual={version:main.version,packageSha256,artifactSha256:main.artifactSha256,consumerReceiptSha256:sha(bytes),consumerPR:receipt.sourcePR};handoff.scope='Actual consumer receipt, compiled artifact bytes, native boundary/media/schema/OG evidence, current provider 100% version and independent real-clock canonical HTTP accepted. Historical producer evidence remains unchanged.';await fs.writeFile(h+'/CONSUMER-HANDOFF.json',JSON.stringify(handoff,null,2)+'\n');
console.log({state:delivery.state,version:main.version,packageSha256,guides:131,remainingOf295:164});
