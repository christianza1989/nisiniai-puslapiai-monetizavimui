import sharp from 'sharp';
export const IMAGE_POLICY = Object.freeze({version:'responsive-webp-v2',widths:[360,640,800,1200,1600],quality:75,alphaQuality:100,effort:4,maxInputBytes:12*1024*1024,maxInputPixels:40_000_000,maxInputEdge:8192,maxOutputEdge:1600});
const inputTypes={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'};

// Local preprocessing only: no remote image service, credentials or paid runtime.
// Public files omit EXIF/XMP/GPS. Keep the original separately in private storage.
export async function optimizeRaster(bytes, declaredMime) {
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>IMAGE_POLICY.maxInputBytes)throw Error('Vaizdo failas turi būti ne tuščias ir ne didesnis kaip 12 MB.');
 const options={limitInputPixels:IMAGE_POLICY.maxInputPixels,failOn:'error'};
 const meta=await sharp(bytes,options).metadata();
 if(!inputTypes[meta.format]||inputTypes[meta.format]!==declaredMime)throw Error('Priimami tik tikri PNG, JPEG arba WebP failai; MIME turi atitikti turinį.');
 if((meta.pages??1)!==1)throw Error('Animuoti vaizdai nepalaikomi; pateikite vieną kadrą.');
 if(!meta.width||!meta.height||Math.max(meta.width,meta.height)>IMAGE_POLICY.maxInputEdge)throw Error('Vaizdo matmenys viršija 8192 px ribą.');
 const swapped=[5,6,7,8].includes(meta.orientation);const sourceWidth=swapped?meta.height:meta.width;const sourceHeight=swapped?meta.width:meta.height;
 const widths=[...new Set(IMAGE_POLICY.widths.map(w=>Math.min(w,sourceWidth)))].sort((a,b)=>b-a);const variants=[];const seen=new Set();
 for(const width of widths){
  const result=await sharp(bytes,options).rotate().resize({width,height:IMAGE_POLICY.maxOutputEdge,fit:'inside',withoutEnlargement:true})
   .webp({quality:IMAGE_POLICY.quality,alphaQuality:IMAGE_POLICY.alphaQuality,effort:IMAGE_POLICY.effort}).toBuffer({resolveWithObject:true});
  if(seen.has(result.info.width))continue;seen.add(result.info.width);
  variants.push({bytes:result.data,width:result.info.width,height:result.info.height,mime:'image/webp'});
 }
 return {variants,source:{width:sourceWidth,height:sourceHeight,mime:declaredMime,hasAlpha:meta.hasAlpha===true},policy:IMAGE_POLICY.version};
}
