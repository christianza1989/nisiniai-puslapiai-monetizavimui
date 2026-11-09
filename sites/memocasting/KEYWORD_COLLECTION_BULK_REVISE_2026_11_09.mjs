// Revise isolated drafts; this is not a review or publication.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const core=`${root}/memo-keywords-core-20261109`,pub=`${root}/memo-keywords-public-20261109`;
process.env.STUDIO_DATA_DIR=`${root}/memo-keywords-bulk-studio-20261109/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${root}/memo-keywords-bulk-studio-20261109/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${core}/content-studio/src/model.mjs`));
let site=await model.getSite('memocasting');
const get=s=>{const p=site.pages.find(x=>x.slug===s);assert.ok(p,s);return p;};
const birthday=get('dovanos/gimtadieniui/moterims');
const before='Rankų liejimui reikia bent dviejų dalyvių, pasiruošimo ir laiko pagal instrukciją.';
const after='Drauge kuriamam rankų liejiniui reikia dalyvių, pasiruošimo ir laiko pagal instrukciją.';
if(birthday.body.some(b=>b.text?.includes(before))) await model.editPage('memocasting',birthday.id,{body:birthday.body.map(b=>b.text?{...b,text:b.text.replace(before,after)}:b)});
for(const [collection,fallback] of [
 ['dovanos/valentino-dienai','gidai/dovana-porai'],
 ['dovanos/seneliui','gidai/dovanos-seneliams'],
 ['dovanos/mociutei','gidai/dovanos-seneliams'],
 ['dovanos/mamos-dienai','gidai/dovanos-mamai']
]){
 const p=get(collection),target=get(fallback);
 assert.equal(p.links.filter(x=>x.label==='susijusiame dovanų gide').length,1);
 await model.editPage('memocasting',p.id,{links:p.links.map(x=>x.label==='susijusiame dovanų gide'?{...x,targetPageId:target.id}:x)});
}
for(const [parent,child,label] of [
 ['dovanos/mamai','dovanos/mamos-dienai','dovanos Mamos dienai'],
 ['dovanos/mamai','dovanos/gimtadieniui/mamai','gimtadienio dovana mamai'],
 ['dovanos/vyrams','dovanos/gimtadieniui/vyrui','gimtadienio dovana vyrui'],
 ['dovanos/moterims','dovanos/gimtadieniui/moterims','gimtadienio dovanos moterims']
]){
 const current=(await model.getSite('memocasting')).pages.find(p=>p.slug===parent);
 if(!current.links.some(l=>l.targetPageId===get(child).id))await model.editPage('memocasting',current.id,{body:[...current.body,{type:'paragraph',text:`Atskirai aptariame, kaip pasirinkti: ${label}.`}],links:[...current.links,{targetPageId:get(child).id,label}]});
}
site=await model.getSite('memocasting');
console.log(JSON.stringify({state:'draft-revision-only',birthdayRevision:model.revisionHash(site.pages.find(p=>p.id===birthday.id))}));
