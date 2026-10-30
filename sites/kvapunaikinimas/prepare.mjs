// Native Studio migration. Production content stays draft; only the isolated
// reserved .example fixture can be approved/exported for loopback QA.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {blockDigest,pageDigest,orderedWidgets,originalTextStyle} from '../../../niche-public-core/lib/kvapunaikinimas-presentation.mjs';
import {initialize,listSites,createSite,editSite,getSite,addPage,editPage,saveResponsiveAsset,approvePage,exportPackage,DATA,OUTPUT} from '../../content-studio/src/model.mjs';

const fixture=process.argv.includes('--fixture');
const publicRoot=path.resolve(process.env.PINET_PUBLIC_CORE_PATH||path.join(import.meta.dirname,'../../../niche-public-core'));
if(fixture&&!/[\\/]output[\\/]/.test(DATA))throw Error('Fixture data must live under an isolated output directory.');
if(fixture&&!/[\\/]output[\\/]/.test(publicRoot))throw Error('Fixture export must target an isolated output runtime, never a source checkout.');
const id='kvapunaikinimas',domain=fixture?'kvapunaikinimas.example':'kvapunaikinimas.lt';
const source=JSON.parse(await readFile(new URL('./source/pages.json',import.meta.url),'utf8'));
const presentation=JSON.parse(await readFile(new URL('./source/presentation.json',import.meta.url),'utf8'));
const mobileGeometry=JSON.parse(await readFile(new URL('./source/mobile-geometry.json',import.meta.url),'utf8'));
const widgetSpacing=JSON.parse(await readFile(new URL('./source/widget-spacing.json',import.meta.url),'utf8'));
const privacy=JSON.parse(await readFile(new URL('./privacy-copy.json',import.meta.url),'utf8'));
await initialize();
await mkdir(OUTPUT,{recursive:true});
if(!(await listSites()).some(s=>s.id===id))await createSite({siteId:id,canonicalHost:domain,name:'Kvapų naikinimas',offer:'Kvapų naikinimas ozonu'});
if((await getSite(id)).canonicalHost!==domain)throw Error('Unexpected Studio identity; do not rewrite another environment.');
await editSite(id,{contact:{email:'sales@kvapunaikinimas.lt',phone:'+37064819979'},brand:{accent:'#276d72'},facts:fixture?'Synthetic local QA of the owner-requested twelve-route migration. No owner approval, production release, legal compliance or scientific claim review is represented.':'Owner identifies kvapunaikinimas.lt as their existing WordPress service site and requests preservation of its public text, media, contacts and twelve paths. Ozone-claim revisions are explicitly excluded. Legal controller identity remains unspecified.'});
const sourceRoot=path.resolve(import.meta.dirname,'source');
await mkdir(path.join(sourceRoot,'images'),{recursive:true});
const originalUrl=value=>{const found=value?.match(/\/wp-content\/uploads\/([^?#"\s]+)/);return found?`https://kvapunaikinimas.lt/wp-content/uploads/${found[1]}`:null;};
const urls=[...new Set(source.pages.flatMap(p=>p.imageSources).map(originalUrl).filter(Boolean))];
urls.push('https://kvapunaikinimas.lt/wp-content/uploads/2024/04/gaivus-oras.webp');
urls.push('https://kvapunaikinimas.lt/wp-content/uploads/2021/06/logo-o3.png');
urls.push('https://kvapunaikinimas.lt/wp-content/uploads/2024/03/Titulinis-e1712211692495.jpg');
const existing=await getSite(id),assets={},provenance=[];
const friendly=name=>({
 'logo-o3.png':'Kvapų naikinimas', 'gaivus-oras.webp':'Gaivus oras','Titulinis-e1712211692495.jpg':'Dangaus fonas',
 'Patalpu-kvapu-naikinimas.jpg':'Patalpų kvapų naikinimas',
 'Kvapu-naikinimas-automobilyje-1.jpg':'Kvapų naikinimas automobilyje',
 'Cigareciu-kvapu-naikinimas.jpg':'Cigarečių kvapų naikinimas',
 'Gyvunu-kvapo-naikinimas.jpg':'Gyvūnų kvapo naikinimas',
 'pelesio-naikinimas-1.webp':'Pelėsio naikinimas', 'ozonavimas.jpg':'Ozonavimas',
 'Kvapu-naikinimas-kontaktai.jpg':'Kvapų naikinimo komandos automobilis',
 'blogi-kvapai.png':'Blogi kvapai', 'pelesis.png':'Pelėsis', 'dulkiu-erkutes2.png':'Dulkių erkutės',
 'virusai.png':'Virusai', 'alergenai-1.png':'Alergenai',
 'imageedit_1_4410406638-1.png':'Kvapų naikinimo profesionalai',
 'imageedit_5_2550315103.png':'Ozonavimo įranga',
 'imageedit_9_6143204277.png':'Pelėsio naikinimo iliustracija',
 'imageedit_11_8985628063.png':'Kvapų naikinimo automobilyje iliustracija'
 }[name]||name.replace(/\.[^.]+$/,'').replaceAll('-',' ').replaceAll('_',' '));
for(const url of [...new Set(urls)]){
 const base=path.basename(new URL(url).pathname),full=base.replace(/-\d+x\d+(?=\.[^.]+$)/,'');
 const alt=friendly(full),cached=existing.assets.find(a=>a.alt===alt);
 if(cached){assets[base]=cached;assets[full]=cached;continue;}
 const file=path.join(sourceRoot,'images',full);let bytes,mime,used=url;
 try{bytes=await readFile(file);mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'}[full.split('.').pop().toLowerCase()];}
 catch{
  const candidate=url.replace(base,full);let r=await fetch(candidate,{signal:AbortSignal.timeout(20000)});
  if(!r.ok&&candidate!==url){r=await fetch(url,{signal:AbortSignal.timeout(20000)});used=url;}else used=candidate;
  if(!r.ok)throw Error(`Cannot retrieve original media ${base}: ${r.status}`);
  mime=r.headers.get('content-type')?.split(';')[0];bytes=Buffer.from(await r.arrayBuffer());
  await writeFile(file,bytes);
 }
 const asset=await saveResponsiveAsset(id,{mime,alt,rights:'Esamos savininko svetainės kvapunaikinimas.lt medija, perkelta savininko pavedimu.'},bytes);
 assets[base]=asset;assets[full]=asset;
 provenance.push({source:used,file:full,sha256:createHash('sha256').update(bytes).digest('hex'),sourceBytes:bytes.length,variants:asset.optimization.variantBytes});
 existing.assets.push(...asset.variants);
}
// WordPress display variants can have a different crop from the full original.
// Import the actual displayed pixels through the same canonical media pipeline.
for(const record of presentation.pages.flatMap(p=>p.widgets).filter(w=>w.kind==='image.default'&&w.image)){
 const url=originalUrl(record.image.src);if(!url)continue;
 const base=path.basename(new URL(url).pathname);if(!/-\d+x\d+(?=\.[^.]+$)/.test(base))continue;
 const full=base.replace(/-\d+x\d+(?=\.[^.]+$)/,'');
 const rights='Esamos savininko svetainės medija. Originalus rodomas variantas: '+url;
 let asset=existing.assets.find(a=>a.rights===rights);
 if(!asset){
  const file=path.join(sourceRoot,'images',base);let bytes;
  try{bytes=await readFile(file);}catch{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Cannot retrieve source display crop: '+base);bytes=Buffer.from(await r.arrayBuffer());await writeFile(file,bytes);}
  const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'}[base.split('.').pop().toLowerCase()];
  asset=await saveResponsiveAsset(id,{mime,alt:record.image.alt||friendly(full),rights},bytes);existing.assets.push(...asset.variants);
  provenance.push({source:url,file:base,sha256:createHash('sha256').update(bytes).digest('hex'),sourceBytes:bytes.length,variants:asset.optimization.variantBytes});
 }
 assets[base]=asset;
}
const clean=b=>b.type==='heading'?{type:'heading',level:b.level>=3?3:2,text:b.text}:b;
const layout={version:3,assets:Object.fromEntries(Object.entries(assets).map(([name,a])=>[name,a.alt])),pages:{}};
const specs=[];
for(const p of source.pages){
 const slug=p.path.replace(/^\/+|\/+$/g,''),body=[],widgets={},formats={};let beforeContact=true;
 const sourcePage=presentation.pages.find(q=>q.slug===slug);
 const mobilePage=mobileGeometry.pages.find(q=>q.slug===slug);
 const append=b=>{
  const block=b.type==='list'?{type:'list',items:b.items.map(i=>typeof i==='string'?i:i.text)}:clean({type:b.type,...(b.type==='heading'?{level:b.level}:{}),text:b.text});
  const index=body.length;body.push(block);
  formats[index]={digest:blockDigest(block),...(b.style?{style:{size:Math.round(b.style.size),weight:Math.round(b.style.weight/100)*100,...(b.style.line==='normal'?{line:'normal'}:typeof b.style.line==='number'&&b.style.line>0?{line:Math.round(b.style.line*100)/100}:{}),align:b.style.align,letter:b.style.letter,color:originalTextStyle(b.style).color,marginTop:b.style.marginTop,marginBottom:b.style.marginBottom}}:{}),...(b.marker?{marker:b.marker}:{}),...(b.marks?.length?{marks:b.marks}:{}),...(b.type==='list'?{ordered:b.ordered===true,start:b.start||1,itemMarks:b.items.map(i=>i.marks||[])}:{})};
 };
 for(const w of p.widgets){
  if(w.kind==='heading.default'&&w.text==='KONTAKTAI')beforeContact=false;
  if(!beforeContact)continue;
  const start=body.length;
  const rich=sourcePage?.widgets.find(q=>q.id===w.id),groups=[];
  if(rich?.accordions.length){
   for(const a of rich.accordions){const groupStart=body.length;if(a.title)append({type:'heading',level:2,text:a.title,style:a.titleStyle});for(const b of a.blocks)append(b);groups.push({start:groupStart,end:body.length,open:a.open,hasTitle:!!a.title});}
  }else for(const b of rich?.blocks.length?rich.blocks:w.blocks){if(b.type==='list'?b.items.length:b.text?.trim())append(b);}
  if(w.kind==='button.default'&&w.text)body.push({type:'paragraph',text:w.text});
  const imageAlts=[];
  for(const i of w.images){const url=originalUrl(i.src);if(!url)continue;const a=assets[path.basename(new URL(url).pathname)];if(a&&!imageAlts.includes(a.alt)){imageAlts.push(a.alt);const index=body.length;body.push({type:'image',assetId:a.id});if(rich?.image)formats[index]={image:{alt:a.alt,width:rich.image.box.w,height:rich.image.box.h,radius:rich.image.radius||0}};}}
  const spacing=widgetSpacing.find(q=>q.slug===slug&&q.width===1440)?.widgets.find(q=>q.id===w.id);
  const mobileSpacing=widgetSpacing.find(q=>q.slug===slug&&q.width===390)?.widgets.find(q=>q.id===w.id);
  if(start!==body.length)widgets[w.id]={kind:w.kind,start,end:body.length,imageAlts,sectionId:rich?.sectionId,...(rich?{box:rich.box}:{}),mobileBox:mobilePage?.widgets.find(q=>q.id===w.id)?.box,paddingBefore:spacing?.head||0,paddingAfter:spacing?.tail||0,mobilePaddingBefore:mobileSpacing?.head||0,mobilePaddingAfter:mobileSpacing?.tail||0,...(groups.length?{groups}:{})};
 }
 if(slug==='musu-slapuku-politika'){body.splice(0,body.length,...privacy.blocks);for(const key of Object.keys(widgets))delete widgets[key];for(const key of Object.keys(formats))delete formats[key];}
 const firstHeading=body.find(b=>b.type==='heading')?.text||p.title;
 let description=slug==='musu-slapuku-politika'?privacy.description:p.description;
 if(!description){description=slug.includes('klausimai')?body.filter(b=>b.type==='heading').slice(1,4).map(b=>b.text).join(' '):slug===''?'Patalpų kvapų naikinimas, kvapų naikinimas automobilyje, cigarečių ir gyvūnų kvapo naikinimas. Vilnius ir Kaunas.':firstHeading;}
 const title=slug==='musu-slapuku-politika'?privacy.title:slug==='kvapu-naikinimas'?'Kvapų naikinimas ozonu':p.title;
 const type=slug===''?'home':slug.includes('kaina')?'location':/klausimai|slapuku|kas-tai/.test(slug)?'faq':'service';
 const media=[...new Set(body.filter(b=>b.type==='image').map(b=>b.assetId))];
 // Shared chrome and media are explicitly attached; the runtime never exposes
 // another site's originals or an unapproved arbitrary static image directory.
 const attach=[...new Set([...media,assets['logo-o3.png'].id])];
 if(slug==='')attach.push(assets['gaivus-oras.webp'].id,assets['Titulinis-e1712211692495.jpg'].id);
 const state=await getSite(id);let page=state.pages.find(q=>q.slug===slug);
 if(!page)page=await addPage(id,{slug,type,title,description:description.slice(0,300),intent:firstHeading,body});
 await editPage(id,page.id,{title,description:description.slice(0,300),intent:firstHeading,body,media:attach.map(id=>({id})),publishAt:'2025-09-03T16:32:41.000Z',factChecks:fixture?[]:['Migracijos juodraštis: Roko patvirtinimas ir paleidimo faktai atskiri. Ozono teiginiai išsaugoti pagal aiškią išimtį.']});
 const firstWidget=sourcePage?.widgets.find(w=>w.kind==='heading.default');
 const firstSection=sourcePage?.sections[0];
 let previous;
 for(const [,widget] of orderedWidgets(widgets)){
  if(widget.box){widget.gap=previous?.sectionId===widget.sectionId?Math.max(0,widget.box.y-(previous.box.y+previous.box.h)):0;widget.mobileGap=previous?.sectionId===widget.sectionId&&previous.mobileBox&&widget.mobileBox?Math.max(0,widget.mobileBox.y-previous.mobileBox.y-previous.mobileBox.h):0;previous=widget;}
 }
 const mainWidgets=orderedWidgets(widgets).map(([,w])=>w).filter(w=>w.sectionId===firstSection?.id&&w.box);
 const lastMain=mainWidgets.at(-1);
 const mobileHeading=mobilePage?.widgets.find(w=>w.id===firstWidget?.id),mobileSection=mobilePage?.sections[0];
 layout.pages[slug]={widgets,heading:firstHeading,formats,digest:pageDigest(body,Object.values(assets)),top:firstWidget&&firstSection?firstWidget.box.y-firstSection.box.y:90,mobileTop:mobileHeading&&mobileSection?mobileHeading.box.y-mobileSection.y:108,bottom:firstSection&&lastMain?Math.max(60,firstSection.box.y+firstSection.box.h-lastMain.box.y-lastMain.box.h):150,mobileBottom:mobileSection&&lastMain?.mobileBox?Math.max(30,mobileSection.y+mobileSection.h-lastMain.mobileBox.y-lastMain.mobileBox.h):100};specs.push({slug,id:page.id,type});
}
const site=await getSite(id);
for(const page of site.pages){const links=specs.filter(s=>s.id!==page.id&&s.slug!=='musu-slapuku-politika').slice(0,12).map(s=>({targetPageId:s.id,label:site.pages.find(p=>p.id===s.id).title}));await editPage(id,page.id,{links});}
await mkdir(path.join(publicRoot,'config'),{recursive:true});
await writeFile(path.join(publicRoot,'config/kvapunaikinimas-layout.json'),JSON.stringify(layout,null,2)+'\n');
await writeFile(path.join(OUTPUT,'media-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
if(fixture){
 if(!(await getSite(id)).canonicalHost.endsWith('.example'))throw Error('Synthetic approval refused for a real domain.');
 const linked=(await getSite(id)).pages.map(p=>({id:p.id,links:p.links}));
 for(const p of linked){await editPage(id,p.id,{links:[]});await approvePage(id,p.id,'synthetic-local-fixture-not-owner-approval');}
 for(const p of linked){await editPage(id,p.id,{links:p.links});await approvePage(id,p.id,'synthetic-local-fixture-not-owner-approval');}
 const exported=await exportPackage(id);const target=path.join(publicRoot,'content-packages',id);
 await mkdir(path.join(target,'assets'),{recursive:true});await copyFile(exported.path,path.join(target,'content-package.json'));
 const fixtureSite=await getSite(id);for(const a of fixtureSite.assets)await copyFile(path.join(DATA,'media',id,path.basename(a.src)),path.join(target,'assets',path.basename(a.src)));
 console.log(JSON.stringify({status:'SYNTHETIC_LOCAL_FIXTURE',domain,pages:specs.length,output:target}));
}else console.log(JSON.stringify({status:'DRAFT_ONLY',domain,pages:specs.length,data:DATA,ownerApproval:false}));
