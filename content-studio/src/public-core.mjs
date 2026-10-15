// Deployment-owned companion resolution; never selected by a customer payload.
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export function publicCoreDirectory(env=process.env){
  const configured=env.STUDIO_PUBLIC_CORE_DIR ?? env.PINET_PUBLIC_CORE_PATH;
  const network=env.STUDIO_NETWORK_SETTINGS;
  if(configured!==undefined){
    if(!configured||!path.isAbsolute(configured))throw Error('studio_public_core_absolute_path_required');
    return path.resolve(configured);
  }
  if(network!==undefined){
    if(!network||!path.isAbsolute(network))throw Error('studio_network_absolute_path_required');
    return path.resolve(network,'../..');
  }
  return path.resolve(import.meta.dirname,'../../../dovanos-memorycasting');
}

export async function publicMedia(env=process.env){
  return import(pathToFileURL(path.join(publicCoreDirectory(env),'lib/niche-media.mjs')).href);
}
