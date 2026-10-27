// Reviewed release from the isolated Studio snapshot only; never deploys.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {stable,releaseSha} from '../../content-studio/src/scoped-content-release.mjs';
const core=path.resolve(import.meta.dirname,'../..'), pub=process.env.MEMO_PUBLIC_CORE_DIR, baseRelease=process.env.MEMO_BASE_RELEASE;
assert.ok(pub&&baseRelease&&process.env.MEMO_ACTIVE_WORKER_VERSION&&process.env.MEMO_ACTIVE_DEPLOYMENT_ID&&process.env.MEMO_PROVIDER_OBSERVED_AT);
const data=path.join(core,'sites/memocasting/studio-data');
assert.notEqual(path.resolve(data),path.resolve(process.env.MEMO_ACTUAL_STUDIO_DATA || 'missing-actual'));
process.env.STUDIO_DATA_DIR=data;process.env.STUDIO_OUTPUT_DIR=path.join(core,'sites/memocasting/studio-output');
process.env.STUDIO_PUBLIC_CORE_DIR=pub;process.env.STUDIO_NETWORK_SETTINGS=path.join(pub,'config/niche-network.json');
const m=await import(pathToFileURL(core+'/content-studio/src/model.mjs'));
const dir=path.join(core,'sites/memocasting/qa/product-clarity-20261027');
const rows=JSON.parse(await fs.readFile(dir+'/drafts.private.json','utf8'));
const baseBytes=await fs.readFile(dir+'/baseline-content-package.private.json'),baseSha=releaseSha(baseBytes);
assert.equal(baseSha,'dfe2f7bf5ea4ef9550a68221e85468f62f380fd53e133f102f2346a4457e544a');
assert.equal(releaseSha(await fs.readFile(path.join(pub,'content-packages/memocasting/content-package.json'))),baseSha);
const site=await m.getSite('memocasting');
for(const row of rows){const page=site.pages.find(p=>p.id===row.id);assert.equal(m.revisionHash(page),row.revisionHash,row.slug);assert.equal(page.publishAt,row.publishAt,row.slug);
 const evidence={
  usefulness:'Klientui konkrečiai paaiškintas liejimo ir džiovinimo laikas bei padėta palyginti abu rinkinius. Visi šio puslapio lietuviški aprašymai peržiūrėti kartu su naujais sakiniais.',
  facts:'Abiejų rinkinių originalūs PDF: išėmimo laikas 1 val., džiovinimas 5–7 paros; sudėtis pagal patvirtintą dabartinį abiejų rinkinių aprašą.',
  sources:'2026-10-27 HTTPS originalūs PDF: poros SHA-256 4dc1623fb5367065c2136296b6a14c44f07e2cb61a4c38f898fb04e36eaf9cfe, šeimos 8113f91dcad9490a4d5eebfcf01e0f5acd593971bafadf82b19647c6f29fd07c. HTML instrukcijos ir pats šaltinio PDF perskaityti.',
  media:'Naujos medijos nėra; 8 pasirinkti ankstesni vaizdai sutikrinti pagal pirminio leidinio SHA-256; vizualiniai ir turtinių teisių duomenys nepakeisti.',
  links:'Nuorodų paskirtys yra paskelbti abu produktai ir abiejų rinkinių instrukcijos. Konkretūs teksto fragmentai bei etiketes patikrinti su builder testu.',
  presentation:'Abi pilnos lietuviškos produktų kopijos ir nauji tekstai perskaityti izoliuotame parengtame tekste. Gyvo produkto puslapio 320 px peržiūra buvo atlikta iki šio pakeitimo; realų naujos redakcijos desktop ir mobile atvaizdavimą būtina patikrinti atskirai prieš ir po viešo leidimo.'
 };
 await m.recordEditorialReview('memocasting',row.id,{revisionHash:row.revisionHash,reviewer:'codex-product-clarity-2026-10-27',evidence});
}
const ids=rows.map(r=>r.id),expectedRevisionHashes=Object.fromEntries(rows.map(r=>[r.id,r.revisionHash]));
await m.approveReviewedOverlay('memocasting',{pageIds:ids,expectedRevisionHashes,basePackagePath:dir+'/baseline-content-package.private.json',expectedBasePackageSha256:baseSha},'codex-product-clarity-2026-10-27');
const manifest=JSON.parse(await fs.readFile(baseRelease+'/release-manifest.json','utf8'));assert.equal(manifest.packageSha256,baseSha);
const baselineEvidence={sourceVersion:process.env.MEMO_ACTIVE_WORKER_VERSION,deploymentId:process.env.MEMO_ACTIVE_DEPLOYMENT_ID,observedAt:process.env.MEMO_PROVIDER_OBSERVED_AT};
const result=await m.releaseReviewedOverlay('memocasting',{pageIds:ids,basePackagePath:dir+'/baseline-content-package.private.json',expectedBasePackageSha256:baseSha,baseAssetsDirectory:baseRelease+'/assets',expectedBaseAssets:manifest.assets,expectedBaseAssetsSha256:releaseSha(stable(manifest.assets)),baselineEvidence});
const {verifyContentRelease}=await import('../../content-studio/src/content-release.mjs');
const {validateContentPackage}=await import(pathToFileURL(path.join(pub,'scripts/content-package-core.mjs')));
const verification=await verifyContentRelease(path.dirname(result.path),validateContentPackage);
await fs.writeFile(dir+'/release-receipt.private.json',JSON.stringify({result,expectedRevisionHashes,baselineEvidence},null,2),{flag:'wx'});
console.log(JSON.stringify({path:result.path,packageSha256:result.packageSha256,pages:result.pages,changedPages:ids.length,state:result.state,verification:verification.state??verification.status??'completed'}));
