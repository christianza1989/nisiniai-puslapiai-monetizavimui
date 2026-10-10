import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {optimizeRaster} from '../../../content-studio/src/image-pipeline.mjs';
const site=path.resolve(import.meta.dirname,'..'),publicRoot=path.join(site,'prototype/public'),root=path.join(site,'cloudflare/output/auth-social-20261011/originals');
await mkdir(root,{recursive:true});
const specs=JSON.parse(await readFile(path.join(import.meta.dirname,'PROMPTS.json'))),registry=JSON.parse(await readFile(path.join(publicRoot,'media.json'))),manifest=[];
for(const s of specs){
 const bytes=await readFile(s.path),optimized=await optimizeRaster(bytes,'image/png');
 await copyFile(s.path,path.join(root,s.name+'.png'));const variants=[];
 for(const v of optimized.variants){const file='images/'+s.name+'-'+v.width+'.webp';await writeFile(path.join(publicRoot,file),v.bytes);variants.push({file,width:v.width,height:v.height,bytes:v.bytes.length,sha256:createHash('sha256').update(v.bytes).digest('hex')});}
 const item={id:s.name,alt:'',variants};registry.assets=registry.assets.filter(a=>a.id!==s.name);registry.assets.push(item);
 manifest.push({...s,source:optimized.source,policy:optimized.policy,variants,originalSha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(path.join(publicRoot,'media.json'),JSON.stringify(registry,null,2));
await writeFile(path.join(root,'MANIFEST.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({state:'READY',assets:manifest.length,variants:manifest.reduce((n,a)=>n+a.variants.length,0),root}));
