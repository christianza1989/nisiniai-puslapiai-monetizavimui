import {readFile} from 'node:fs/promises';
import path from 'node:path';
export async function configuratorRuntimeAsset(asset:string):Promise<Uint8Array>{
 if(!/^\/models\/configurator\/(?:runtime|structure)\/K[A-Z0-9]+-[a-f0-9]{20}\.json$/.test(asset))throw Error('Invalid configurator runtime asset');
 return readFile(path.join(process.cwd(),'public',asset));
}
