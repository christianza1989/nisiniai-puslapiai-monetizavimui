import facts from '../../content/editorial/facts.json';
import type {Product} from './types';
import {configurableArticle} from './configuration-article';
import {createExpandedEngine} from './expanded-configurator';
import {modelSeo} from './model-seo';
import {productPath} from './catalog';
import {coreReadingText} from './core-reading.mjs';
import type {CatalogRuntime} from './catalog-configurator';
import {productIsVisible} from './site-publication';
import {productHeading} from './product-presentation';
import {readingPage,type ReadingPage} from './site-reading-pages';
import {selectedModelConfiguration} from './product-models';

type ReadingMode='public'|'local-preview'|'closed';
type ReadingAccess={preview:boolean;indexable:boolean};
export function readingMode(request:Request,access:ReadingAccess):ReadingMode{
 const host=new URL(request.url).hostname;
 if(access.preview&&['127.0.0.1','localhost','[::1]','ergonomic-preview.pinet-azprekyba.workers.dev'].includes(host))return 'local-preview';
 return access.indexable&&!access.preview&&host==='ergonomic.lt'?'public':'closed';
}
/** The same visible/reviewed projection, excluding private supplier sources. */
export function productReadingPages(products:Product[],mode:ReadingMode,runtimes:Record<string,CatalogRuntime|undefined>={}){
 if(mode==='closed')return [];
 return products.filter(p=>productIsVisible(p,mode==='local-preview')).flatMap(product=>{
  if(!configurableArticle(product)){
   const seo=modelSeo(product),c=selectedModelConfiguration(product),a=product.modelArticle;
   const texts=a?[a.summary,...a.paragraphs,a.scopeNote,...a.technicalSections.flatMap(s=>['## '+s.heading,...s.rows.map(r=>r.label+': '+r.value)])]:[product.description,...(c?.details||[]).map(r=>r.label+': '+r.value)];
   return [readingPage(productPath(product),productHeading(product),seo.description,texts,[],'product')];
  }
  const engine=createExpandedEngine(runtimes[product.id+':'+product.modelConfigurationId]);
  const selected=engine.selectionArticle(product,engine.initialStateForProduct(product));
  if(!selected||selected.sections.some(s=>s.missingProfile))return [];
  const seo=modelSeo(product);
  return [{id:productPath(product),type:'product',title:productHeading(product),description:seo.description,
   url:'https://ergonomic.lt'+productPath(product),
   editorial:{authors:[],sources:[],commerceTargets:[],productRecommendation:false},links:[],externalLinks:[],
   body:[{text:product.description},{text:'## Apie '+product.name},...selected.intro.map(text=>({text})),
    {text:'## Pasirinktos komplektacijos aprašymas ir techniniai duomenys'},
    {text:'Pateikta puslapio pradinė komplektacija. Kitos pasirinktos komplektacijos duomenys matomi konfigūratoriuje ir jos PDF kortelėje.'},
    {text:selected.scopeNote},...selected.sections.flatMap(section=>[
     {text:'### '+section.heading},...section.paragraphs.map(text=>({text})),...section.rows.map(row=>({text:row.label+': '+row.value}))
    ]),{text:'Svetainės valdytojas: '+facts.company}]
  }];
 });
}
export function productReadingResponse(request:Request,products:Product[],full:boolean,access:ReadingAccess,runtimes:Record<string,CatalogRuntime|undefined>={},standardPages:ReadingPage[]=[]){
 const mode=readingMode(request,access),pages=mode==='closed'?[]:[...standardPages,...productReadingPages(products,mode,runtimes)];
 const pkg={canonicalHost:'ergonomic.lt',site:{name:facts.brand,
  offer:facts.offer+(mode==='local-preview'?' Peržiūros turinys; paieškos indeksavimas išjungtas.':mode==='closed'?' Viešas turinio indeksas šioje peržiūroje nepateikiamas.':''),
  contact:{email:facts.email,phone:facts.phone}}};
 return new Response(coreReadingText(pkg,pages,full),{headers:{'Content-Type':'text/plain; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(mode!=='public'?{'X-Robots-Tag':'noindex, nofollow'}:{})}});
}
