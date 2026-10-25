
// editorial-copy-wired
import {copyText,copyValue} from '@/lib/editorial-copy';
import {parseHTML} from 'linkedom';
import type {LegacyPage} from './types';
import {seoPageContent} from './seo-page-content';
import home from '../../content/home-seo-sections.json';
import articleImages from '../../content/seo-article-images.json';
import {applyEditorialHtml} from './editorial-server';

export type ArticleImage={src:string;alt:string;width:number;height:number;srcSet:string;caption?:string};
const room=(id:string):ArticleImage=>{
 const asset=[...home.cards,home.large].find(a=>a.assetId===id)!;
 return {src:asset.image,alt:copyValue(asset.alt),width:asset.width,height:asset.height,
  srcSet:asset.widths.map(w=>asset.image.replace(/\d+\.webp$/,w+'.webp')+' '+w+'w').join(', '),caption:copyText("ui.1f36f070418aed5f2684","Biuro aplinkos vizualizacija.")};
};
const originals=articleImages as Record<string,ArticleImage>;
export const articlePresentation:Record<string,{intro:string;hero:ArticleImage;catalog:string;cta:string}>={
 '/biuro-kedes/':{intro:seoPageContent['/biuro-kedes/'].intro,hero:room('K01'),catalog:'/produktai/kedes/',cta:copyText("ui.9a11f0c6961ae2ac9047","Rinktis biuro kėdę")},
 '/ergonomines-kedes/':{intro:seoPageContent['/ergonomines-kedes/'].intro,hero:room('K01'),catalog:'/produktai/kedes/?atranka=ergonomines-kedes',cta:copyText("ui.4c69211e18c7a87ed7e9","Rinktis ergonominę kėdę")},
 '/ergonominiai-stalai/':{intro:seoPageContent['/ergonominiai-stalai/'].intro,hero:room('S03'),catalog:'/produktai/rasomieji-stalai-ir-darbo-vietos/?atranka=ergonominiai-stalai',cta:copyText("ui.d6f25ddedeb8ed9a8d9e","Rinktis ergonominį stalą")},
 '/shop/balansines-kedes/':{intro:seoPageContent['/shop/balansines-kedes/'].intro,hero:room('B01'),catalog:'/produktai/kedes/?atranka=balansines-kedes',cta:copyText("ui.1dab0d0bf550c3b5533f","Rinktis balansinę kėdę")},
 '/shop/priedai/':{intro:seoPageContent['/shop/priedai/'].intro,hero:room('P01'),catalog:'/produktai/?atranka=priedai',cta:copyText("ui.77f0f058eff4e7ec3538","Rinktis darbo vietos priedus")},
 '/ergonomika-darbo-vietoje-reikalavimai/':{intro:copyText("ui.2db24307d3c303e367fa","Kaip pritaikyti darbo vietą žmogui? Apie darbo erdvę, baldų pasirinkimą ir kasdienius įpročius – nuo ergonomikos principų iki darbo vietos įrengimo."),hero:room('P01'),catalog:'/produktai/',cta:copyText("ui.e3cff27c42eca6f06d52","Baldai jūsų darbo vietai")},
 '/aktyvus-sedejimas/':{intro:copyText("ui.0118deaf52428ed46d41","Darbo dienoje svarbus judėjimas ir padėties kaita. Susipažinkite su aktyvaus sėdėjimo tema ir palyginkite tam skirtus kėdžių modelius."),hero:room('B01'),catalog:'/produktai/kedes/?atranka=balansines-kedes',cta:copyText("ui.97ca0dc6bdf3dd2fbd50","Aktyvaus sėdėjimo modeliai")},
 '/mokykliniai-baldai/':{intro:copyText("ui.e97292cd37a6bdbf6550","Mokymo erdvė prasideda nuo jos paskirties. Straipsnyje – mokyklinių baldų parinkimas, erdvės išdėstymas ir nestandartiniai sprendimai. Pagal užsakymą gaminame STEAM stalus, spintas ir kitus kietuosius baldus."),hero:{...originals['/wp-content/uploads/2023/03/Mokykliniai-baldai.jpg'],caption:copyText("ui.0cd77a737c2a97c1837d","Mokymo erdvės pavyzdys.")},catalog:'/steam-baldai/',cta:copyText("ui.b590deaa13522891e6f3","STEAM baldai pagal užsakymą")},
};

/** Only the owner's retired navigation/filter chrome is excluded from copy parity.
 * The immutable import, original paragraphs and original heading IDs stay intact. */
export function retiredLegacyBlock(block:string){
 const norm=block.replace(/\s+/g,' ').trim();
 return norm==='Ergonominiai stalai Ergonominės kėdės Balansinės kėdės Priedai'||norm==='FILTRUOTI PREKES';
}

export function legacyArticle(page:LegacyPage){
 const {document}=parseHTML('<html><body>'+page.html+'</body></html>');
 const body=document.body;
 body.querySelectorAll('.legacy-home-categories').forEach(node=>node.remove());
 body.querySelectorAll('p').forEach(node=>{
  if(node.textContent?.trim()==='FILTRUOTI PREKES'||(!node.textContent?.trim()&&!node.querySelector('img')))node.remove();
 });
 body.querySelectorAll('i').forEach(node=>{if(!node.textContent?.trim())node.remove();});
 body.querySelectorAll('[style]').forEach(node=>node.removeAttribute('style'));
 const headings=Array.from(body.querySelectorAll('h2,h3'));
 headings.forEach((node,n)=>{
  if(!node.id)node.id='tema-'+n+'-'+(node.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
 });
 const toc=headings.map(node=>({id:node.id,text:node.textContent||'',level:Number(node.tagName[1])}));
 body.querySelectorAll('a').forEach(node=>{
  if(node.getAttribute('href')==='/uzklausa/?tema=Priedai')node.setAttribute('href','/shop/priedai/');
  if(!node.getAttribute('href')){
   const next=node.nextElementSibling;
   node.setAttribute('href','#'+(next?.id||toc[0]?.id||'modeliai'));
   node.classList.add('article-continue');
  }
 });
 body.querySelectorAll('img').forEach(node=>{
  const source=node.getAttribute('src')||'';
  // New room photographs replace dated decoration; technical diagrams remain.
  const replacement:Record<string,ArticleImage>={
   '/wp-content/uploads/2023/02/biuro-kedes.jpg':room('P01'),
   '/wp-content/uploads/2023/02/modernios-biuro-kedes-2.jpg':room('B01'),
   '/wp-content/uploads/2021/06/ergonomika-kas-tai.jpg':room('S03'),
   '/wp-content/uploads/2021/12/Elektrinis-ar-mechaninis3.jpg':room('P01'),
  };
  const image=replacement[source]||originals[source];
  if(!image)return;
  node.setAttribute('src',image.src);node.setAttribute('srcset',image.srcSet);
  node.setAttribute('sizes','(max-width:800px) 92vw, 760px');
  node.setAttribute('width',String(image.width));node.setAttribute('height',String(image.height));
  node.setAttribute('alt',image.alt);node.setAttribute('loading','lazy');node.setAttribute('decoding','async');
  const figure=document.createElement('figure');figure.className='article-figure';
  node.replaceWith(figure);figure.append(node);
  if(image.caption){const caption=document.createElement('figcaption');caption.textContent=image.caption;figure.append(caption);}
 });
 // Contact details remain in main as well as the shared footer, without bullet chrome.
 body.querySelectorAll('ul').forEach(node=>{
  if(node.querySelector('a[href^="tel:"]'))node.classList.add('article-contacts');
 });
 const html=applyEditorialHtml('legacy:'+page.path,body.innerHTML);
 const revised=parseHTML('<html><body>'+html+'</body></html>').document;
 return {html,toc:Array.from(revised.querySelectorAll('h2,h3')).map(node=>({id:node.id,text:node.textContent||'',level:Number(node.tagName[1])}))};
}
