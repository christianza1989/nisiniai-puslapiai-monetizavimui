import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin=process.argv[2]||'http://127.0.0.1:3001';
const data=JSON.parse(await fs.readFile('content/configurator-expanded.json','utf8'));
const proof=JSON.parse(await fs.readFile('.impeccable/review/configurator-render-quality/source-quality.json','utf8'));
const result={origin,bases:[],textures:[],pages:[]};
for(const family of data.families)for(const anchor of family.anchors){
  const response=await fetch(origin+anchor.geometry.asset+'?v='+anchor.geometry.assetSha256.slice(0,12));
  const bytes=Buffer.from(await response.arrayBuffer());
  if(!response.ok||createHash('sha256').update(bytes).digest('hex')!==anchor.geometry.assetSha256)throw Error('Served base mismatch: '+anchor.id);
  result.bases.push({family:family.id,anchor:anchor.id,bytes:bytes.length,sha256:anchor.geometry.assetSha256,matched:true});
}
for(const texture of proof.textures){
  const url=texture.file.replace(/^public/,'');const response=await fetch(origin+url),bytes=Buffer.from(await response.arrayBuffer());
  if(!response.ok||createHash('sha256').update(bytes).digest('hex')!==texture.assetSha256)throw Error('Served texture mismatch: '+url);
  result.textures.push({url,bytes:bytes.length,matched:true});
}
for(const model of ['xilium','souly']){
  const url='/produktai/kedes/'+model+'-darbo-kedes/',response=await fetch(origin+url),html=await response.text();
  if(!response.ok||!html.includes('3D konfigūratorius'))throw Error('Product page unavailable');result.pages.push({url,status:response.status});
}
await fs.writeFile('.impeccable/review/configurator-render-quality/http-check.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({bases:result.bases.length,textures:result.textures.length,pages:result.pages.length,matched:true}));
