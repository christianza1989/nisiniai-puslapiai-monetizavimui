// Scoped private draft correction after observing exact desktop/mobile H1.
// No review, approval, release, or deployment is created.
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const pub=`${root}/memo-christmas-public-20261109`;
process.env.STUDIO_DATA_DIR=`${root}/memo-christmas-draft-data-20261109/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${root}/memo-christmas-draft-data-20261109/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${root}/memo-christmas-core-20261109/content-studio/src/model.mjs`));
const site=await model.getSite('memocasting');
const page=site.pages.find(p=>p.slug==='dovanos/kaledoms');
assert.ok(page&&!page.approval);
assert.equal(model.revisionHash(page),'4d6658c7059f6fb9e2c2874a9010a33862f00f258eb7df5c07f9edae32b3452b');
const updated=await model.editPage('memocasting',page.id,{title:'Kalėdinės dovanos: rankų liejimo rinkiniai'});
assert.equal(updated.approval,null);
console.log(JSON.stringify({slug:updated.slug,id:updated.id,revisionHash:model.revisionHash(updated),state:'draft-title-corrected-no-review-or-approval'}));
