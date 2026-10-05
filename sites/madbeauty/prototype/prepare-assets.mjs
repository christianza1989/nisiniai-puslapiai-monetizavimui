import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {optimizeRaster} from '../../../content-studio/src/image-pipeline.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const input=JSON.parse(await readFile(path.join(root,'../asset-inputs.json'),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const alts={'nails-neutral':'Neutralios spalvos trumpų nagų manikiūro iliustracija','nails-color':'Koralo spalvos nagai laikant keraminį puodelį','nails-french':'Plonas prancūziško manikiūro kraštelis','studio':'Šviesios demonstracinės manikiūro studijos interjeras','hair':'Plaukų priežiūros procedūros iliustracija','brows':'Antakių šukavimo procedūros iliustracija','massage':'Rami demonstracinė masažo erdvė','workspace':'Meistro darbo stalas su spalvų pavyzdžiais','pedicure':'Tvarkinga demonstracinė pedikiūro darbo vieta','skincare':'Kosmetinės veido kaukės užtepimo iliustracija','lashes':'Blakstienų šukavimo procedūros iliustracija'};
await mkdir(path.join(root,'public/images'),{recursive:true});
const assets=[];
for(const s of input.assets) {
  const original=await readFile(path.join(root,'private-originals',s.id+'-v1.png'));
  const optimized=await optimizeRaster(original,'image/png');
  const variants=[];
  for(const v of optimized.variants) {const file=s.id+'-'+v.width+'.webp';await writeFile(path.join(root,'public/images',file),v.bytes);variants.push({file:'images/'+file,width:v.width,height:v.height,bytes:v.bytes.length,sha256:hash(v.bytes)});}
  assets.push({id:s.id,status:'GENERATED_REVIEWED_OPTIMIZED',use:'private-demo/editorial-illustration-only',generator:'built-in ImageGen',prompt:s.prompt,alt:alts[s.id],source:{file:'private-originals/'+s.id+'-v1.png',...optimized.source,bytes:original.length,sha256:hash(original)},crop:{card:'3/2',gallery:'3/2',square:'1/1',objectPosition:'50% 50%'},rights:'Original AI illustration; no competitor media. Not a real provider portfolio.',variants,policy:optimized.policy,reviewer:'root sequential visual review',reviewNote:s.id==='hair'?'Illustrative scene, not an instructional cutting technique; no real result claim.':'Appropriate original illustration for stated slot; actual mobile crop reviewed in UI kit where used.'});
}
await writeFile(path.join(root,'public/media.json'),JSON.stringify({version:1,privateDemo:true,assets},null,2)+'\n');
await writeFile(path.join(root,'ASSET_MANIFEST.json'),JSON.stringify({version:1,privateDemo:true,assets},null,2)+'\n');
console.log(JSON.stringify({masters:assets.length,variants:assets.reduce((n,a)=>n+a.variants.length,0),pipeline:'shared optimizeRaster, no per-site optimizer'}));
