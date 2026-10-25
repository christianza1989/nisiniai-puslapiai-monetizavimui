import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {localChairQA} from '@/lib/chair-local-qa';
export async function GET(_:Request,{params}:{params:Promise<{file:string}>}){
 const models=await localChairQA();if(!models)return new Response(null,{status:404});
 const {file}=await params;if(!/^K[A-Z0-9]+-[a-f0-9]{20}\.glb$/.test(file))return new Response(null,{status:404});
 for(const entry of Object.values(models)){
  const asset=entry.runtime.family.anchors.map(a=>a.geometry).find(g=>g.asset==='/models/configurator/structure/'+file);if(!asset)continue;
  const bytes=await fs.readFile(path.join(entry.directory,'assets',file));
  if(createHash('sha256').update(bytes).digest('hex')!==asset.assetSha256)throw Error('Local QA geometry changed');
  return new Response(bytes,{headers:{'content-type':'model/gltf-binary','cache-control':'private, no-store','x-robots-tag':'noindex, nofollow'}});
 }
 return new Response(null,{status:404});
}
