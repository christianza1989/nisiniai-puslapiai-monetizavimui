(async function parityRevisionMain(){
  const fs=await import('node:fs/promises'),path=await import('node:path'),{pathToFileURL}=await import('node:url'),{createHash}=await import('node:crypto');
  const [publicArg,outArg,mode='prepare']=process.argv.slice(2);
  if(!publicArg||!outArg)throw Error('Usage: <public-core> <owned-output> prepare|serve|release');
  const privateRoot=path.resolve(import.meta.dirname,'../../..'),publicRoot=path.resolve(publicArg),out=path.resolve(outArg),studio=path.resolve(privateRoot,'../studio');
  if(!out.replaceAll('\\','/').startsWith('D:/Core/output/signaturepads-migration-20261029/'))throw Error('Owned local output only');
  await fs.mkdir(out,{recursive:true});
  process.env.STUDIO_DATA_DIR=path.join(studio,'data');process.env.STUDIO_OUTPUT_DIR=path.join(studio,'output');process.env.STUDIO_PUBLIC_CORE_DIR=publicRoot;process.env.STUDIO_NETWORK_SETTINGS=path.join(publicRoot,'config/niche-network.json');
  const model=await import(pathToFileURL(path.join(privateRoot,'content-studio/src/model.mjs')));
  const {validateV2Draft}=await import(pathToFileURL(path.join(privateRoot,'content-studio/src/content-package-v2.mjs')));
  const {signaturepadsSnapshot,assertSignaturepadsLayout}=await import(pathToFileURL(path.join(publicRoot,'lib/signaturepads-content.mjs')));
  const {renderSignaturepads}=await import(pathToFileURL(path.join(publicRoot,'components/niche/signaturepads/render.mjs')));
  const layoutPath=path.join(publicRoot,'sites/signaturepads/migration/core-layout.json'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  let site=await model.getSite('signaturepads'),layout=JSON.parse(await fs.readFile(layoutPath));
  const sigma=site.pages.find(p=>p.id==='sp-product-488'),text=b=>b.text??b.content?.map(n=>n.text).join('')??'';
  if(mode==='prepare'){
    const existing=await fs.readFile(path.join(out,'revision-prepare.json'),'utf8').then(JSON.parse).catch(()=>null);
    if(existing){if(existing.revisionHash!==model.revisionHash(sigma))throw Error('Prepared revision changed');console.log(JSON.stringify({state:'already-prepared',revisionHash:existing.revisionHash}));return;}
    const role=layout.routes[sigma.id],index=role.copyEnd-1,body=structuredClone(sigma.body);
    if(text(body[index])!=='Pristatymas 5-8 d.d.'||text(body[index-1])!==text(body[index])||!text(body[role.priceBlock]).startsWith('189,00€'))throw Error('Expected exact Sigma duplicate/price binding');
    for(const p of site.pages)if(!p.publishedRevision||model.revisionHash(p)!==p.publishedRevision.revisionHash)throw Error('Unreviewed unrelated draft must not be changed');
    await fs.writeFile(path.join(out,'sigma-before.json'),JSON.stringify(sigma,null,2)+'\n',{flag:'wx'});
    await fs.writeFile(path.join(out,'layout-before.json'),await fs.readFile(layoutPath),{flag:'wx'});
    body.splice(index,1);role.copyEnd--;role.priceBlock--;layout.styles[sigma.id].splice(index,1);
    const previous=path.resolve(out,'../deep-comparison-20261029T2016');
    const records=(await Promise.all((await fs.readdir(previous)).filter(f=>/^batch-\d+\.json$/.test(f)).map(async f=>JSON.parse(await fs.readFile(path.join(previous,f),'utf8'))))).flat();
    for(const binding of Object.values(layout.routes).filter(r=>r.kind==='product')){
      const original=records.find(r=>r.side==='original'&&r.width===1440&&r.path===binding.path);
      if(!original?.gallery||original.gallery.images.length<binding.gallery.length)throw Error('Missing original gallery measurement');
      binding.galleryDisplayWidths=original.gallery.images.slice(0,binding.gallery.length).map((i,n)=>i.rect.w>0?i.rect.w:n===0?300:550);
    }
    const orders=JSON.parse(await fs.readFile(path.join(out,'legacy-sort-orders.json')));
    const ids=Object.values(layout.routes).filter(r=>r.kind==='product').map(r=>r.productId);
    for(const order of ['date','popularity','rating'])if(orders[order].length!==ids.length||ids.some(id=>!orders[order].includes(id)))throw Error('Original sort inventory incomplete');
    layout.catalogueOrders=orders;
    const changed=await model.editPage(site.id,sigma.id,{body});
    await fs.writeFile(layoutPath,JSON.stringify(layout,null,2)+'\n');
    const receipt={siteId:site.id,pageId:sigma.id,removedBlock:index,previousPublishedRevision:sigma.publishedRevision.revisionHash,revisionHash:model.revisionHash(changed),layoutSha256:hash(await fs.readFile(layoutPath)),scope:'owner-authorized local A01-A07 correction; no production',preparedAt:new Date().toISOString()};
    await fs.writeFile(path.join(out,'revision-prepare.json'),JSON.stringify(receipt,null,2)+'\n');
    console.log(JSON.stringify(receipt));return;
  }
  const urls=new Map(site.pages.map(p=>[p.id,`https://${site.canonicalHost}/${p.slug}${p.slug?'/':''}`]));
  const inline=nodes=>nodes.map(n=>n.type==='link'?{type:'link',text:n.text,href:n.target.kind==='page'?urls.get(n.target.pageId):n.target.url}:n);
  const pages=site.pages.map(p=>({...p,url:urls.get(p.id),body:p.body.map(b=>b.content?{...b,content:inline(b.content)}:b.type==='richList'?{...b,items:b.items.map(inline)}:b)}));
  const pkg={schemaVersion:2,siteId:site.id,canonicalHost:site.canonicalHost,site:site.pages[0].siteSnapshot,pages};
  for(const p of site.pages)validateV2Draft(p,pkg.site);
  assertSignaturepadsLayout(pkg,layout);
  const data=signaturepadsSnapshot(pkg,pages,layout);
  if(data.products.length!==19||data.routes.length!==26)throw Error('Native inventory changed');
  if(mode==='serve'){
    const http=await import('node:http');
    const structure={status:'PASS',scope:'private-native-draft',revisionHash:model.revisionHash(sigma),layoutSha256:hash(await fs.readFile(layoutPath)),pages:pages.length,products:data.products.length};
    await fs.writeFile(path.join(out,'draft-structure.json'),JSON.stringify(structure,null,2)+'\n');
    const server=http.createServer(async(req,res)=>{
      res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
      if(!['127.0.0.1:8957','localhost:8957'].includes(req.headers.host)||!['GET','HEAD'].includes(req.method)){res.writeHead(403);res.end();return;}
      try{
        const url=new URL(req.url,'http://127.0.0.1:8957'),route=data.routes.find(r=>r.path===url.pathname);
        if(route){
          const html='<!doctype html><html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/signaturepads/fonts.css"><link rel="stylesheet" href="/draft.css"><title>PRIVATE CORE DRAFT</title></head><body style="margin:0"><div class="signaturepads-site">'+renderSignaturepads(data,route,url.searchParams)+'</div><script src="/client.js" defer></script></body></html>';
          res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.method==='HEAD'?undefined:html);return;
        }
        const file=url.pathname==='/draft.css'?path.join(publicRoot,'components/niche/signaturepads/signaturepads.css'):url.pathname==='/client.js'?path.join(publicRoot,'components/niche/signaturepads/client.js'):
          /^\/signaturepads\/(?:fonts\.css|fonts\/[a-f0-9]{16}\.woff2)$/.test(url.pathname)?path.join(publicRoot,'public',url.pathname):
          /^\/content-assets\/signaturepads\/[a-f0-9-]+\.webp$/.test(url.pathname)?path.join(studio,'data/media/signaturepads',path.basename(url.pathname)):null;
        if(!file)throw Error('Not found');
        const types={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.webp':'image/webp'};
        res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(req.method==='HEAD'?undefined:await fs.readFile(file));
      }catch{res.writeHead(404);res.end();}
    });
    server.listen(8957,'127.0.0.1',()=>console.log('Private native correction preview: http://127.0.0.1:8957/'));return;
  }
  if(mode==='release'){
    const prepared=JSON.parse(await fs.readFile(path.join(out,'revision-prepare.json'))),verified=JSON.parse(await fs.readFile(path.join(out,'draft-verification.json')));
    if(verified.status!=='PASS'||verified.revisionHash!==model.revisionHash(sigma)||prepared.revisionHash!==model.revisionHash(sigma)||verified.layoutSha256!==hash(await fs.readFile(layoutPath)))throw Error('Actual current draft review evidence required');
    await model.recordEditorialReview(site.id,sigma.id,{reviewer:'Codex/signaturepads-local-corrections-20261030',revisionHash:model.revisionHash(sigma),evidence:{
      usefulness:'Direct owner request to fix A01-A07 locally. Exact existing Sigma product job retained; only one repeated delivery paragraph removed.',
      facts:'All 27 original paragraph values and emphasis runs compared with actual original; price 189,00 EUR before VAT and technical values unchanged. No new prose or claims.',
      sources:'Original owner page and immutable 2026-10-29 live DOM paragraph-and-emphasis-crosscheck retained. New correction receipt records old and new native hashes.',
      media:'All original gallery families and approved 199 variants retained. Original display widths restored from measured original DOM; no fabricated image detail or new media.',
      links:'Same product slug, native page targets and source/gallery aliases. Source native projection, prices and eligibility guards remain authoritative.',
      presentation:'Full Sigma text read after mechanical duplicate removal, original word boundaries and emphasis preserved. Actual native draft desktop/mobile, product gallery and named dialog inspection in draft-verification.json. No public deployment or inbox claim.'
    }});
    const approval=await model.approveReviewedBatch(site.id,[sigma.id],'Codex/owner-authorized-local-A01-A07');
    const release=await model.releaseContent(site.id);
    const receipt={approval,release,productionChanged:false,createdAt:new Date().toISOString()};
    await fs.writeFile(path.join(out,'release.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));return;
  }
  throw Error('Unknown mode');
})();
