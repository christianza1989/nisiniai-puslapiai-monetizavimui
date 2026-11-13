import {readFile} from 'node:fs/promises';
import path from 'node:path';
export async function configuratorRuntimeAsset(asset:string):Promise<Uint8Array>{
 if(!/^\/models\/configurator\/(?:runtime|structure|components)\/K[A-Z0-9]+-[a-f0-9]{20}\.json$/.test(asset)&&!/^\/models\/configurator\/(?:chairs\/K[A-Z0-9]+-[a-z0-9-]+|observed-desks\/K[A-Z0-9]+)\/review-[a-f0-9]{20}\.json$/.test(asset))throw Error('Invalid configurator runtime asset');
 const local=process.env.ERGONOMIC_LOCAL_ASSET_ORIGIN;
 if(local){
  if(!/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(local))throw Error('Invalid local configurator asset origin');
  const response=await fetch(local+asset);if(!response.ok)throw Error('Local configurator runtime unavailable');
  return new Uint8Array(await response.arrayBuffer());
 }
 return readFile(path.join(process.cwd(),'public',asset));
}
