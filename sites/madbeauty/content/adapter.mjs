import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {renderContentPage} from '../prototype/public/content-render.mjs';
import {admitMadbeautyPackage} from './intake.mjs';
const root=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting'),sandbox=path.resolve(import.meta.dirname,'../runtime/output/content-core');
const network=JSON.parse(await readFile(path.join(root,'config/niche-network.json'),'utf8'));
const operatorName=network.contactsBySite?.madbeauty?.operatorName||network.operatorName;
if(!operatorName)throw Error('Approved central operator required');
const {validateContentPackage}=await import(pathToFileURL(path.join(root,'scripts/content-package-core.mjs')));
const {projectPublicPages,contextualParts}=await import(pathToFileURL(path.join(root,'lib/niche-links.mjs')));
const {nicheSchemaGraph,nicheEditorialDates}=await import(pathToFileURL(path.join(root,'lib/niche-schema-core.mjs')));
const {build}=await import(pathToFileURL(path.join(root,'node_modules/esbuild/lib/main.js')));
const seoFile=path.join(sandbox,'niche-seo.bundle.mjs');await mkdir(sandbox,{recursive:true});
await build({entryPoints:[path.join(root,'lib/niche-seo.ts')],outfile:seoFile,bundle:true,platform:'node',format:'esm',plugins:[{name:'madbeauty-source-bindings',setup(b){
 b.onResolve({filter:/^@\/lib\/niche-sites$/},()=>({path:'niche-sites',namespace:'madbeauty-bindings'}));
 b.onResolve({filter:/^@\/lib\/niche-network$/},()=>({path:'niche-network',namespace:'madbeauty-bindings'}));
 b.onLoad({filter:/.*/,namespace:'madbeauty-bindings'},args=>({contents:args.path==='niche-sites'?`export const nicheOrigin=p=>'https://'+p.canonicalHost;export const nichePagePath=p=>p.slug?'/'+p.slug:'/';export const publicNichePages=p=>p.pages;`:`export const nicheNetworkContact=()=>({operatorName:${JSON.stringify(operatorName)}});`,loader:'js'}));
}}]});
const seo=await import(pathToFileURL(seoFile));
const v2SchemaFile=path.resolve(import.meta.dirname,'../cloudflare/output/gift-seo.mjs');
await mkdir(path.dirname(v2SchemaFile),{recursive:true});
await build({entryPoints:[path.join(root,'lib/gift-seo.ts')],outfile:v2SchemaFile,bundle:true,platform:'neutral',format:'esm'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const contentAssetsRoot=path.join(sandbox,'public/content-assets');
export async function contentProjection({now=Date.now(),packagePath=path.join(sandbox,'content-packages/madbeauty/content-package.json'),settings={},registry={targets:[]}}={}){
 let pkg;try{pkg=admitMadbeautyPackage(validateContentPackage(JSON.parse(await readFile(packagePath,'utf8'))),{operatorName,email:network.contactsBySite?.madbeauty?.email||network.defaultEmail});}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(pkg.schemaVersion===2){const {projectMadbeautyV2}=await import('./v2-projection.mjs');return projectMadbeautyV2(pkg,{settings:{...network,...settings},registry,now:typeof now==='number'?now:Date.parse(now)});}
 if(pkg.schemaVersion!==1||pkg.siteId!=='madbeauty'||pkg.canonicalHost!=='madbeauty.lt')throw Error('Wrong content tenant/version');
 const pages=projectPublicPages(pkg,[pkg],settings,typeof now==='number'?now:Date.parse(now));
 const projected={...pkg,pages},byId=new Map(pages.map(p=>[p.id,p]));
 const dto=pages.map(p=>{
  const links=p.links.map(l=>({...l,href:'/'+byId.get(l.targetPageId).slug}));
  const contextual={};for(const t of p.body.flatMap(b=>b.type==='paragraph'?[b.text]:b.type==='list'?b.items:[]))contextual[t]=contextualParts(t,links).map(x=>x.href?`<a href="${esc(x.href)}">${esc(x.text)}</a>`:esc(x.text)).join('');
  return {id:p.id,type:p.type,slug:p.slug,url:seo.nichePageUrl(projected,p),title:p.title,description:p.description,body:p.body,media:p.media,links,externalLinks:p.externalLinks||[],dates:nicheEditorialDates(p),contextual,schema:nicheSchemaGraph(projected,p,pages,operatorName)};
 });
 return{pkg:projected,pages,dto,seo,operatorName,html:page=>renderContentPage(dto.find(p=>p.id===page.id),{pages:dto,operatorName}),schema:page=>nicheSchemaGraph(projected,page,pages,operatorName)};
}
export async function contentSourceEvidence(){const files=['lib/niche-links.mjs','lib/niche-schema-core.mjs','lib/niche-seo.ts','scripts/content-package-core.mjs'];const rows=[];for(const f of files)rows.push({source:path.join(root,f),sha256:createHash('sha256').update(await readFile(path.join(root,f))).digest('hex')});await writeFile(path.join(import.meta.dirname,'CORE_SOURCE_VERSION.json'),JSON.stringify({date:'2026-10-05',binding:'same common projection/schema/SEO; Madbeauty HTML only',files:rows},null,2)+'\n');}
