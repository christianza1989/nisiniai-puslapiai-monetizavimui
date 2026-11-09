// Create a new isolated studio from the pinned public baseline and re-enter
// already prepared text through the model. This never approves or releases.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const pub=`${root}/memo-googlepay-privacy-public-20261105`;
const old=`${root}/memo-collection-draft-data-20261109/studio-data/sites/memocasting.json`;
const work=`${root}/memo-collection-reviewed-prep-20261109`;
process.env.STUDIO_DATA_DIR=`${work}/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${work}/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const core=`${root}/memo-collection-copy-20261109`;
const model=await import(pathToFileURL(`${core}/content-studio/src/model.mjs`));
const basePackagePath=`${pub}/content-packages/memocasting/content-package.json`;
const expectedPackageSha256='019e5950fca629b1bb8942ced9b7f2db3c0d33cdbe67720cf990bcb59df2e6ca';
const base=JSON.parse(await readFile(basePackagePath,'utf8'));
const prepared=JSON.parse(await readFile(old,'utf8'));
const selected=['dovanos','gidai/dovanos-moterims'].map(slug=>base.pages.find(p=>p.slug===slug));
assert.ok(selected.every(Boolean));
const assets=JSON.parse(await readFile('C:/Users/Lenovo/AppData/Local/Temp/memo-privacy-baseline-assets-20261105.json','utf8'));
await model.initialize();
await model.recoverSiteFromPublicBaseline({
 siteId:'memocasting',canonicalHost:'memocasting.lt',basePackagePath,expectedPackageSha256,
 pageIds:selected.map(p=>p.id),expectedRevisionHashes:Object.fromEntries(selected.map(p=>[p.id,p.revisionHash])),
 baseAssetsDirectory:`${pub}/content-packages/memocasting/assets`,expectedBaseAssets:assets,
 expectedBaseAssetsSha256:'b46142d03f7e4299388e2f9a89fa3d3138c9656572cd2322f8e4b8931397c0d8',
 baselineEvidence:{sourceVersion:'PUBLIC a22bfd96b4d6787ab3cd3c0a9a1d4e415510f98e',deploymentId:'bb62bd89-460d-40fc-bba8-c71d3194dbe7 / Worker a224a0fb-8648-4ea0-943d-5aece52d1b48',observedAt:'2026-11-09T07:47:01.000Z'}
});
await model.editSite('memocasting',{facts:'„Memory Casting“ rankų liejimo rinkinys porai kainuoja 32 €, šeimos rinkinys – 48 € (2026-11-09 patikrinta gyvuose prekių puslapiuose). Poros rinkinyje yra vienas alginato pakelis ir 1 200 g gipso, šeimos rinkinyje – po du alginato ir gipso pakelius. Abiejuose rinkiniuose yra balti dažai. Pagal abiejų rinkinių instrukcijas gipsas formoje stingsta vieną valandą, išimtą liejinį prieš dažant džiovinti 5–7 paras. Rinkinių ir instrukcijų nuorodos patikrintos 2026-11-09.'});
const src=prepared.pages.find(p=>p.slug==='dovanos/moterims');assert.ok(src&&!src.approval);
const added=await model.addPage('memocasting',{type:src.type,slug:src.slug,title:src.title,description:src.description,intent:src.intent,cluster:src.cluster,publishAt:src.publishAt,body:src.body});
await model.editPage('memocasting',added.id,{links:src.links});
for(const slug of ['dovanos','gidai/dovanos-moterims']){
 const oldPage=prepared.pages.find(p=>p.slug===slug),sourceCollection=src.id;
 assert.ok(oldPage&&!oldPage.approval);
 const links=oldPage.links.map(l=>l.targetPageId===sourceCollection?{...l,targetPageId:added.id}:l);
 await model.editPage('memocasting',oldPage.id,{body:oldPage.body,links,externalLinks:oldPage.externalLinks});
}
const s=await model.getSite('memocasting');
const pages=['dovanos/moterims','gidai/dovanos-moterims','dovanos'].map(slug=>{const p=s.pages.find(x=>x.slug===slug);assert.equal(p.approval,null);return{slug,id:p.id,revisionHash:model.revisionHash(p),media:p.media.length};});
console.log(JSON.stringify({state:'isolated-drafts-no-reviews-or-approvals',studioData:process.env.STUDIO_DATA_DIR,pages}));
