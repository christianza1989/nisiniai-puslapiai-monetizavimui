import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseHTML} from '../../../../tools/node_modules/linkedom/esm/index.js';
const root=path.resolve(process.env.O3TECH_MIGRATION_ROOT||path.resolve(import.meta.dirname,'../../../..'));
process.env.STUDIO_DATA_DIR=path.join(root,'private','studio-data');
process.env.STUDIO_OUTPUT_DIR=path.join(root,'private','studio-output');
process.env.STUDIO_NETWORK_SETTINGS=path.join(root,'dovanos-memorycasting','config','niche-network.json');
const model=await import('../../../content-studio/src/model.mjs');
const api=JSON.parse(await readFile(path.join(root,'private/capture/api.json'),'utf8'));
const captures=JSON.parse(await readFile(path.join(root,'private/capture/pages.json'),'utf8'));
const captured=new Map();for(const p of captures)if(!new URL(p.url).search&&!captured.has(p.path))captured.set(p.path,p);
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const dom=html=>parseHTML('<html><body>'+html+'</body></html>').document;
const assetFile=path.join(root,'private','assets-map.json');let assetMap={};try{assetMap=JSON.parse(await readFile(assetFile,'utf8'));}catch{}
await model.initialize();let site;try{site=await model.getSite('o3tech');}catch{site=await model.createSite({siteId:'o3tech',canonicalHost:'o3tech.lt',name:'o3tech',offer:'Ozonatoriai | Kvapų naikinimo įranga'});}
site=await model.editSite('o3tech',{contact:{email:'sales@o3tech.lt',phone:'+37064819979'},brand:{accent:'#276d72'},facts:'Existing UAB A-Z Prekyba identity and contacts retained by owner instruction2026-10-29. All copy imported from live o3tech.lt. No editorial rewrite or factual certification.',contentPolicy:{months:1,cadence:'monthly',articlesPerMonth:1,localTime:'10:00',timezone:'Europe/Vilnius'}});
async function image(url,alt=''){
 if(!url||!url.startsWith('https://o3tech.lt/wp-content/uploads/'))return null;
 if(assetMap[url])return assetMap[url];
 const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Asset '+r.status+':'+url);
 const b=Buffer.from(await r.arrayBuffer());const mime=r.headers.get('content-type').split(';')[0];
 const imported=await model.saveResponsiveAsset('o3tech',{mime,alt:clean(alt)||decodeURIComponent(path.basename(new URL(url).pathname)).replace(/[-_]/g,' ').replace(/\.[^.]+$/,''),rights:'Existing owner website asset; owner requests same-site migration2026-10-29. Original source '+url,prompt:'Original existing website asset. No AI generation. Source '+url},b);
 assetMap[url]={id:imported.id,variants:imported.variants.map(({id,src,width,height,alt,groupId,rights})=>({id,src,width,height,alt,familyId:groupId,rights})),sourceSha256:createHash('sha256').update(b).digest('hex'),sourceBytes:b.length};
 await writeFile(assetFile,JSON.stringify(assetMap,null,2));console.log('Imported '+path.basename(new URL(url).pathname));return assetMap[url];
}
const imgUrl=e=>{
 const set=e.getAttribute('data-srcset')||e.getAttribute('srcset');
 const candidates=(set||'').split(',').map(s=>s.trim().split(/\s+/)).filter(x=>x[0]?.startsWith('https://o3tech.lt/')).sort((a,b)=>parseInt(b[1])-parseInt(a[1]));
 return candidates[0]?.[0]||e.getAttribute('data-src')||e.getAttribute('src');
};
const layout={version:1,source:'https://o3tech.lt/',pages:{},navigation:[],home:{},assets:{}};
const sourceReport=[];
async function extract(node,{skipHeading=null}={}){
 const blocks=[],media=[];
 async function walk(e){
  if(e.nodeType===3)return;
  const tag=e.tagName;
  if(['SCRIPT','STYLE','NOSCRIPT','FORM','SELECT','BUTTON','INPUT','TEXTAREA'].includes(tag))return;
  if(/^H[1-6]$/.test(tag)){const text=clean(e.textContent);if(text&&text!==skipHeading)blocks.push({type:'heading',level:tag==='H3'||tag==='H4'?3:2,text});return;}
  if(tag==='IMG'){const a=await image(imgUrl(e),e.alt);if(a){media.push(a.id);blocks.push({type:'image',assetId:a.id});}return;}
  if(tag==='UL'||tag==='OL'){
   const items=[...e.children].filter(x=>x.tagName==='LI').map(x=>clean(x.textContent)).filter(Boolean);
   if(items.length){if(items.some(x=>x.length>700))for(const text of items)blocks.push({type:'paragraph',text});else for(let i=0;i<items.length;i+=30)blocks.push({type:'list',items:items.slice(i,i+30)});}return;
  }
  if(tag==='TABLE'){for(const row of e.querySelectorAll('tr')){const text=[...row.querySelectorAll('th,td')].map(c=>clean(c.textContent)).join(' — ');if(text)blocks.push({type:'paragraph',text});}return;}
  if(tag==='P'){
   for(const i of e.querySelectorAll('img'))await walk(i);
   const text=clean(e.textContent);if(text)blocks.push({type:'paragraph',text});return;
  }
  if(e.classList?.contains('elementor-price-table')){
   const t=e.querySelector('.elementor-price-table__heading');if(t)blocks.push({type:'heading',level:3,text:clean(t.textContent)});
   const price=e.querySelector('.elementor-price-table__price');if(price)blocks.push({type:'paragraph',text:clean(price.textContent)});
   const list=e.querySelector('.elementor-price-table__features-list');if(list)await walk(list);
   const extra=e.querySelector('.elementor-price-table__additional_info');if(extra&&clean(extra.textContent))blocks.push({type:'paragraph',text:clean(extra.textContent)});
   const button=e.querySelector('.elementor-price-table__button');if(button&&clean(button.textContent))blocks.push({type:'paragraph',text:clean(button.textContent)});return;
  }
  for(const c of e.children||[])await walk(c);
 }
 await walk(node);
 for(const b of blocks)if(b.text?.length>3000)throw Error('Lossless V1 limit needs review; refusing truncation');
 if(blocks.length>100)throw Error('Lossless V1 block limit needs review:'+blocks.length);
 return {blocks,media:[...new Set(media)]};
}
const skipped=new Set(['/paskyra/','/apmokejimas/','/krepselis/','/sample-page/']);
const productsByPath=new Map(api.products.map(p=>[new URL(p.permalink).pathname,p]));
const categoriesByPath=new Map(api.categories.map(p=>[new URL(p.permalink).pathname,p]));
for(const [pathname,capture] of captured){
 if(skipped.has(pathname))continue;
 const d=dom(capture.html);const product=productsByPath.get(pathname),category=categoriesByPath.get(pathname);
 const isCatalogue=pathname==='/prekes/'||Boolean(category);
 const title=product?.name||category?.name||(pathname==='/prekes/'?'Prekės':clean(d.querySelector('h1')?.textContent)||clean(d.querySelector('h2')?.textContent)||capture.title.replace(/\s+-$/,''));
 let data={blocks:[],media:[]},sections=[];
 let priceBlock;
 if(product){data=await extract(dom(product.short_description).body);data.media=[];for(const i of product.images){const a=await image(i.src,i.alt||product.name);if(a)data.media.push(a.id);}const price=clean(d.querySelector('p.price')?.textContent);if(price){priceBlock=data.blocks.length;data.blocks.push({type:'paragraph',text:price});}}
 else if(!isCatalogue){
  const node=d.querySelector('.entry-content')||d.querySelector('.elementor')||d.body;
  if(pathname==='/'||pathname.includes('ozono-generatoriaus-ozonatoriaus-nuoma')){
   for(const section of node.querySelectorAll('section.elementor-top-section')){
    const part=await extract(section,{skipHeading:title});sections.push({start:data.blocks.length,end:data.blocks.length+part.blocks.length});data.blocks.push(...part.blocks);data.media.push(...part.media);
   }
  }else data=await extract(node,{skipHeading:title});
 }
 const description=clean(capture.description)||data.blocks.find(b=>b.type==='paragraph')?.text.slice(0,300)||title;
 const slug=pathname.replace(/^\/+|\/+$/g,'');
 let page=(await model.getSite('o3tech')).pages.find(p=>p.slug===slug);
 const type=pathname==='/'?'home':product?'product':pathname.includes('nuoma')?'service':'faq';
 const originalDate=api.pages.find(p=>new URL(p.link).pathname===pathname)?.date_gmt;
 if(!page)page=await model.addPage('o3tech',{type,slug,title,description,intent:title,body:data.blocks,publishAt:originalDate?originalDate+'Z':new Date().toISOString()});
 page=await model.editPage('o3tech',page.id,{title,description,body:data.blocks,media:[...new Set(data.media)].map(id=>({id})),factChecks:['Migrated original copy; owner approval/release not granted. Technical and health/safety claims, existing prices/delivery terms and legal pages need review before publication.']});
 const listed=[...new Set([...d.querySelectorAll('ul.products a[href]')].map(a=>{try{return new URL(a.getAttribute('href')).pathname;}catch{return null;}}).filter(p=>productsByPath.has(p)))];
 layout.pages[page.id]={path:pathname,kind:product?'product':isCatalogue?'catalogue':pathname==='/'?'home':pathname.includes('nuoma')?'rental':'information',sourceWpId:product?.id||api.pages.find(p=>new URL(p.link).pathname===pathname)?.id,sections,...(product?{priceBlock}:{}),...(isCatalogue?{productPaths:listed}:{}),sourceUrl:capture.url};
 sourceReport.push({path:pathname,id:page.id,title,blocks:data.blocks.length,mediaFamilies:data.media.length,approval:page.approval,sourceBodyTextCharacters:data.blocks.reduce((s,b)=>s+(b.text?.length||b.items?.join(' ').length||0),0)});
}
site=await model.getSite('o3tech');
const cataloguePolicy={version:1,siteId:'o3tech',canonicalHost:'o3tech.lt',indices:site.pages.filter(p=>layout.pages[p.id]?.kind==='catalogue').map(p=>({pageId:p.id,slug:p.slug,productIds:layout.pages[p.id].productPaths.map(path=>site.pages.find(x=>'/'+x.slug+'/'===path).id)}))};
for(const file of ['core/sites/o3tech/catalogue.json','dovanos-memorycasting/config/o3tech-catalogue.json']){
 let existing;try{existing=JSON.parse(await readFile(path.join(root,file),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(existing&&JSON.stringify(existing)!==JSON.stringify(cataloguePolicy))throw Error('Catalogue membership changed; preserve existing source policy and obtain scoped review before updating it.');
 if(!existing)await writeFile(path.join(root,file),JSON.stringify(cataloguePolicy,null,2)+'\n');
}
for(const p of site.pages){const meta=layout.pages[p.id];if(!meta)continue;const capture=captured.get(meta.path);const targets=[];
 if(meta.kind==='catalogue'){
  const products=meta.productPaths.map(path=>site.pages.find(x=>'/'+x.slug+'/'===path));
  await model.editPage('o3tech',p.id,{body:[{type:'list',items:products.map(x=>x.title)}],links:products.map(x=>({targetPageId:x.id,label:x.title}))});continue;
 }
 for(const link of capture.links){let u;try{u=new URL(link.href,'https://o3tech.lt/');}catch{continue;}if(u.hostname!=='o3tech.lt'||u.search)continue;const t=site.pages.find(x=>('/'+x.slug+'/').replace('//','/')===u.pathname);if(t&&t.id!==p.id&&clean(link.label)&&!targets.some(x=>x.targetPageId===t.id))targets.push({targetPageId:t.id,label:clean(link.label)});}
 await model.editPage('o3tech',p.id,{links:targets.slice(0,30)});
}
const home=site.pages.find(p=>p.type==='home'),homeCapture=captured.get('/'),hd=dom(homeCapture.html);
for(const [role,url] of Object.entries({logo:'https://o3tech.lt/wp-content/uploads/2021/06/logo-o3.png',background:'https://o3tech.lt/wp-content/uploads/2021/06/Titulinis-scaled.jpg',icon:'https://o3tech.lt/wp-content/uploads/2021/06/cropped-android-chrome-512x512-1-1-192x192.png'})){const a=await image(url,'o3tech');layout.assets[role]=a.id;}
const sections=[...hd.querySelectorAll('section.elementor-top-section')];
layout.home.categoryCards=[...sections[2].querySelectorAll('.elementor-top-column')].map(x=>({path:new URL(x.querySelector('a[href]').href).pathname,imageId:assetMap[imgUrl(x.querySelector('img'))]?.id}));
layout.home.contactLinks=[...sections[7].querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),label:clean(a.textContent)}));
layout.home.formOptions=[...sections[8].querySelectorAll('option')].map(x=>clean(x.textContent));
const branding=Object.values(layout.assets);home.media.push(...branding.map(id=>({id})));
await model.editPage('o3tech',home.id,{media:home.media.map(x=>({id:x.id}))});
await mkdir(path.join(root,'private','preview-assets'),{recursive:true});
site=await model.getSite('o3tech');
for(const a of site.assets)await copyFile(path.join(process.env.STUDIO_DATA_DIR,'media','o3tech',path.basename(a.src)),path.join(root,'private','preview-assets',path.basename(a.src)));
await writeFile(path.join(root,'private','layout.json'),JSON.stringify(layout,null,2));
await writeFile(path.join(root,'dovanos-memorycasting','config','o3tech-layout.json'),JSON.stringify(layout,null,2)+'\n');
await writeFile(path.join(root,'private','migration-report.json'),JSON.stringify({capturedAt:new Date().toISOString(),included:sourceReport,excluded:[...skipped],assets:Object.keys(assetMap).length,approved:site.pages.filter(p=>p.approval).length,sourceTextPolicy:'original words retained, whitespace normalized; no new prose'},null,2));
console.log(JSON.stringify({pages:sourceReport.length,assets:Object.keys(assetMap).length,approved:0,report:'private/migration-report.json'}));
