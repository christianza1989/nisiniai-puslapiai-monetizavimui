import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import {baseSeed} from '../src/lib/catalog';
import {productModels} from '../src/lib/product-models';
import {expandedForProduct} from '../src/lib/expanded-configurator';

const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3001';
const folder='.impeccable/review/private-manufacturers-20261013';fs.mkdirSync(folder,{recursive:true});
const seed=baseSeed(),models=productModels(seed.products),names=/Nowy\s*Styl|SOHOS|Kusch\s*\+\s*Co/i;
const representatives=[...new Set(models.map(p=>p.brand))].map(b=>models.find(p=>p.brand===b)!);
const xilium=models.find(p=>p.name.includes('Xilium')&&expandedForProduct(p))!;
const paths=new Set(['/', '/produktai/','/produktai/?puslapis=2','/produktai/?paieska=xilium','/produktai/?zenklas=Kusch%2BCo','/kolekcijos/','/kolekcijos/xilium/','/uzklausa/','/gidai/',
 ...seed.categories.filter(c=>!c.parentId).map(c=>'/produktai/'+c.slug+'/'),...seed.legacy.map(p=>p.path),'/shop/priedai/',
 ...representatives.map(p=>`/produktai/${p.categorySlug}/${p.slug}/`),`/produktai/${xilium.categorySlug}/${xilium.slug}/`]);
const results=[];
for(const pathname of paths){
 const response=await fetch(origin+pathname),html=await response.text();assert.equal(response.status,200,pathname);
 const {document}=parseHTML(html);
 for(const node of document.querySelectorAll('script[type="application/ld+json"]')){
  const data=JSON.parse(node.textContent);
  if(data['@type']==='Product'){assert(!('brand' in data));assert(!('manufacturer' in data));}
  // Supplier CDN photographs are image resources, not manufacturer labels or
  // links to a supplier product. Inspect the public semantic text separately.
  function semanticText(value:any):string{
   if(typeof value==='string')return /^https?:\/\//.test(value)?'':value;
   if(Array.isArray(value))return value.map(semanticText).join(' ');
   if(value&&typeof value==='object')return Object.values(value).map(semanticText).join(' ');
   return '';
  }
  assert(!names.test(semanticText(data)),pathname+' exposes structured manufacturer');
 }
 document.querySelectorAll('script,style').forEach(n=>n.remove());
 const publicText=document.body.textContent,metadata=Array.from(document.querySelectorAll('meta[content],img[alt],[title],[aria-label]')).map(n=>n.getAttribute('content')||n.getAttribute('alt')||n.getAttribute('title')||n.getAttribute('aria-label')).filter(t=>!/^https?:\/\//.test(t||'')).join(' ');
 assert(!names.test(publicText+' '+metadata),pathname+' exposes manufacturer');
 assert.equal(document.querySelectorAll('header').length,1,pathname+' header');assert.equal(document.querySelectorAll('footer').length,1,pathname+' footer');
 assert.equal(document.querySelectorAll('select[name="zenklas"]').length,0);
 assert(!Array.from(document.querySelectorAll('main a[href]')).some(a=>/^https:\/\/(?:www\.|dam\.|configurator\.)?nowystyl\.com/i.test(a.getAttribute('href')||'')),pathname+' exposes original supplier link');
 if(pathname.startsWith('/produktai/')&&document.querySelector('.catalog-filters')){
  assert.equal(document.querySelectorAll('.catalog-filters select').length,3);
  if(pathname.includes('zenklas=')){assert(document.querySelector('.catalog-heading')?.textContent.includes('1111'));assert(!document.querySelector('.pagination a')?.getAttribute('href')?.includes('zenklas'));}
 }
 results.push({path:pathname,status:response.status,publicManufacturers:false});
}
const admin=await fetch(origin+'/admin/uzklausos/',{redirect:'manual'});assert([302,303,307,308].includes(admin.status));
const pdfPath='/api/produkto-kortele/?produktas='+encodeURIComponent(xilium.id)+'&komplektacija='+encodeURIComponent(xilium.modelConfigurationId!);
const pdf=await fetch(origin+pdfPath);assert.equal(pdf.status,200);const bytes=Buffer.from(await pdf.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'%PDF');
const tag=origin.includes('127.0.0.1')?'local':'public';fs.writeFileSync(folder+'/'+tag+'-card.pdf',bytes);
const result={origin,readOnly:true,pages:results,protectedAdmin:admin.status,pdf:pdfPath,sourceProduct:xilium.id,productCode:xilium.configurations.find(c=>c.id===xilium.modelConfigurationId)?.code,threeDPath:`/produktai/${xilium.categorySlug}/${xilium.slug}/`};
fs.writeFileSync(folder+'/'+tag+'-checks.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({origin,pages:results.length,publicManufacturers:false,protectedAdmin:admin.status,pdf:pdf.status,threeDPath:result.threeDPath}));
