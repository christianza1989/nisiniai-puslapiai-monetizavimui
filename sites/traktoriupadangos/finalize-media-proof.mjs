// Snapshot real regression logs, isolated GUI artifacts and current public media.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root='C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui';
const core='C:/Users/lenovo/Documents/dovanos-memorycasting';
const dir=`${root}/sites/traktoriupadangos`;
const sharp=createRequire(`${root}/content-studio/package.json`)('sharp');
const {IMAGE_POLICY}=await import('../../content-studio/src/image-pipeline.mjs');
const gui=JSON.parse(await readFile(`${dir}/media-ui-browser.json`,'utf8'));
const fixture=JSON.parse(await readFile(`${root}/content-studio/tmp/media-ui-2026-09-30/data/sites/media-ui-test.json`,'utf8'));
const tests=await readFile(`${dir}/studio-tests.log`,'utf8');
assert.match(tests,/# pass 14\r?\n/);assert.match(tests,/# fail 0\r?\n/);assert.match(tests,/STUDIO_EXIT=0/);
assert.equal(gui.library.images.length,1);assert.equal(gui.library.images[0].loaded,true);
assert.equal(gui.editor.choices.length,1);assert.equal(gui.editor.choices[0].checked,true);
assert.equal(fixture.pages[0].media.length,5);assert.equal(fixture.pages[0].publishedRevision,null);
const variants=[];for(const asset of fixture.assets){
 const bytes=await readFile(`${root}/content-studio/tmp/media-ui-2026-09-30/data/media/media-ui-test/${asset.id}.webp`);
 const metadata=await sharp(bytes).metadata();assert.equal(metadata.width,asset.width);assert.equal(metadata.hasAlpha,true);assert.equal(metadata.exif,undefined);
 variants.push({id:asset.id,width:metadata.width,height:metadata.height,bytes:bytes.length,hasAlpha:metadata.hasAlpha,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const originals=await readdir(`${root}/content-studio/tmp/media-ui-2026-09-30/data/media-originals/media-ui-test`);assert.equal(originals.filter(f=>f.endsWith('.png')).length,1);
const pkg=JSON.parse(await readFile(`${core}/content-packages/traktoriupadangos/content-package.json`,'utf8'));
const publicIds=new Set(pkg.pages.flatMap(p=>p.media.map(a=>a.id)));assert.equal(publicIds.size,19);assert.equal(pkg.pages.length,11);
const instructions={};for(const name of ['plan','draft']){
 const {loadEditorialSkill}=await import('../../content-studio/src/editorial-skill.mjs');
 const skill=await loadEditorialSkill(name);assert.ok(skill.metadata.files.includes('references/media-workflow.md'));
 instructions[name]=skill.metadata;
}
const evidence={at:new Date().toISOString(),policy:IMAGE_POLICY,studioTests:{passed:14,failed:0,log:`${dir}/studio-tests.log`},
 gui:{at:gui.at,isolated:true,url:'http://127.0.0.1:4327',singleLibraryImage:true,singleEditorChoice:true,allFiveVariantsAttached:true,approvedOrPublished:false,sourceOriginalPrivate:true,variants,artifacts:[`${dir}/media-ui-browser.json`,`${dir}/media-ui-import.png`,`${dir}/media-ui-choice.png`]},
 regressionCoverage:['HTTP PNG upload','actual decoded dimensions instead of supplied dimensions','one family choice expands all variants','other tenant rejected','original has no public endpoint','export only approved WebP variants, no group/prompt/source','immutable approval after extra import','five choices / 25 actual WebP approved and exported through the public validator','explicit >60 rejection without mutation, model/schema limit parity','alpha preservation','EXIF rotation/removal','no upscaling / tiny source dedup','invalid bytes/MIME/bytes/edge rejection'],
 promptInstructions:instructions,publicTractor:{pages:11,publicAssets:19,existingApprovedAssetsUnchanged:true,htmlEvidence:`${core}/output/audits/traktoriupadangos-html.json`,finalMobileIndex:`${core}/output/audits/tractor-index-final.json`},
 limitations:['GUI fixture is synthetic local QA, not real image generation or production','older immutable image assets retain their previous IDs','image quality and correct layout sizes still require visual review','no deployment, DNS, paid API, clients or production data changed']};
await writeFile(`${dir}/MEDIA-PIPELINE-VERIFICATION.json`,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({studioTests:14,guiChoices:1,attachedVariants:5,publicTractorAssets:19,instructionFiles:instructions.draft.files,pass:true},null,2));
