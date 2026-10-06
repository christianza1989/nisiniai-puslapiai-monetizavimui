import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {optimizeRaster} from '../../../content-studio/src/image-pipeline.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),base=new URL('./',import.meta.url),publicRoot=new URL('./public/',base),sourceRoot=new URL('./private-originals/profiles-v2/',base);
await mkdir(sourceRoot,{recursive:true});
const plan=JSON.parse(await readFile(new URL('PROFILE_ASSET_PLAN_V2.json',base),'utf8')),batches=(await readdir(base)).filter(n=>/^PROFILE_GENERATION_BATCH_\d+\.json$/.test(n)).sort(),sources=[];
for(const f of batches)sources.push(...JSON.parse(await readFile(new URL(f,base),'utf8')).assets);
const unique=[...new Map(sources.map(a=>[a.id,a])).values()],file=new URL('app-media.json',publicRoot),manifest=JSON.parse(await readFile(file,'utf8')),journal=[];
for(const source of unique){
 const expected=plan.assets.find(a=>a.id===source.id);if(!expected||!source.sourcePath||!source.review||/pending|unreviewed/i.test(source.review))throw Error('Missing planned source or accepted pixel review');
 const original=await readFile(source.sourcePath),sourceHash=hash(original),prior=manifest.assets.find(a=>a.id===source.id);
 if(prior&&prior.source?.sha256===sourceHash){journal.push(prior);continue;}
 if(prior)throw Error('Immutable ID already has different bytes');
 await copyFile(source.sourcePath,new URL(source.id+'.png',sourceRoot));const out=await optimizeRaster(original,'image/png'),variants=[];
 for(const v of out.variants){const name='images/'+source.id+'-'+v.width+'.webp';await writeFile(new URL(name,publicRoot),v.bytes);variants.push({file:name,width:v.width,height:v.height,bytes:v.bytes.length,sha256:hash(v.bytes)});}
 const a={id:source.id,alt:source.alt||expected.alt,profileIndex:expected.profileIndex,type:expected.type,use:'replaceable-fictional-profile',rights:'Original AI illustration. Fictional person, work sample and location; not real provider evidence.',generator:'built-in ImageGen',prompt:source.prompt,source:{file:'private-originals/profiles-v2/'+source.id+'.png',...out.source,bytes:original.length,sha256:sourceHash},variants,policy:out.policy,crop:{avatar:'50% 40%',card:'50% 35%',gallery:'50% 50%'},review:source.review};manifest.assets.push(a);journal.push(a);
}
await writeFile(file,JSON.stringify(manifest,null,2)+'\n');await writeFile(new URL('PROFILE_ASSET_MANIFEST_V2.json',base),JSON.stringify({date:'2026-10-05',expectedProfiles:40,expectedDistinctAssets:120,importedAssets:journal.length,complete:journal.length===120,assets:journal},null,2)+'\n');console.log(JSON.stringify({importedAssets:journal.length,variants:journal.reduce((n,a)=>n+a.variants.length,0),complete:journal.length===120,pipeline:'responsive-webp-v1'}));
