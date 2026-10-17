import backdropData from '../../content/gallery-photo-backdrops.json';
const colors:Record<string,string>=backdropData;
const colorMemo=new Map<string,string|undefined>();
export function galleryPhotoBackdrops(sources:string[]){
  const result:Record<string,string>={};
  for(const src of sources){
    if(colorMemo.has(src)){const color=colorMemo.get(src);if(color)result[src]=color;continue;}
    if(colorMemo.size>=20000)colorMemo.clear();
    let color:string|undefined;
    try{
    const url=new URL(src);
    for(const key of [...url.searchParams.keys()])if(['width','height','quality','mode','format'].includes(key.toLowerCase()))url.searchParams.delete(key);
    url.hash='';color=colors[url.href];
  }catch{/* Local images already carry their prepared backdrop metadata. */}
    colorMemo.set(src,color);if(color)result[src]=color;
  }
  return result;
}
