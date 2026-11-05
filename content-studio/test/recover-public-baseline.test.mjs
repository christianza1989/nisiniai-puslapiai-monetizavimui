import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {recoverPublicBaseline} from '../src/recover-public-baseline.mjs';

const dir = await mkdtemp(path.join(tmpdir(), 'studio-baseline-recovery-'));
process.env.STUDIO_DATA_DIR = path.join(dir, 'data');
process.env.STUDIO_OUTPUT_DIR = path.join(dir, 'output');
const pub = process.env.STUDIO_PUBLIC_CORE_DIR || path.resolve(import.meta.dirname, '../../../dovanos-memorycasting');
process.env.STUDIO_NETWORK_SETTINGS = path.join(pub, 'config/niche-network.json');
const {validateContentPackage, pageRevisionHash} = await import(pathToFileURL(path.join(pub, 'scripts/content-package-core.mjs')));
const model = await import('../src/model.mjs');
await model.initialize();
const siteId='baseline-fixture', host='baseline-fixture.example', at='2020-01-01T00:00:00.000Z';
const page=(id,slug,type,links=[])=>{const p={id,siteId,type,slug,title:'Synthetic title',description:'Synthetic description',intent:'Synthetic intent',body:[{type:'paragraph',text:'A complete synthetic fixture paragraph used only to exercise baseline recovery.'}],publishAt:at,media:[],links,externalLinks:[]}; p.revisionHash=pageRevisionHash(p);p.approval={status:'approved',revisionHash:p.revisionHash,approvedAt:at,actorId:'fixture'};return p;};
const home=page('home','','home'), privacy=page('privacy','privacy','service',[{targetPageId:'home',label:'Home'}]);
const pkg={schemaVersion:1,siteId,canonicalHost:host,locale:'lt-LT',site:{id:siteId,canonicalHost:host,locale:'lt-LT',name:'Synthetic',timezone:'Europe/Vilnius',offer:'Synthetic offer',brand:{accent:'#123456'},contact:{email:'fixture@example.com',phone:''}},pages:[home,privacy],generatedAt:at};
const bytes=Buffer.from(JSON.stringify(pkg));const sha=createHash('sha256').update(bytes).digest('hex');const file=path.join(dir,'baseline.json');await writeFile(file,bytes);
const input={siteId,canonicalHost:host,basePackagePath:file,expectedPackageSha256:sha,pageIds:['privacy'],expectedRevisionHashes:{privacy:privacy.revisionHash},baselineEvidence:{sourceVersion:'synthetic',deploymentId:'fixture-only',observedAt:at}};

test('recovers exact public snapshots but no private facts or fresh review', async()=>{
 const recovered=recoverPublicBaseline(bytes,input,validateContentPackage,model.revisionHash);
 assert.equal(recovered.facts,'');assert.equal(recovered.audience,'');assert.equal(recovered.pages[1].editorialReview,null);
 assert.deepEqual(recovered.pages[1].publishedRevision,privacy);assert.equal(model.revisionHash(recovered.pages[1]),privacy.revisionHash);
 assert.equal(recovered.recoveredBaseline.packageSha256,sha);
 const result=await model.recoverSiteFromPublicBaseline(input);assert.equal(result.state,'public-baseline-only-not-a-private-backup');
 const stored=await model.getSite(siteId);assert.deepEqual(stored.pages[1].publishedRevision,privacy);
 await assert.rejects(()=>model.recoverSiteFromPublicBaseline(input),/never overwrites/);
 await assert.rejects(()=>model.approveReviewedBatch(siteId,['privacy'],'fixture'),/peržiūros/);
});
test('rejects wrong pin, identity, evidence, selected revision and tampered package',()=>{
 for(const changed of [{expectedPackageSha256:'0'.repeat(64)},{canonicalHost:'other.example'},{baselineEvidence:{}},{expectedRevisionHashes:{privacy:'0'.repeat(64)}},{pageIds:['privacy','privacy']}])assert.throws(()=>recoverPublicBaseline(bytes,{...input,...changed},validateContentPackage,model.revisionHash));
 const altered=structuredClone(pkg);altered.pages[1].body[0].text='Tampered';const b=Buffer.from(JSON.stringify(altered));const h=createHash('sha256').update(b).digest('hex');assert.throws(()=>recoverPublicBaseline(b,{...input,expectedPackageSha256:h},validateContentPackage,model.revisionHash),/revision hash mismatch/);
});
test('selected media cannot be reconstructed from a public snapshot',()=>{
 const altered=structuredClone(pkg);const p=altered.pages[1];p.media=[{id:'im',src:'/content-assets/baseline-fixture/im.webp',alt:'Synthetic',rights:'Synthetic fixture',width:1,height:1}];p.revisionHash=pageRevisionHash(p);p.approval.revisionHash=p.revisionHash;
 const b=Buffer.from(JSON.stringify(altered));const h=createHash('sha256').update(b).digest('hex');assert.throws(()=>recoverPublicBaseline(b,{...input,expectedPackageSha256:h,expectedRevisionHashes:{privacy:p.revisionHash}},validateContentPackage,model.revisionHash),/without media/);
});
test('real new review and scoped approval change only the selected page',async()=>{
 await model.editSite(siteId,{facts:'Synthetic facts are independently confirmed for this isolated test; no real facts or review records are claimed.'});
 const draft=await model.editPage(siteId,'privacy',{body:[{type:'paragraph',text:'A revised synthetic policy paragraph, independently reviewed for the isolated test fixture. It contains only fake sample data and has no real legal or factual claims.'}]});
 const evidence=Object.fromEntries(['usefulness','facts','sources','media','links','presentation'].map(k=>[k,`Synthetic isolated fixture: independently checked ${k}; no real evidence is claimed.`]));
 await model.recordEditorialReview(siteId,'privacy',{revisionHash:model.revisionHash(draft),reviewer:'synthetic-reviewer',evidence});
 const scope={pageIds:['privacy'],basePackagePath:file,expectedBasePackageSha256:sha,expectedRevisionHashes:{privacy:model.revisionHash(draft)}};
 await model.approveReviewedOverlay(siteId,scope,'synthetic-reviewer');
 const assets=[];await mkdir(path.join(dir,'assets'));
 const release=await model.releaseReviewedOverlay(siteId,{...scope,baseAssetsDirectory:path.join(dir,'assets'),expectedBaseAssets:assets,expectedBaseAssetsSha256:createHash('sha256').update(model.stable(assets)).digest('hex'),baselineEvidence:input.baselineEvidence});
 const result=JSON.parse(await readFile(release.path));assert.deepEqual(result.pages[0],pkg.pages[0]);assert.notDeepEqual(result.pages[1],pkg.pages[1]);assert.equal(result.pages[1].publishAt,pkg.pages[1].publishAt);assert.equal(result.pages[1].id,pkg.pages[1].id);
});
