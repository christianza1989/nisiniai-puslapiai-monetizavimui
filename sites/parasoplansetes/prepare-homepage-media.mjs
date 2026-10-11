// Isolated design import: no running studio, backend, credentials or shared data.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const core=path.resolve(import.meta.dirname,'../..');
const publicRoot=path.resolve(core,'../dovanos-memorycasting');
const task=path.join(core,'content-studio/tmp/parasoplansetes-design/photo-homepage');
process.env.STUDIO_DATA_DIR=path.join(task,'studio-data');
process.env.STUDIO_OUTPUT_DIR=path.join(task,'studio-output');
process.env.STUDIO_NETWORK_SETTINGS=path.join(publicRoot,'config/niche-network.json');
const {validateContentPackage}=await import(pathToFileURL(path.join(publicRoot,'scripts/content-package-core.mjs')));
const model=await import('../../content-studio/src/model.mjs');
const packagePath=path.join(publicRoot,'content-packages/parasoplansetes/content-package.json');
const original=validateContentPackage(JSON.parse(await readFile(packagePath,'utf8')));
const inputs=JSON.parse(await readFile(path.join(task,'inputs.json'),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const originalHash=hash(await readFile(packagePath));
if(originalHash!=='ed39a2769c2fdd1732696f39076bf827972cc81bb98d385d30d9620149012e7b')throw Error('This one-time import requires the original reviewed package. Preserve the current package; do not run twice.');
await mkdir(path.join(task,'masters'),{recursive:true});
await model.initialize();
const mediaDir=path.join(process.env.STUDIO_DATA_DIR,'media/parasoplansetes');
await mkdir(mediaDir,{recursive:true});
const assets=[...new Map(original.pages.flatMap(p=>p.media).map(a=>[a.id,a])).values()];
for(const a of assets) await copyFile(path.join(publicRoot,'content-packages/parasoplansetes/assets',path.basename(a.src)),path.join(mediaDir,path.basename(a.src)));
const site={...original.site,facts:await readFile(path.join(core,'sites/parasoplansetes.md'),'utf8'),assets,pages:original.pages.map(p=>({...p,status:'approved',publishedRevision:structuredClone(p)}))};
await writeFile(path.join(process.env.STUDIO_DATA_DIR,'sites/parasoplansetes.json'),JSON.stringify(site,null,2));
const roles={},receipt=[];
for(const input of inputs){
  const bytes=await readFile(input.sourcePath);
  await copyFile(input.sourcePath,path.join(task,'masters',`${input.id}.png`));
  await writeFile(path.join(task,'masters',`${input.id}.txt`),input.prompt);
  const asset=await model.saveResponsiveAsset('parasoplansetes',{mime:'image/png',alt:input.alt,rights:'Originalus projekto AI vaizdas, sukurtas pagal savininko patvirtintą maketą. Iliustracinė situacija; ne tikras klientas ir ne gamintojo įrenginio nuotrauka.',credit:'',prompt:input.prompt},bytes);
  roles[input.id]=asset.id;
  receipt.push({role:input.id,referenceBox:input.box,sourceSha256:hash(bytes),source:asset.optimization.sourceBytes,assetId:asset.id,groupId:asset.groupId,prompt:input.prompt,variants:asset.variants.map(({id,src,width,height,bytes,sha256})=>({id,src,width,height,bytes,sha256}))});
}
const home=original.pages.find(p=>p.type==='home');
await model.editPage('parasoplansetes',home.id,{media:[...home.media,...Object.values(roles).map(id=>({id}))]});
await model.approvePage('parasoplansetes',home.id,'Codex / owner-authorized photographic homepage, 2026-10-10');
const exported=await model.exportPackage('parasoplansetes');
const updated=validateContentPackage(JSON.parse(await readFile(exported.path,'utf8')));
for(const old of original.pages){
  const next=updated.pages.find(p=>p.id===old.id);
  if(old.type!=='home'&&JSON.stringify(old)!==JSON.stringify(next))throw Error(`Unrelated page changed: ${old.slug}`);
  for(const key of ['title','description','intent','body','slug','links','publishAt']) if(JSON.stringify(old[key])!==JSON.stringify(next[key]))throw Error(`Approved content changed: ${old.slug}/${key}`);
}
await copyFile(exported.path,packagePath);
for(const r of receipt) for(const a of r.variants) await copyFile(path.join(path.dirname(exported.path),'assets',path.basename(a.src)),path.join(publicRoot,'content-packages/parasoplansetes/assets',path.basename(a.src)));
await writeFile(path.join(publicRoot,'config/parasoplansetes-homepage-media.json'),JSON.stringify(roles,null,2)+'\n');
await writeFile(path.join(core,'sites/parasoplansetes/HOMEPAGE-MEDIA-20261010.json'),JSON.stringify({createdAt:new Date().toISOString(),approval:'Owner approved photographic comp and authorized implementation; asked to exceed its finish.',originalPackageSha256:originalHash,homeRevisionHash:updated.pages.find(p=>p.id===home.id).revisionHash,unchangedNonHomePages:18,bodyAndBusinessFactsUnchanged:true,policy:'responsive-webp-v1',privateOriginals:'Ignored isolated studio-data/media-originals; full prompts stay out of the public package.',assets:receipt},null,2)+'\n');
console.log(JSON.stringify({pages:updated.pages.length,homeMediaVariants:updated.pages.find(p=>p.id===home.id).media.length,assets:receipt.length,variants:receipt.reduce((n,a)=>n+a.variants.length,0),unchangedNonHomePages:18},null,2));
