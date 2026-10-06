export const IMAGE_POLICY = Object.freeze({version:'responsive-webp-v1',widths:[360,640,800,1200,1600],quality:75,alphaQuality:100,maxInputBytes:12*1024*1024,maxInputPixels:40_000_000,maxInputEdge:8192,maxOutputEdge:1600});
export function rejectAnimatedRaster(bytes,mime){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(mime==='image/webp'&&bytes.length>20&&String.fromCharCode(...bytes.slice(12,16))==='VP8X'&&(bytes[20]&2))throw Error('Animuoti vaizdai nepalaikomi; pateikite vieną kadrą.');
 if(mime==='image/png')for(let offset=8,count=0;offset+12<=bytes.length;count++){
  if(count>=4096)throw Error('Vaizdo struktūra per sudėtinga.');
  if(String.fromCharCode(...bytes.slice(offset+4,offset+8))==='acTL')throw Error('Animuoti vaizdai nepalaikomi; pateikite vieną kadrą.');
  offset+=view.getUint32(offset)+12;
 }
}
