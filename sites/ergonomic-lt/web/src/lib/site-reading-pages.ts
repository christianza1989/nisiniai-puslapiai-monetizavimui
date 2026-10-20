import {parseHTML} from 'linkedom';
import type {Seed,Product} from './types';
import {legacyPages} from './catalog';
import {legacyArticle,articlePresentation} from './legacy-article';
import {seoFaqRows} from './seo-faq-copy';
import {applyEditorialHtml} from './editorial-server';
import {approvedHeroMarkup,approvedSectionsMarkup} from './approved-home-markup';
import {copyText} from './editorial-copy';
import {selections,matchesSelection} from './seo-collections';
import {productHeading} from './product-presentation';
import facts from '../../content/editorial/facts.json';
import {customFurnitureDocument} from './custom-furniture-copy';
import {privacyDocument,privacyText} from './privacy-copy';
export type ReadingPage={id:string;type:string;title:string;description:string;url:string;editorial:{authors:never[];sources:never[];commerceTargets:never[];productRecommendation:boolean};links:{targetPageId:string;label:string}[];externalLinks:never[];body:{text:string}[]};
const path=(p:Product)=>`/produktai/${p.categorySlug}/${p.slug}/`;
export function readingPage(route:string,title:string,description:string,texts:string[]=[],links:ReadingPage['links']=[],type='page'):ReadingPage{
 return {id:route,type,title,description,url:'https://ergonomic.lt'+route,editorial:{authors:[],sources:[],commerceTargets:[],productRecommendation:false},links,externalLinks:[],body:texts.filter(Boolean).map(text=>({text}))};
}
export function visibleHtmlText(html:string){
 // The approved homepage canvas is an interactive viewer, with no article
 // text. Do not instantiate optional Canvas APIs in a server text projection.
 const textHtml=html.replace(/<canvas\b[^>]*>[\s\S]*?<\/canvas>/gi,'');
 const {document}=parseHTML('<html><body>'+textHtml+'</body></html>');
 document.querySelectorAll('script,style,svg,button,input,select,textarea,[hidden],.hp-sr-only').forEach(el=>el.remove());
 return Array.from(document.body.querySelectorAll('h1,h2,h3,h4,p,li,figcaption')).filter(el=>!el.parentElement?.closest('p,li,figcaption')).map(el=>el.textContent.replace(/\s+/g,' ').trim()).filter(Boolean);
}
/** Descriptors come from the same approved package, HTML and catalog as the UI. */
export function standardSitePages(seed:Seed,parents:Product[],models:Product[]):ReadingPage[]{
 const pages=legacyPages().map(page=>{
  const body=page.path==='/'?visibleHtmlText(applyEditorialHtml('home-hero',approvedHeroMarkup)+applyEditorialHtml('home-sections',approvedSectionsMarkup)):[articlePresentation[page.path]?.intro||'',...visibleHtmlText(legacyArticle(page).html),...seoFaqRows(page.path).flat()];
  const selection=selections.find(s=>s.path===page.path);
  const links=selection?models.filter(p=>matchesSelection(p,selection.id)).map(p=>({targetPageId:path(p),label:productHeading(p)})):[];
  return readingPage(page.path,page.h1,page.description||'',body,links,selection?'category':'guide');
 });
 pages.push(readingPage('/produktai/',copyText('ui.1e54fd1867276164f3be','Baldų katalogas'),copyText('ui.3df3c3c184c95e8eb876','Visas asortimentas'),[],models.map(p=>({targetPageId:path(p),label:productHeading(p)})),'category'));
 for(const c of seed.categories.filter(c=>!c.parentId&&models.some(p=>p.categoryId===c.id)))pages.push(readingPage('/produktai/'+c.slug+'/',c.name,c.name,[],models.filter(p=>p.categoryId===c.id).map(p=>({targetPageId:path(p),label:productHeading(p)})),'category'));
 const guidePaths=['/biuro-kedes/','/ergonominiai-stalai/','/ergonomines-kedes/','/ergonomika-darbo-vietoje-reikalavimai/','/aktyvus-sedejimas/','/shop/balansines-kedes/','/mokykliniai-baldai/','/shop/priedai/'];
 pages.push(readingPage('/gidai/',copyText('ui.c55d53bcf1df3a653399','Ergonomikos gidai'),copyText('ui.423be1d0e1795a4b54da','Darbo vietos, kėdžių, stalų ir aktyvaus sėdėjimo gidai.'),[],pages.filter(p=>guidePaths.includes(p.id)).map(p=>({targetPageId:p.id,label:p.title})),'guide'));
 pages.push(readingPage('/kontaktai/',copyText('ui.8e9f4267042683306efa','Kontaktai'),facts.brand,[facts.company,facts.address,facts.email,facts.secondaryEmail,facts.phone]));
 pages.push(readingPage('/privatumas/',privacyText('ui.67095de234af3fa7d9a9'),facts.company,[facts.company,facts.address,facts.email,...privacyDocument()]));
 for(const steam of [false,true]){const doc=customFurnitureDocument(steam);pages.push(readingPage(doc.path,doc.title,doc.texts[0],doc.texts,[{targetPageId:'/ergonominiai-stalai/',label:copyText('ui.3dd3ef0abc8031398875','Ergonominiai stalai')}],'service'));}
 pages.push(readingPage('/kolekcijos/',copyText('ui.77b8e5f971c31c0c81ba','Kolekcijos'),facts.brand,[],seed.lines.filter(l=>models.some(p=>p.lineId===l.id)).map(l=>({targetPageId:'/kolekcijos/'+l.slug+'/',label:l.name})),'category'));
 for(const l of seed.lines.filter(l=>models.some(p=>p.lineId===l.id)))pages.push(readingPage('/kolekcijos/'+l.slug+'/',l.name,copyText('ui.ca9fc28b417ae6b4b8a2','Kolekcijos modeliai jūsų darbo erdvei.'),[],models.filter(p=>p.lineId===l.id).map(p=>({targetPageId:path(p),label:productHeading(p)})),'category'));
 for(const p of parents.filter(p=>p.configurations.length>1))pages.push(readingPage(path(p),p.name,p.description,[p.description],models.filter(m=>m.id===p.id).map(m=>({targetPageId:path(m),label:productHeading(m)})),'category'));
 return pages;
}
