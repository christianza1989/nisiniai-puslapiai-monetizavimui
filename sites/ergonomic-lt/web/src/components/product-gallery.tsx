'use client';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {ProductImage} from './product-image';
import {uniqueGalleryPhotos} from '@/lib/gallery-photo-identity';

export function galleryImages(primary:string|null,images:string[]){return uniqueGalleryPhotos([primary,...images]);}

export function ProductGallery({images,primary,name,specificCount,backdrops}:{images:string[];primary:string|null;name:string;specificCount?:number;backdrops?:Record<string,string>}){
  const photos=galleryImages(primary,images);
  const [active,setActive]=useState(0);
  const index=Math.min(active,Math.max(0,photos.length-1)),src=photos[index];
  const move=(direction:number)=>setActive(n=>(n+direction+photos.length)%photos.length);
  if(!src)return null;
  return <div className="product-photo-gallery" onKeyDown={event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}
    if(event.key==='ArrowRight'){event.preventDefault();move(1);}
  }}>
    <div className="gallery-main"><ProductImage key={src} src={src} alt={`${name} – gamintojo nuotrauka ${index+1}`} fill priority sizes="(max-width: 800px) 100vw, 60vw" style={backdrops?.[src]?{backgroundColor:backdrops[src]}:undefined}/></div>
      {photos.length>1&&<div className="gallery-controls"><button type="button" aria-label={copyText("ui.fbc26ccaccba74c3496c","Ankstesnė nuotrauka")} onClick={()=>move(-1)}><ChevronLeft/></button><span aria-live="polite" aria-atomic="true">{index+1} / {photos.length}</span><button type="button" aria-label={copyText("ui.c5200cbc38176334a466","Kita nuotrauka")} onClick={()=>move(1)}><ChevronRight/></button></div>}
    {photos.length>1&&<div className="gallery-thumbs" aria-label={copyText("ui.c14c38e24b3d1ab5cbe9","Gamintojo nuotraukos")}>{photos.map((photo,n)=><button key={photo} type="button" className={index===n?'active':''} aria-label={copyText("ui.3c6f8551e81d557f2a9b","Rodyti {{p0}} gamintojo nuotrauką",{p0:(n+1)})} aria-pressed={index===n} onClick={()=>setActive(n)}><ProductImage src={photo} alt="" fill sizes="90px" style={backdrops?.[photo]?{backgroundColor:backdrops[photo]}:undefined}/></button>)}</div>}
    {specificCount!==undefined&&index>=specificCount&&<p className="visualization-note">{copyText("ui.fd3f073fc635deb43ec9","Gamintojo linijos galerija. Nuotraukose gali būti kitų apdailų ir komplektacijų.")}</p>}
  </div>;
}
