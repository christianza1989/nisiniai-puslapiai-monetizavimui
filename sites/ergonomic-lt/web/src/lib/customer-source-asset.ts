import {readFile} from 'node:fs/promises';
import path from 'node:path';
export function sourceAssetPath(asset:string){
 if(!/^\/(?:models|media)\/[A-Za-z0-9_./%=+-]+$/.test(asset)||asset.split('/').some(p=>p==='..'||/%2e|%2f|%5c/i.test(p)))throw Error('Invalid source asset');return asset;
}
export async function customerSourceAsset(asset:string):Promise<Uint8Array>{
 sourceAssetPath(asset);
 try{return await readFile(path.join(process.cwd(),'public',asset));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 const response=await fetch('https://ergonomic-preview.pinet-azprekyba.workers.dev'+asset.replaceAll('=','%3D').replaceAll('+','%2B'),{redirect:'error'});if(!response.ok)throw Error('Source asset unavailable');return new Uint8Array(await response.arrayBuffer());
}
