// Adds inspected generated images through the real media/revision model.
// Historical one-off evidence only. New niche images use scripts/import-image.mjs
// / saveResponsiveAsset and MEDIA_CORE.md, not a copied per-domain resize script.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {initialize,getSite,saveAsset,editPage,approvePage,exportPackage,OUTPUT} from '../src/model.mjs';
const require=createRequire('C:/Users/lenovo/Documents/dovanos-memorycasting/package.json');
const sharp=require('sharp');
const root='C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui';
const dir=`${root}/sites/traktoriupadangos`;
const sources={
 'selection-field':'exec-bc223319-aafb-41cd-88d1-0bf0a9b9d9cc.png',
 'sidewall-marking':'exec-c639faaf-3db1-4ae4-8e30-dae6ff4ee71c.png',
 'construction-pair':'exec-6724b674-8407-4bf6-8541-66e2eaaa1f13.png',
 'road-context':'exec-a5dd22ba-c54d-400e-b99e-9229ceb2151b.png'
};
const prompts=JSON.parse(await readFile(`${dir}/media-prompts-2026-09-30.json`,'utf8'));
await initialize();const siteId='traktoriupadangos';const before=await getSite(siteId);
await mkdir(path.join(OUTPUT,'site-snapshots'),{recursive:true});
await writeFile(path.join(OUTPUT,'site-snapshots',`${siteId}-before-images-${Date.now()}.json`),JSON.stringify(before,null,2));
await mkdir(`${dir}/media`,{recursive:true});const variants={};const evidence=[];
for(const prompt of prompts){
 const source=`C:/Users/lenovo/.codex/generated_images/01a0ec4c-c381-7c53-ac6e-8fc4e2755dc5/${sources[prompt.key]}`;
 const saved=`${dir}/media/${prompt.key}-source.png`;await copyFile(source,saved);
 const input=await readFile(saved);variants[prompt.key]=[];
 for(const width of [1200,800,640,360]){
  const existing=before.assets.find(a=>a.alt===prompt.alt&&a.width===width&&a.prompt===prompt.prompt);
  if(existing){variants[prompt.key].push(existing);continue;}
  const image=await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:width===800?75:width===360?78:82,effort:6}).toBuffer({resolveWithObject:true});
  const asset=await saveAsset(siteId,{mime:'image/webp',alt:prompt.alt,width:image.info.width,height:image.info.height,
    credit:'Original OpenAI ImageGen editorial illustration, 2026-09-30.',
    rights:'Originalus šiam projektui sukurtas vaizdas; nėra kliento projekto, tiekėjo ar mūsų sandėlio nuotrauka.',prompt:prompt.prompt},image.data);
  variants[prompt.key].push(asset);evidence.push({key:prompt.key,source:saved,id:asset.id,width:asset.width,height:asset.height,bytes:image.data.length});
 }
}
for(const prompt of prompts.filter(x=>x.slug)){
 const site=await getSite(siteId),page=site.pages.find(p=>p.slug===prompt.slug);
 const unresolved=(page.factChecks||[]).filter(x=>!x.startsWith('Visual review:'));
 if(unresolved.length)throw new Error(`Unresolved factual review for ${page.slug}`);
 await editPage(siteId,page.id,{media:variants[prompt.key],factChecks:[]});
 await approvePage(siteId,page.id,'codex-editorial-and-visual-review-2026-09-30');
}
const site=await getSite(siteId),home=site.pages.find(p=>p.type==='home');
const road=variants['road-context'];
const body=home.body.filter(b=>b.type!=='image');
const at=body.findIndex(b=>b.type==='heading'&&b.level===2&&b.text.includes('Kur ir kaip'));
if(at<0)throw new Error('Current work-conditions heading not found; do not guess placement');
body.splice(at+1,0,{type:'image',assetId:road[0].id});
const oldHero=home.media.filter(m=>m.width/m.height<1);
if((home.factChecks||[]).length)throw new Error('Unresolved homepage factual review');
await editPage(siteId,home.id,{body,media:[...oldHero,...road,...prompts.filter(p=>p.slug).map(p=>variants[p.key].at(-1))],factChecks:[]});
await approvePage(siteId,home.id,'codex-editorial-and-visual-review-2026-09-30');
await exportPackage(siteId);
await writeFile(`${dir}/MEDIA-2026-09-30.json`,JSON.stringify({at:new Date().toISOString(),tool:'built-in image_gen',inspected:true,review:'Subjects, plausible wheel geometry, absence of brands and the exact sidewall 650/60 R38 inspected. Construction pair is visual context, not a cutaway or proof of construction. No real client or stocked-product implication.',variants:Object.entries(variants).flatMap(([key,assets])=>assets.map(a=>({key,id:a.id,width:a.width,height:a.height,source:`media/${key}-source.png`}))),newAssetBytes:evidence,promptsFile:'media-prompts-2026-09-30.json',visibleGeneratorBadges:false},null,2));
console.log(JSON.stringify({siteId,assets:evidence.length,guideImages:3,homepageImages:5}));
