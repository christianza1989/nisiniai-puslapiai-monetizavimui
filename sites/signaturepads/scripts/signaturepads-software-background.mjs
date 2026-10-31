(async function softwareBackgroundRevision(){
 const fs=await import('node:fs/promises'),path=await import('node:path'),{pathToFileURL}=await import('node:url'),{createHash}=await import('node:crypto');
 const [publicArg,outArg,mode='prepare']=process.argv.slice(2),privateRoot=path.resolve(import.meta.dirname,'../../..'),publicRoot=path.resolve(publicArg),out=path.resolve(outArg),studio=path.resolve(privateRoot,'../studio');
 if(out.replaceAll('\\','/')!=='D:/Core/output/signaturepads-migration-20261029/software-background-20261030')throw Error('Owned scope only');
 process.env.STUDIO_DATA_DIR=path.join(studio,'data');process.env.STUDIO_OUTPUT_DIR=path.join(studio,'output');process.env.STUDIO_PUBLIC_CORE_DIR=publicRoot;process.env.STUDIO_NETWORK_SETTINGS=path.join(publicRoot,'config/niche-network.json');
 const model=await import(pathToFileURL(path.join(privateRoot,'content-studio/src/model.mjs'))),site=await model.getSite('signaturepads'),home=site.pages.find(p=>p.id==='sp-home'),hash=v=>createHash('sha256').update(v).digest('hex'),read=async name=>JSON.parse(await fs.readFile(path.join(out,name))),layoutPath=path.join(publicRoot,'sites/signaturepads/migration/core-layout.json');
 if(mode==='prepare'){
 const previous=await fs.readFile(path.join(out,'revision-prepare.json'),'utf8').then(JSON.parse).catch(()=>null);if(previous){if(previous.revisionHash!==model.revisionHash(home))throw Error('Prepared revision changed');console.log(JSON.stringify(previous));return;}
 for(const p of site.pages)if(!p.publishedRevision||model.revisionHash(p)!==p.publishedRevision.revisionHash)throw Error('Unrelated draft changed');
 await fs.writeFile(path.join(out,'native-site-before.json'),JSON.stringify(site,null,2),{flag:'wx'});await fs.writeFile(path.join(out,'layout-before.json'),await fs.readFile(layoutPath),{flag:'wx'});
 const source=await read('source-receipt.json'),bytes=await fs.readFile(source.file);if(hash(bytes)!==source.sha256)throw Error('Original hash changed');
 const asset=await model.saveResponsiveAsset(site.id,{mime:'image/jpeg',alt:'Du darbuotojai prie kompiuterių',rights:'Perkelta iš savininko signaturepads.lt svetainės pagal jo pavedimą; originali svetainės iliustracija.',credit:'signaturepads.lt',prompt:source.source+'\nOwner screenshot identifies original software-section background. Restore same photo locally; no generation.'},bytes);
 const changed=await model.editPage(site.id,home.id,{media:[...home.media.map(m=>({id:m.id,alt:m.alt})),{id:asset.id}]});
 if(JSON.stringify(home.body)!==JSON.stringify(changed.body)||home.slug!==changed.slug||home.title!==changed.title||home.description!==changed.description||home.publishAt!==changed.publishAt)throw Error('Media-only edit changed content');
 const fid=changed.media.find(m=>m.id===asset.id)?.familyId,newMedia=changed.media.filter(m=>m.familyId===fid);if(!fid||newMedia.length<1)throw Error('Native family missing');
 const primary=[...newMedia].sort((a,b)=>b.width-a.width)[0],layout=JSON.parse(await fs.readFile(layoutPath));layout.home.softwareBackground=fid;await fs.writeFile(layoutPath,JSON.stringify(layout,null,2)+'\n');
 const aliasPath=path.join(publicRoot,'config/content-media-aliases.json'),aliases=JSON.parse(await fs.readFile(aliasPath)),from=new URL(source.source).pathname;
 if(aliases.entries.some(a=>a.siteId===site.id&&a.from===from))throw Error('Unexpected existing alias');
 aliases.entries.push({siteId:site.id,pageId:home.id,assetId:primary.id,from});await fs.writeFile(aliasPath,JSON.stringify(aliases,null,2)+'\n');
 const receipt={siteId:site.id,pageId:home.id,revisionHash:model.revisionHash(changed),previousPublishedRevision:home.publishedRevision.revisionHash,familyId:fid,primaryId:primary.id,variants:newMedia.map(m=>({id:m.id,src:m.src,width:m.width,height:m.height})),layoutSha256:hash(await fs.readFile(layoutPath)),sourceSha256:source.sha256,bodyUnchanged:true,preparedAt:new Date().toISOString()};
 await fs.writeFile(path.join(out,'revision-prepare.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));return;
 }
 if(mode==='release'){
 const prepared=await read('revision-prepare.json'),verified=await read('draft-verification.json');if(verified.status!=='PASS'||verified.revisionHash!==model.revisionHash(home)||prepared.revisionHash!==model.revisionHash(home)||verified.layoutSha256!==hash(await fs.readFile(layoutPath)))throw Error('Current visual/media evidence required');
 const before=await read('native-site-before.json'),oldHome=before.pages.find(p=>p.id===home.id);
 for(const page of site.pages)if(page.id!==home.id&&JSON.stringify(page)!==JSON.stringify(before.pages.find(p=>p.id===page.id)))throw Error('Unrelated page changed');
 for(const key of ['body','title','description','slug','publishAt'])if(JSON.stringify(oldHome[key])!==JSON.stringify(home[key]))throw Error('Home copy changed');
 for(const old of oldHome.media){const current=home.media.find(m=>m.id===old.id);for(const key of ['id','src','alt','width','height','credit','rights','familyId'])if(current?.[key]!==old[key])throw Error('Existing home media changed');}
 await model.recordEditorialReview(site.id,home.id,{reviewer:'Codex/owner-authorized-local-software-background-20261030',revisionHash:model.revisionHash(home),evidence:{
 usefulness:'Owner supplied screenshot identifies missing two-employee software-section background. Restore existing appearance, no new offer or prose.',
 facts:'Media-only home revision. Original body, title, description, slug and publish date unchanged. All25 other native page records unchanged in preparation.',
 sources:'Original owner website /wp-content/uploads/2023/11/pexels-mikhail-nilov-7988079.jpg, original-software.json and source-receipt.json. Owner screenshot preserved.',
 media:'Original1920x1282 JPEG visually matches screenshot, SHA checked. Imported via saveResponsiveAsset shared responsive WebP pipeline; all old media retained and original kept private.',
 links:'Same26 page URLs and contact targets. Original image alias added to canonical shared media routing, bound only to approved home media family.',
 presentation:'Actual native draft software section inspected at desktop/tablet/mobile with photo behind unchanged panels, loaded background after scrolling. New factual Lithuanian asset description reviewed; no public copy rewritten. Draft verification pins current revision/layout.'}});
 const approval=await model.approveReviewedBatch(site.id,[home.id],'Codex/owner-authorized-local-software-background'),release=await model.releaseContent(site.id),receipt={approval,release,productionChanged:false,createdAt:new Date().toISOString()};await fs.writeFile(path.join(out,'release.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));return;
 }
 throw Error('Unknown mode');
})();
