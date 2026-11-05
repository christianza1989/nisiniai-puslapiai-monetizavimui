import {env} from 'cloudflare:workers';
import {referenceAsset} from './text-review-reference-assets';
export async function pdfAsset(asset:string):Promise<Buffer> {
  if(asset!=='/fonts/manrope.ttf'&&!/^\/media\/configurator\/\d+\.jpg$/.test(asset)&&!/^\/media\/pdf-products\/[a-f0-9]{64}\.png$/.test(asset))throw Error('Invalid PDF asset');
  const request=new Request('https://assets.internal'+asset);
  let response=await env.ASSETS.fetch(request);if(response.status===404&&env.REFERENCE_ASSETS)response=await referenceAsset(request);
  if(!response.ok)throw Error('PDF asset unavailable');
  return Buffer.from(await response.arrayBuffer());
}
