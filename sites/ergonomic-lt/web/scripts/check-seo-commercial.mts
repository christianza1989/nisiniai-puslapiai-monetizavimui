import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {parseHTML} from 'linkedom';
import {baseSeed,productPath,legacyPages} from '../src/lib/catalog.ts';
import {productModels} from '../src/lib/product-models.ts';
import {publicProductCopy} from '../src/lib/public-product-copy.ts';
import {editorialProduct} from '../src/lib/editorial-server.ts';
import {modelTags} from '../src/lib/seo-collections.ts';
import {productHeading} from '../src/lib/product-presentation.ts';
const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3006';
const out=process.env.CHECK_REPORT_DIR||'.impeccable/review/seo-commercial';
fs.mkdirSync(out+'/raw',{recursive:true});
const parents=baseSeed().products.map(p=>editorialProduct(publicProductCopy(p))),models=productModels(parents),all=new Map<string,any>();
for(const p of parents)all.set(productPath(p),{path:productPath(p),kind:'family'});
for(const p of models)all.set(productPath(p),{path:productPath(p),kind:'model',heading:productHeading(p),tags:modelTags(p)});
for(const page of legacyPages())all.set(page.path,{path:page.path,kind:'legacy'});
for(const [path,tag]of [['/ergonomines-kedes/','ergonomines-kedes'],['/ergonominiai-stalai/','ergonominiai-stalai'],['/shop/balansines-kedes/','balansines-kedes'],['/shop/priedai/','priedai']]){
 const count=models.filter(p=>modelTags(p).includes(tag)).length;
 for(let n=1;n<=Math.ceil(count/20);n++)all.set(path+(n>1?'?puslapis='+n:''),{path:path+(n>1?'?puslapis='+n:''),kind:'selection',tag,count,expectedCards:Math.min(20,count-(n-1)*20)});
}
for(let n=1;n<=Math.ceil(models.length/20);n++)all.set('/produktai/'+(n>1?'?puslapis='+n:''),{path:'/produktai/'+(n>1?'?puslapis='+n:''),kind:'pagination'});
let inputs=[...all.values()];
if(process.env.CHECK_PATHS){const paths=new Set(JSON.parse(fs.readFileSync(process.env.CHECK_PATHS,'utf8')));inputs=inputs.filter(p=>paths.has(p.path));}
const results:any[]=[];let cursor=0,done=0;
const norm=(v:string|null|undefined)=>(v||'').replace(/\s+/g,' ').trim();
async function one(input:any){
 try{
  const response=await fetch(origin+input.path,{signal:AbortSignal.timeout(60000)}),html=await response.text();
  const sha=createHash('sha256').update(html).digest('hex'),name=createHash('sha256').update(input.path).digest('hex').slice(0,20);
  fs.writeFileSync(out+'/raw/'+name+'.html.gz',gzipSync(html));
  const d=parseHTML(html).document,schemas=Array.from(d.querySelectorAll('script[type="application/ld+json"]')).flatMap(s=>{try{return [JSON.parse(s.textContent||'{}')];}catch{return [];}});
  const bc=schemas.find(s=>s['@type']==='BreadcrumbList')?.itemListElement||[];
  const visible=Array.from(d.querySelectorAll('main .breadcrumbs a')).map(a=>({name:norm(a.textContent),path:a.getAttribute('href')}));
  const modelSchema=schemas.find(s=>s['@type']==='Product');
  const links=Array.from(d.querySelectorAll('main a[href]')).map(a=>a.getAttribute('href')!).filter(x=>x.startsWith('/'));
  const result={...input,status:response.status,title:norm(d.querySelector('title')?.textContent),description:d.querySelector('meta[name=description]')?.getAttribute('content'),h1:Array.from(d.querySelectorAll('h1')).map(e=>norm(e.textContent)),canonical:d.querySelector('link[rel=canonical]')?.getAttribute('href'),robots:d.querySelector('meta[name=robots]')?.getAttribute('content'),cards:d.querySelectorAll('#modeliai .product-card').length,selectionModels:Array.from(d.querySelectorAll('#modeliai .product-card h3 a')).map(a=>a.getAttribute('href')),visibleBreadcrumbs:visible,breadcrumbs:bc.map((r:any)=>({name:r.name,path:new URL(r.item).pathname})),schemaName:modelSchema?.name,links,sha256:sha,errors:[] as string[]};
  if(response.status!==200)result.errors.push('HTTP '+response.status);
  if(result.h1.length!==1)result.errors.push('H1 count '+result.h1.length);
  if(!result.robots?.includes('noindex'))result.errors.push('Preview noindex missing');
  if(input.kind==='model'){
   if(result.canonical!=='https://ergonomic.lt'+input.path)result.errors.push('Model canonical');
   if(result.h1[0]!==input.heading)result.errors.push('Model heading');
   const expected=result.breadcrumbs.slice(0,-1);if(JSON.stringify(visible)!==JSON.stringify(expected))result.errors.push('Breadcrumb parity');
   if(result.schemaName!==input.heading)result.errors.push('Product schema name');
  }
  if(input.kind==='selection'&&result.cards!==input.expectedCards)result.errors.push('Complete selection pagination');
  return result;
 }catch(error){return {...input,status:0,errors:[String(error)]};}
}
async function worker(){for(;;){const n=cursor++;if(n>=inputs.length)return;results[n]=await one(inputs[n]);fs.appendFileSync(out+'/progress.jsonl',JSON.stringify(results[n])+'\n');if(++done%100===0)console.log(done+'/'+inputs.length);}}
await Promise.all(Array.from({length:3},worker));
const fails=results.filter(r=>r.errors.length),summary={origin,checkedAt:new Date().toISOString(),models:models.length,uniqueProductPaths:new Set([...parents,...models].map(productPath)).size,checked:results.length,failures:fails.length,results};
fs.writeFileSync(out+'/http-crawl.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({checked:results.length,failures:fails.length,examples:fails.slice(0,8)}));
if(fails.length)process.exitCode=1;
