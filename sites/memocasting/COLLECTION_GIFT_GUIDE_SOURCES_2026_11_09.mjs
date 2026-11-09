// Revalidate the six actual primary vendor pages before calling this script.
// Updates only the isolated guide draft; never creates review or approval.
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const pub=`${root}/memo-googlepay-privacy-public-20261105`;
const work=`${root}/memo-collection-draft-data-20261109`;
process.env.STUDIO_DATA_DIR=`${work}/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${work}/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${root}/memo-content-recovery-core-20261105/content-studio/src/model.mjs`));
const site=await model.getSite('memocasting');
const page=site.pages.find(p=>p.slug==='gidai/dovanos-moterims');assert.ok(page && !page.approval);
const body=structuredClone(page.body);
const bookmark=body.find(b=>b.type==='paragraph'&&b.text.startsWith('Medinis skirtukas MANDALA'));
assert.ok(bookmark);
bookmark.text='Medinis skirtukas MANDALA gali būti nedidelė dovana žmogui, kuris mėgsta skaityti. 2026 m. lapkričio 9 d. pardavėjas nurodė, kad šio skirtuko neparduoda, todėl prieš rinkdamiesi patikrinkite, ar jis vėl siūlomas. 20 € knygų kuponas tinka tada, kai nežinote turimų knygų ar norimo leidimo. Patikrinkite galiojimą ir tai, ar konkrečioje parduotuvėje yra jos dominančių autorių. Kuponas netampa universaliu pinigų pakaitalu visiems knygynams.';
const bottle=body.find(b=>b.type==='paragraph'&&b.text.startsWith('QUECHUA „900“'));
assert.ok(bottle);bottle.text=bottle.text.replace('žalios spalvos termosinė gertuvė','termosinė gertuvė');
assert.equal(page.externalLinks.length,6);
const externalLinks=page.externalLinks.map(l=>({...l,verified:true,reason:'2026 m. lapkričio 9 d. patikrintas atitinkamas pardavėjo pasiūlymo puslapis. Kaina ir prieinamumas gali pasikeisti.'}));
const updated=await model.editPage('memocasting',page.id,{body,externalLinks});
assert.equal(updated.approval,null);
console.log(JSON.stringify({slug:updated.slug,revisionHash:model.revisionHash(updated),state:'source-checked-private-draft-no-editorial-review-or-approval'}));
