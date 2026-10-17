import type {Metadata} from 'next';
import {indexable} from './catalog';
import type {LegacyPage} from './types';
export function pageMetadata(title:string,path:string,description?:string|null,image?:string|null):Metadata {
  const origin=process.env.CANONICAL_ORIGIN||'https://ergonomic.lt';
  return {title,description:description||null,alternates:{canonical:origin+path},robots:{index:indexable(),follow:true},
    openGraph:{title,description:description||undefined,url:origin+path,siteName:'Ergonomic.lt',locale:'lt_LT',type:'website',images:image?[{url:image}]:undefined}};
}
export function legacyMetadata(page:LegacyPage):Metadata {return {...pageMetadata(page.title,page.path,page.description,page.image),title:{absolute:page.title}};}
