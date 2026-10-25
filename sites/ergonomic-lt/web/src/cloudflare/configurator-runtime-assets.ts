import {env} from 'cloudflare:workers';
export async function configuratorRuntimeAsset(asset:string):Promise<Uint8Array>{
 if(!/^\/models\/configurator\/(?:runtime|structure|components)\/K[A-Z0-9]+-[a-f0-9]{20}\.json$/.test(asset))throw Error('Invalid configurator runtime asset');
 // The binding resolves only the path. localhost also passes Vite's local
 // Host allowlist, so local Workers exercise the same immutable asset loader.
 const response=await env.ASSETS.fetch(new Request('https://localhost'+asset));
 if(!response.ok)throw Error('Configurator runtime asset unavailable: '+response.status+' '+asset);
 return new Uint8Array(await response.arrayBuffer());
}
