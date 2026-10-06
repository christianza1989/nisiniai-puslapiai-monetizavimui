import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {site,guides,editorial} from './content.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const project=path.resolve(here,'../../..'),core=path.resolve(project,'../dovanos-memorycasting');
const runtime=path.resolve(process.argv[2]||'');
if(!process.argv[2])throw Error('Supply the owner-authorized homepage source directory.');
// An isolated Studio workspace: never mutate existing user/editor operational data.
process.env.STUDIO_DATA_DIR=process.env.PHONEBRIDGER_GUIDE_STUDIO||path.join(process.env.TEMP,'phonebridger-knowledge-studio-20261006');
process.env.STUDIO_OUTPUT_DIR=path.join(process.env.STUDIO_DATA_DIR,'output');
process.env.STUDIO_NETWORK_SETTINGS=path.join(core,'config/niche-network.json');
const studio=await import(pathToFileURL(path.join(project,'content-studio/src/model.mjs')).href);
await studio.initialize();
let current;try{current=await studio.getSite('phonebridger');}catch(error){if(error.status!==404)throw error;current=await studio.createSite(site);}
await studio.editSite('phonebridger',site);
const sources={
 'getting-started':['exec-d17bcb6f-8194-4d84-b0d4-36eb556778f1.png','An illustrative dark laptop and phone beside it on a softly lit desk.'],
 'usb-wifi':['exec-cc2010e4-9311-496e-9500-28caff8d0dfa.png','An illustrative USB-A to USB-C data cable on a charcoal desk.'],
 'android-permissions':['exec-0d70e67e-6068-40c8-b5d8-48ce90c5db41.png','An illustrative smartphone beside a small physical padlock.'],
 'phone-position':['exec-9587eec2-4263-4df0-a76e-294dc71e0fc6.png','An illustrative laptop with phones placed to its left and above.']
};
const generationRoot='C:/Users/Lenovo/.codex/generated_images/01a1062d-ea5d-7960-96b4-1dc973a2f771';
const imageLedgerFile=path.join(here,'image-ledger.json');
let imageLedger;try{imageLedger=JSON.parse(await readFile(imageLedgerFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;imageLedger={};}
for(const [key,[filename,alt]]of Object.entries(sources)){
 if(imageLedger[key])continue;
 const bytes=await readFile(path.join(generationRoot,filename));
 const result=await studio.saveResponsiveAsset('phonebridger',{mime:'image/png',alt,rights:'Original AI-assisted contextual illustration commissioned for PhoneBridger; not documentary evidence.',prompt:`Original ImageGen generation ${filename}; complete prompt retained in PROMPTS.md. Neutral upper-left key and restrained rear-right pink light; no text, logos or factual interface.`,credit:''},bytes);
 imageLedger[key]={originalSha256:createHash('sha256').update(bytes).digest('hex'),originalBytes:bytes.length,assetId:result.id,variants:result.variants.map(({id,src,width,height,bytes,sha256})=>({id,src,width,height,bytes,sha256}))};
 await writeFile(imageLedgerFile,JSON.stringify(imageLedger,null,2)+'\n');
}
const p=text=>({type:'paragraph',text});
const decode=text=>text.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim();
const existing=[];
for(const slug of ['shop','contact','help','downloads','about','privacy','terms']){
 const html=await readFile(path.join(runtime,slug,'index.html'),'utf8');
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
 existing.push({slug,type:slug==='shop'?'product':'service',title:decode(main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]),description:decode(html.match(/name="description" content="([^"]*)"/)[1]),intent:`Understand PhoneBridger ${slug} information and its current beta boundaries.`,body:[...main.matchAll(/<(p|h2|li)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(m=>m[1]==='h2'?{type:'heading',level:2,text:decode(m[2])}:p(decode(m[2]))).filter(b=>b.text),related:slug==='help'?['guides','downloads','contact']:[]});
}
const home={slug:'',type:'home',title:'Your mouse. Now on your phone.',description:'Use your Windows mouse and keyboard in your own Android apps. Connect through USB or Wi-Fi.',intent:'Understand what PhoneBridger does before choosing a setup.',body:[p(site.offer),p('Control up to three Android phones from the Windows app. Use saved pairing, choose a screen edge and work in your own phone apps. The live browser demo is an interactive simulation. The current beta prefers USB automatically and uses Wi-Fi as a fallback. Paid orders are not open.')],related:['guides','shop','help']};
const hub={slug:'guides',type:'faq',title:'A clear start. A smoother everyday setup.',description:'PhoneBridger guides for first pairing, USB and Wi-Fi, Android permissions and phone placement.',intent:'Find the right setup answer and its known limitations.',body:[p('Practical guides for the phone beside your PC. Start with pairing, then choose the connection and position that fit your desk.'),p('These guides explain the current Windows and Android beta. Product instructions are checked against release documentation; platform requirements link to primary sources. Illustrations show context, not a certified device test.')],related:guides.map(g=>g.slug)};
const records=[home,...existing,hub,...guides.map(g=>({...g,body:[p(g.lede),...g.body],related:['guides',...g.related,'downloads','contact']})),editorial];
current=await studio.getSite('phonebridger');
for(const record of records){
 let page=current.pages.find(p=>p.slug===record.slug);
 if(!page){page=await studio.addPage('phonebridger',{...record,publishAt:'2026-10-06T00:00:00.000Z'});current=await studio.getSite('phonebridger');}
 // Studio, not a handwritten hash, owns the exact revision and approval.
 const desired={title:record.title,description:record.description,intent:record.intent,body:record.body,externalLinks:(record.sources||[]).map(s=>({...s,verified:true})),factChecks:[]};
 const changed=Object.entries(desired).some(([key,value])=>JSON.stringify(page[key]??[])!==JSON.stringify(value)) || (record.image && !page.media.some(m=>m.id===imageLedger[record.image].assetId));
 if(changed)await studio.editPage('phonebridger',page.id,{...desired,media:record.image?[{id:imageLedger[record.image].assetId}]:[]});
 if(changed||!page.publishedRevision)await studio.approvePage('phonebridger',page.id,'codex-editorial-review-20261006');
}
current=await studio.getSite('phonebridger');
for(const record of records){
 const page=current.pages.find(p=>p.slug===record.slug);
 const links=(record.related||[]).map(slug=>{const target=current.pages.find(p=>p.slug===slug);if(!target)throw Error(`Missing target ${slug}`);return{targetPageId:target.id,label:slug==="guides/getting-started"?"setup guide":slug==="guides/android-permissions"?"Android permissions explained":slug==="guides/usb-wifi"?"USB or Wi-Fi?":target.title};});
 if(JSON.stringify(page.links)!==JSON.stringify(links)){await studio.editPage('phonebridger',page.id,{links});await studio.approvePage('phonebridger',page.id,'codex-editorial-review-20261006');}
}
await studio.exportPackage('phonebridger');
const exported=path.join(process.env.STUDIO_OUTPUT_DIR,'phonebridger');
const pkg=JSON.parse(await readFile(path.join(exported,'content-package.json'),'utf8'));
const {validateContentPackage}=await import(pathToFileURL(path.join(core,'scripts/content-package-core.mjs')).href);
validateContentPackage(pkg);
await mkdir(path.join(here,'package/assets'),{recursive:true});
const packageFile=path.join(here,'package/content-package.json');
let previous;try{previous=JSON.parse(await readFile(packageFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(previous && JSON.stringify(previous.pages)===JSON.stringify(pkg.pages) && JSON.stringify(previous.site)===JSON.stringify(pkg.site))pkg.generatedAt=previous.generatedAt;
await writeFile(packageFile,JSON.stringify(pkg,null,2)+'\n');
for(const file of new Set(pkg.pages.flatMap(p=>p.media.map(m=>path.basename(m.src))))){
 await copyFile(path.join(exported,'assets',file),path.join(here,'package/assets',file));
 await mkdir(path.join(runtime,'content-assets/phonebridger'),{recursive:true});
 await copyFile(path.join(exported,'assets',file),path.join(runtime,'content-assets/phonebridger',file));
}
console.log(JSON.stringify({pages:pkg.pages.length,guides:guides.length,images:Object.keys(imageLedger).length,variants:new Set(pkg.pages.flatMap(p=>p.media.map(m=>m.id))).size,exactRevisionValidation:'PASS',mode:'private shadow; no public admission',originals:'private Studio data only'}));
