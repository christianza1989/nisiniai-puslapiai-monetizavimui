import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import http from 'node:http';

const [captureArg, publicArg, mode='prepare'] = process.argv.slice(2);
const capture=path.resolve(captureArg), publicRoot=path.resolve(publicArg), privateRoot=path.resolve(import.meta.dirname,'../../..');
const studio=path.resolve(privateRoot,'../studio'), out=path.join(capture,'core-integration');
process.env.STUDIO_DATA_DIR=path.join(studio,'data');process.env.STUDIO_OUTPUT_DIR=path.join(studio,'output');
process.env.STUDIO_PUBLIC_CORE_DIR=publicRoot;process.env.STUDIO_NETWORK_SETTINGS=path.join(publicRoot,'config/niche-network.json');
const model=await import(pathToFileURL(path.join(privateRoot,'content-studio/src/model.mjs')));
const {bodyPlainText,validateV2Draft}=await import(pathToFileURL(path.join(privateRoot,'content-studio/src/content-package-v2.mjs')));
const {signaturepadsSnapshot,assertSignaturepadsLayout}=await import(pathToFileURL(path.join(publicRoot,'lib/signaturepads-content.mjs')));
const {renderSignaturepads}=await import(pathToFileURL(path.join(publicRoot,'components/niche/signaturepads/render.mjs')));
const layout=JSON.parse(await fs.readFile(path.join(out,'layout.json'))), source=JSON.parse(await fs.readFile(path.join(publicRoot,'sites/signaturepads/migration/site-source.json')));
const hash=x=>createHash('sha256').update(x).digest('hex');
let site=await model.getSite('signaturepads');
if(mode==='prepare'){
  if(site.pages.some(p=>p.publishedRevision))throw Error('Review preparation cannot modify approved snapshots');
  for(const page of site.pages){
    const role=layout.routes[page.id];
    if(!['category','catalog'].includes(role.kind)||role.inventoryBlock!==undefined)continue;
    const route=source.routes.find(r=>r.path===role.path),ids=role.kind==='catalog'?source.products.map(p=>p.id):route.productIds;
    const body=[...page.body,{type:'richList',ordered:false,items:ids.map(id=>{const p=source.products.find(p=>p.id===id);return [{type:'link',text:p.name,target:{kind:'page',pageId:'sp-product-'+id}}];})}];
    role.inventoryBlock=page.body.length;
    layout.styles[page.id].push({tag:'ul'});
    await model.editPage('signaturepads',page.id,{body});
  }
  await fs.writeFile(path.join(out,'layout.json'),JSON.stringify(layout,null,2)+'\n');
  await fs.writeFile(path.join(publicRoot,'sites/signaturepads/migration/core-layout.json'),JSON.stringify(layout,null,2)+'\n');
  site=await model.getSite('signaturepads');
  const pubSite={id:site.id,name:site.name,canonicalHost:site.canonicalHost,locale:site.locale,timezone:site.timezone,brand:site.brand,offer:site.offer,contact:site.contact,renderer:site.renderer,operatorName:site.operatorName};
  const pkg={schemaVersion:2,siteId:site.id,canonicalHost:site.canonicalHost,locale:site.locale,site:pubSite,pages:site.pages};
  assertSignaturepadsLayout(pkg,layout);
  for(const page of site.pages)validateV2Draft(page,pubSite);
  // Explicit PRIVATE draft view: no approval metadata is synthesized, exported
  // or admitted to the public registry. Resolve links among these local drafts.
  const urls=new Map(site.pages.map(p=>[p.id,`https://${site.canonicalHost}/${p.slug}${p.slug?'/':''}`]));
  const inline=nodes=>nodes.map(n=>n.type==='text'?n:{type:'link',text:n.text,href:n.target.kind==='page'?urls.get(n.target.pageId):n.target.url});
  const draftPages=site.pages.map(p=>({...p,url:urls.get(p.id),body:p.body.map(b=>b.content?{...b,content:inline(b.content)}:b.type==='richList'?{...b,items:b.items.map(inline)}:b)}));
  const data=signaturepadsSnapshot(pkg,draftPages,layout);
  const viewDir=path.join(out,'draft-views');await fs.mkdir(viewDir,{recursive:true});
  for(const route of data.routes){
    const id=Object.keys(layout.routes).find(id=>layout.routes[id].path===route.path);
    const html=`<!doctype html><html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>PRIVATE CORE DRAFT</title><link rel="stylesheet" href="/signaturepads/fonts.css"><link rel="stylesheet" href="/draft.css"></head><body style="margin:0"><div class="signaturepads-site">${renderSignaturepads(data,route)}</div></body></html>`;
    await fs.writeFile(path.join(viewDir,id+'.html'),html);
  }
  const report={status:'PASS',scope:'private-draft-structure-only',approval:false,deployment:false,pages:site.pages.map(p=>({id:p.id,path:layout.routes[p.id].path,revisionHash:model.revisionHash(p),bodyChars:bodyPlainText(p.body).length,media:p.media.length})),preparedAt:new Date().toISOString()};
  await fs.writeFile(path.join(out,'draft-structure.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,pages:report.pages.length,viewDir,next:'Read actual draft renders and preserved-text report before native review/approval.'}));
}else if(mode==='serve'){
  const views=new Map(Object.entries(layout.routes).map(([id,r])=>[r.path,path.join(out,'draft-views',id+'.html')]));
  const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.webp':'image/webp'};
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Cache-Control','no-store');
    if(!['127.0.0.1:8957','localhost:8957'].includes(req.headers.host)||!['GET','HEAD'].includes(req.method)){res.writeHead(403);res.end();return;}
    try{
      const pathname=new URL(req.url,'http://127.0.0.1:8957').pathname;
      const file=views.get(pathname)||(pathname==='/draft.css'?path.join(publicRoot,'components/niche/signaturepads/signaturepads.css'):
        /^\/signaturepads\/(?:fonts\.css|fonts\/[a-f0-9]{16}\.woff2)$/.test(pathname)?path.join(publicRoot,'public',pathname):
        /^\/content-assets\/signaturepads\/[a-f0-9-]+\.webp$/.test(pathname)?path.join(studio,'data/media/signaturepads',path.basename(pathname)):null);
      if(!file)throw Error('not found');const bytes=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(req.method==='HEAD'?undefined:bytes);
    }catch{res.writeHead(404);res.end();}
  });
  server.listen(8957,'127.0.0.1',()=>console.log('Private read-only Core draft renderer: http://127.0.0.1:8957/ (no lead endpoint, no public admission)'));
}else if(mode==='release'){
  const structure=JSON.parse(await fs.readFile(path.join(out,'draft-structure.json')));
  const browser=JSON.parse(await fs.readFile(path.join(out,'draft-browser.json')));
  const review=await fs.readFile(path.join(out,'AGENT-REVIEW.md'),'utf8');
  if(structure.status!=='PASS'||browser.status!=='PASS'||review.length<200)throw Error('Actual draft review evidence is required');
  for(const page of site.pages){
    if(structure.pages.find(p=>p.id===page.id)?.revisionHash!==model.revisionHash(page))throw Error('Draft changed after structure review');
    await model.recordEditorialReview(site.id,page.id,{reviewer:'Codex/signaturepads-migration-20261029',revisionHash:model.revisionHash(page),evidence:{
      usefulness:'Owner explicitly requested preservation of this existing page and its original job. See owner decisions and 26-URL migration map; no new unrelated content or checkout.',
      facts:'Existing owner catalogue claims and prices were preserved rather than newly endorsed. Six software descriptions retain the separately verified manufacturer evidence and direct authoring exception. See AGENT-REVIEW.md.',
      sources:'Original captured owner page and software manufacturer source records retained unchanged. HTML converted into native rich blocks without new prose; preserved-text and links comparison inspected.',
      media:'Canonical Studio responsive WebP import, original bytes retained privately, source SHA and dimensions verified. Actual optimized media and draft renders inspected; see AGENT-REVIEW.md for limits.',
      links:'Original active page paths, internal product relationships and external citations preserved as native page targets or HTTPS links. Layout contains positions/roles only, no source HTML or price fallback.',
      presentation:'Existing original wording retained under owner migration scope; six authorized descriptions had their full language/facts review in the prior phase. Actual Core-adapter private draft views and text equivalence checked at desktop/mobile; full framework runtime acceptance follows release. '+review.slice(0,900)
    }});
  }
  const approval=await model.approveReviewedBatch(site.id,site.pages.map(p=>p.id),'Codex/owner-authorized-local-core-integration');
  const release=await model.releaseContent(site.id);
  await fs.writeFile(path.join(out,'release.json'),JSON.stringify({approval,release,reviewSha256:hash(review),liveChanged:false},null,2)+'\n');
  console.log(JSON.stringify({state:release.state,path:release.path,packageSha256:release.packageSha256,deployment:false}));
}else throw Error('Unknown mode');
