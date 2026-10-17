import {env} from 'cloudflare:workers';
export async function configuratorRuntimeAsset(asset:string):Promise<Uint8Array>{
 if(!/^\/models\/configurator\/(?:runtime|structure)\/K[A-Z0-9]+-[a-f0-9]{20}\.json$/.test(asset))throw Error('Invalid configurator runtime asset');
 const response=await env.ASSETS.fetch(new Request('https://assets.internal'+asset));
 if(!response.ok)throw Error('Configurator runtime asset unavailable');
 return new Uint8Array(await response.arrayBuffer());
}
