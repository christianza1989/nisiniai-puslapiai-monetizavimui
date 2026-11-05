import {TEXT_REVIEW_ASSET_ORIGIN} from '../lib/text-review-asset-origin';
import {referenceAsset} from './text-review-reference-assets';
import {RUNTIME_TRANSPORT_MAX_BYTES} from '../lib/runtime-transport-limits.mjs';
/** Metadata only; full source SHA is still validated by the canonical loaders. */
export async function configuratorRuntimeAsset(asset:string):Promise<Uint8Array>{
 if(!/^\/models\/configurator\/(?:runtime|structure|components)\/K[A-Z0-9]+-[a-f0-9]{20}\.json$/.test(asset))throw Error('Invalid configurator runtime asset');
 const response=await referenceAsset(new Request(TEXT_REVIEW_ASSET_ORIGIN+asset));
 if(!response.ok)throw Error('Configurator runtime asset unavailable: '+response.status);
 if(Number(response.headers.get('Content-Length'))>RUNTIME_TRANSPORT_MAX_BYTES)throw Error('Runtime source too large');
 const reader=response.body?.getReader();if(!reader)throw Error('Empty runtime source');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>RUNTIME_TRANSPORT_MAX_BYTES){await reader.cancel();throw Error('Runtime source too large');}chunks.push(value);}
 const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
