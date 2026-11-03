import {createHash} from 'node:crypto';
import prepared from '../../content/pdf-product-images.json';
import {pdfAsset} from './pdf-assets';
import type {Product,Configuration} from './types';

type PreparedImage={code:string;asset:string;sha256:string;size:number};
type Images={schemaVersion:number;models:Record<string,PreparedImage>};

/** A missing legacy photo may use only the sealed photo of this exact sample. */
export function createProductPdfImageLoader(images:Images,readAsset:(asset:string)=>Promise<Buffer>){
 return async(product:Pick<Product,'id'|'configurations'>,configuration:Pick<Configuration,'id'|'code'>,legacyImage:string)=>{
  if(!/^\/media\/configurator\/\d+\.jpg$/.test(legacyImage))throw Error('Invalid local product image');
  try{return await readAsset(legacyImage);}catch(error){
   const sample=product.configurations.find(c=>c.id===configuration.id&&c.code===configuration.code);
   const image=sample&&images.models[product.id+':'+sample.id];
   if(!image)throw error;
   if(images.schemaVersion!==1||image.code!==configuration.code||!/^[a-f0-9]{64}$/.test(image.sha256)||image.asset!=='/media/pdf-products/'+image.sha256+'.png'||!Number.isSafeInteger(image.size)||image.size<=0||image.size>16*1024*1024)throw Error('Invalid prepared PDF image binding');
   const bytes=await readAsset(image.asset);
   if(bytes.length!==image.size||createHash('sha256').update(bytes).digest('hex')!==image.sha256)throw Error('Prepared PDF image source changed');
   return bytes;
  }
 };
}
export const productPdfImage=createProductPdfImageLoader(prepared,pdfAsset);
