import sharp from 'sharp';
import {IMAGE_POLICY,rejectAnimatedRaster} from './image-policy.mjs';
export {IMAGE_POLICY} from './image-policy.mjs';
const inputTypes={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'};

// Local preprocessing only: no remote image service, credentials or paid runtime.
// Public files omit EXIF/XMP/GPS. Keep the original separately in private storage.
export async function optimizeRaster(bytes, declaredMime) {
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>IMAGE_POLICY.maxInputBytes)throw Error('Vaizdo failas turi būti ne tuščias ir ne didesnis kaip 12 MB.');
 rejectAnimatedRaster(bytes,declaredMime);
 const options={limitInputPixels:IMAGE_POLICY.maxInputPixels,failOn:'error'};
 const meta=await sharp(bytes,options).metadata();
 if(!inputTypes[meta.format]||inputTypes[meta.format]!==declaredMime)throw Error('Priimami tik tikri PNG, JPEG arba WebP failai; MIME turi atitikti turinį.');
 if((meta.pages??1)!==1)throw Error('Animuoti vaizdai nepalaikomi; pateikite vieną kadrą.');
 if(!meta.width||!meta.height||Math.max(meta.width,meta.height)>IMAGE_POLICY.maxInputEdge)throw Error('Vaizdo matmenys viršija 8192 px ribą.');
 const swapped=[5,6,7,8].includes(meta.orientation);const sourceWidth=swapped?meta.height:meta.width;const sourceHeight=swapped?meta.width:meta.height;
 const widths=[...new Set(IMAGE_POLICY.widths.map(w=>Math.min(w,sourceWidth)))].sort((a,b)=>b-a);const variants=[];const seen=new Set();
 for(const width of widths){
  const result=await sharp(bytes,options).rotate().resize({width,height:IMAGE_POLICY.maxOutputEdge,fit:'inside',withoutEnlargement:true})
   .webp({quality:IMAGE_POLICY.quality,alphaQuality:IMAGE_POLICY.alphaQuality,effort:6}).toBuffer({resolveWithObject:true});
  if(seen.has(result.info.width))continue;seen.add(result.info.width);
  variants.push({bytes:result.data,width:result.info.width,height:result.info.height,mime:'image/webp'});
 }
 return {variants,source:{width:sourceWidth,height:sourceHeight,mime:declaredMime,hasAlpha:meta.hasAlpha===true},policy:IMAGE_POLICY.version};
}
