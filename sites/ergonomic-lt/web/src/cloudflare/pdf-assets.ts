import {env} from 'cloudflare:workers';
export async function pdfAsset(asset:string):Promise<Buffer> {
  if(asset!=='/fonts/manrope.ttf'&&!/^\/media\/configurator\/\d+\.jpg$/.test(asset))throw Error('Invalid PDF asset');
  const response=await env.ASSETS.fetch(new Request('https://assets.internal'+asset));
  if(!response.ok)throw Error('PDF asset unavailable');
  return Buffer.from(await response.arrayBuffer());
}
