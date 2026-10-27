// Run against an isolated, already prepared Studio copy only; never deploys.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {stable,releaseSha} from '../../content-studio/src/scoped-content-release.mjs';
const core=path.resolve(import.meta.dirname,'../..');
const publicRoot=process.env.MEMO_PUBLIC_CORE_DIR;
assert.ok(publicRoot,'Set MEMO_PUBLIC_CORE_DIR to the verified public checkout.');
const output=core+'/sites/memocasting/qa/context-links-final-20261027';
const baseRelease='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/memocasting-site-20261012/nisiniai_puslapiai_monetizavimui/sites/memocasting/studio-output/releases/memocasting/e3d33412-051a-4b4d-9530-17847dca0967';
process.env.STUDIO_DATA_DIR=core+'/sites/memocasting/studio-data';
process.env.STUDIO_OUTPUT_DIR=core+'/sites/memocasting/studio-output';
process.env.STUDIO_PUBLIC_CORE_DIR=publicRoot;
process.env.STUDIO_NETWORK_SETTINGS=publicRoot+'/config/niche-network.json';
const model=await import(pathToFileURL(core+'/content-studio/src/model.mjs'));
const rows=JSON.parse(await fs.readFile(output+'/drafts.private.json','utf8'));
const baseBytes=await fs.readFile(output+'/baseline-content-package.private.json');
const baseSha=releaseSha(baseBytes);
assert.equal(baseSha,'4b326c5c3547d164950631fe5b793b6b38a65cd84b16bfd545a47f5d04c8c548');
const site=await model.getSite('memocasting');
for(const row of rows){const page=site.pages.find(p=>p.id===row.id);assert.equal(model.revisionHash(page),row.revisionHash,row.slug);assert.equal(page.publishAt,row.publishAt,row.slug);}
const reviewBySlug={
  'gidai/kaledines-dovanos-teciui':'Tėčiui skirtas pasirinkimas papildytas susijusiais tėvų ir vyrų gidais.',
  'gidai/kaledines-dovanos-vaikams':'Vaikų gide pateiktas amžių atitinkantis kelias į paauglių gidą.',
  'gidai/kaledines-dovanos-seneliams':'Dovana seneliams papildyta muziejaus kaina, datuotu šaltiniu ir šeimos idėjų nuoroda.',
  'gidai/pasirengimas-ranku-liejimui':'Pasiruošimo gidas susietas su atitinkamo rinkinio instrukcijomis ir džiovinimo gidu.',
  'gidai/dziovinimas-ir-isemimas':'Džiovinimo gidas susietas su pasiruošimo instrukcija kitam bandymui.',
  'pristatymas':'Pašalintas klaidingas ribojimas keliems atskirai supakuotiems rinkiniams.',
  'gidai/originalios-kaledines-dovanos':'Pridėta dviem žmonėms tinkama degustacija, su kaina ir vietos bei sudėties patikra.',
  'gidai/kaledines-dovanos-vaikinui':'Pridėtas muziejaus kuponas su įsigijimo ir 6 mėnesių galiojimo sąlygomis.',
  'gidai/kaledines-dovanos-paaugliams':'Pridėtas konkretus žaidimas, žaidėjų skaičius, kaina ir 20 eurų biudžeto skirtumas.'
};
for(const row of rows){
  const note=reviewBySlug[row.slug];assert.ok(note);
  const evidence={
    usefulness:note+' Visas esamas tekstas ir pridėtas kontekstas peržiūrėti lietuviškai.',
    facts:row.slug==='pristatymas'?'Daugiasiunčio Omniva pasirinkimo patvirtinimas ir MULTIPARCEL_2026_10_26.md; kainos ir terminai nepakeisti.':'Pasiūlymų kainos, datos ir sąlygos sutikrintos su tiekėjų šaltiniais 2026-10-27; rinkinių faktai nekeičiami.',
    sources:'Pirminių šaltinių HTTP 200 kopijos ir SHA-256: outputs/memocasting-saltiniai-20261027/manifest.json; senos nuorodos išsaugotos.',
    media:'Naujos medijos nepridėta; esami temų vaizdai individualiai peržiūrėti, atrinkti 40 variantų sutikrinti su baziniu SHA-256.',
    links:'Tikslai patikrinti pagal viešus publishAt; kontekstinių nuorodų ir išorinių šaltinių atvaizdavimas patikrintas bendru parseriu.',
    presentation:'Visas tekstas peržiūrėtas; senelių gido izoliuota Studio peržiūra 1265 px ir 390 px. Tikras svetainės rendereris ir visi desktop/mobile vaizdai dar tikrinami integruojant.'
  };
  await model.recordEditorialReview('memocasting',row.id,{revisionHash:row.revisionHash,reviewer:'codex-content-links-2026-10-27',evidence});
}
const ids=rows.map(r=>r.id), expectedRevisionHashes=Object.fromEntries(rows.map(r=>[r.id,r.revisionHash]));
await model.approveReviewedOverlay('memocasting',{pageIds:ids,expectedRevisionHashes,basePackagePath:output+'/baseline-content-package.private.json',expectedBasePackageSha256:baseSha},'codex-content-links-2026-10-27');
const manifest=JSON.parse(await fs.readFile(baseRelease+'/release-manifest.json','utf8'));
const baselineEvidence={sourceVersion:'e568ee43-ea76-4e97-afd5-ea5bd25cd0f3',deploymentId:'93c18329-0af8-4252-b307-1da23ef58a41',observedAt:'2026-10-27T08:42:00.000Z'};
const result=await model.releaseReviewedOverlay('memocasting',{pageIds:ids,basePackagePath:output+'/baseline-content-package.private.json',expectedBasePackageSha256:baseSha,baseAssetsDirectory:baseRelease+'/assets',expectedBaseAssets:manifest.assets,expectedBaseAssetsSha256:releaseSha(stable(manifest.assets)),baselineEvidence});
const {verifyContentRelease}=await import('../../content-studio/src/content-release.mjs');
const {validateContentPackage}=await import(pathToFileURL(path.join(publicRoot,'scripts/content-package-core.mjs')));
const verification=await verifyContentRelease(path.dirname(result.path),validateContentPackage);
await fs.writeFile(output+'/release-receipt.private.json',JSON.stringify({result,verification,expectedRevisionHashes,baselineEvidence},null,2),{flag:'wx'});
console.log(JSON.stringify({result,verification},null,2));
