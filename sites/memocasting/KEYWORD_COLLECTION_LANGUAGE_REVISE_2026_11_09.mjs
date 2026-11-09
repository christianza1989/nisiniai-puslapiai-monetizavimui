// Apply reviewed wording improvements without approving draft revisions.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees', core=`${root}/memo-keywords-core-20261109`,pub=`${root}/memo-keywords-public-20261109`;
process.env.STUDIO_DATA_DIR=`${root}/memo-keywords-bulk-studio-20261109/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${root}/memo-keywords-bulk-studio-20261109/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${core}/content-studio/src/model.mjs`));
for(const [slug,file,prefix] of [
 ['dovanos/kaledoms/mamai','kaledines-dovanos-mamai.md','Jei svarstote kelių šeimos narių kompoziciją'],
 ['dovanos/seimai','dovanos-seimai.md','Išbandykite rankų padėtį tuščiame inde. Visi dalyviai'],
 ['dovanos/kaledoms/seimai','kaledines-dovanos-seimai.md','Jei dalyvauja vaikas, veiklą turi prižiūrėti'],
 ['dovanos/personalizuotos','personalizuotos-dovanos.md','Skulptūros nuotraukos rodo galimą rezultatą']
]){
 const source=await readFile(`${core}/sites/memocasting/collection-drafts/${file}`,'utf8');
 const replacement=source.split(/\r?\n/).find(line=>line.startsWith(prefix));assert.ok(replacement,slug);
 const p=(await model.getSite('memocasting')).pages.find(p=>p.slug===slug);assert.ok(p);
 assert.equal(p.body.filter(b=>b.text?.startsWith(prefix)).length,1);
 await model.editPage('memocasting',p.id,{body:p.body.map(b=>b.text?.startsWith(prefix)?{...b,text:replacement}:b)});
 console.log(slug,model.revisionHash((await model.getSite('memocasting')).pages.find(x=>x.id===p.id)));
}
