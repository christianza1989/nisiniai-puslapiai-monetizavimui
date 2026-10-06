import {IMAGE_POLICY as policy,rejectAnimatedRaster} from './image-policy.mjs';
const stream=bytes=>new Blob([bytes]).stream();
const formats={png:'image/png',jpeg:'image/jpeg',jpg:'image/jpeg',webp:'image/webp','image/png':'image/png','image/jpeg':'image/jpeg','image/webp':'image/webp'};
export async function optimizeRasterWithImages(images,bytes,mime){
 if(!bytes.length||bytes.length>policy.maxInputBytes)throw Error('Vaizdas viršija 12 MB ribą.');
 rejectAnimatedRaster(bytes,mime);
 const info=await images.info(stream(bytes));
 if(formats[info.format]!==mime||!info.width||!info.height||info.width*info.height>policy.maxInputPixels||Math.max(info.width,info.height)>policy.maxInputEdge)throw Error('Netinkamas vaizdo formatas arba matmenys.');
 const widths=[...new Set(policy.widths.map(w=>Math.min(w,info.width)))].sort((a,b)=>b-a),variants=[],seen=new Set();
 for(const width of widths){
  const scale=Math.min(1,width/info.width,policy.maxOutputEdge/info.height),targetWidth=Math.max(1,Math.round(info.width*scale)),targetHeight=Math.max(1,Math.round(info.height*scale));
  const output=await images.input(stream(bytes)).transform({width:targetWidth,height:targetHeight,metadata:'none'}).output({format:'image/webp',quality:policy.quality,anim:false});
  const data=new Uint8Array(await output.response().arrayBuffer());
  const meta=await images.info(stream(data));
  if(seen.has(meta.width))continue;seen.add(meta.width);
  variants.push({bytes:data,width:meta.width,height:meta.height,mime:'image/webp'});
 }
 return {variants,source:{width:info.width,height:info.height,mime},policy:policy.version};
}
