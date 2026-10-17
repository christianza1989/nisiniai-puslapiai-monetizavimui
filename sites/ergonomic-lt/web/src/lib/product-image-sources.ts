import localImages from '../../content/home-product-images.json';
import revisionData from '../../content/product-image-revisions.json';
import backdropData from '../../content/product-image-backdrops.json';

const aliases:Record<string,string>=localImages;
const revisions:Record<string,string>=revisionData;
const backdrops:Record<string,string>=backdropData;

// Additional gallery views use the supplier's own CDN resizing, keeping the
// original backdrop and avoiding full-resolution downloads for thumbnails.
export function supplierImageSource(source:string,width:number){
  try{
    const url=new URL(source);
    if(url.protocol!=='https:'||url.hostname!=='www.nowystyl.com'||url.username||url.password||!url.pathname.startsWith('/getmedia/')||! /\.(?:jpe?g|png|webp)$/i.test(url.pathname))return;
    for(const key of [...url.searchParams.keys()])if(['width','height','quality','mode'].includes(key.toLowerCase()))url.searchParams.delete(key);
    url.searchParams.set('width',String(width));url.hash='';return url.href;
  }catch{return;}
}

export function preparedImageSource(source:string){
  const resolved=aliases[source]||source;
  const previous=resolved.match(/^\/media\/products-v2\/([a-f0-9]+)-\d+x\d+\/(\d+)\.webp$/);
  const directory=previous&&revisions[previous[1]];
  if(!directory)return resolved;
  const maximum=Number(directory.match(/-(\d+)x\d+$/)![1]);
  return `/media/products-v2/${directory}/${Math.min(Number(previous[2]),maximum)}.webp`;
}
export function imageBackdrop(source:string){
  const digest=source.match(/^\/media\/products-v2\/([a-f0-9]+)-/);
  return digest?backdrops[digest[1]]:undefined;
}
