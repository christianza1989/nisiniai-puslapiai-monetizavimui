import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {optimizeRaster} from '../../../content-studio/src/image-pipeline.mjs';
const input=process.argv[2]||'hero-candidates/PROMPTS.json',specs=JSON.parse(await readFile(path.resolve(import.meta.dirname,input))),root=path.resolve(import.meta.dirname,'../cloudflare/output/home-services-20261011/hero-candidates');await mkdir(root,{recursive:true});
const manifest=[];
for(const s of specs){assert.match(s.name,/^[a-z-]+$/);assert.ok(path.resolve(s.path).startsWith('C:\\Users\\Lenovo\\.codex\\generated_images\\'));const bytes=await readFile(s.path),optimized=await optimizeRaster(bytes,'image/png');await copyFile(s.path,path.join(root,s.name+'.png'));const variants=[];
 for(const v of optimized.variants){const filename=s.name+'-'+v.width+'.webp';await writeFile(path.join(root,filename),v.bytes);variants.push({file:filename,width:v.width,height:v.height,bytes:v.bytes.length,sha256:createHash('sha256').update(v.bytes).digest('hex')});}
 manifest.push({...s,original:s.name+'.png',source:optimized.source,originalSha256:createHash('sha256').update(bytes).digest('hex'),policy:optimized.policy,variants});
}
await writeFile(path.join(root,path.basename(input).replace('PROMPTS','MANIFEST')),JSON.stringify(manifest,null,2));console.log(JSON.stringify({state:'READY',photos:manifest.length,root,variants:manifest.reduce((n,a)=>n+a.variants.length,0)}));
