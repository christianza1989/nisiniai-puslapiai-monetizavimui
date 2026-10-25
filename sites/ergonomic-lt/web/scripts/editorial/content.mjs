import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {parseHTML} from 'linkedom';
import {hash,validatePackage,compilePackage,numberTokens} from './contract.mjs';
import {baseSeed,productPath} from '../../src/lib/catalog.ts';
import {publicProductCopy} from '../../src/lib/public-product-copy.ts';
import {localizeConfiguration} from '../../src/lib/configuration-labels.ts';
import {categoryLabel} from '../../src/lib/category-labels.ts';
import {legacyArticle} from '../../src/lib/legacy-article.ts';
import {htmlTemplate} from '../../src/lib/editorial-server.ts';
import {verifySourceState,sealSourceState} from './source-state.mjs';

const folder=path.resolve('content/editorial'),baselineFile=path.join(folder,'baseline-package.json'),activeFile=path.join(folder,'content-package.json');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8')),write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const command=process.argv[2]||'export',input=process.argv[3];
function safeWrite(file,value){const temporary=file+'.tmp';write(temporary,value);fs.renameSync(temporary,file);}
function generate(){
 const seed=baseSeed();let effective=seed,runtime={supplierImport:false,productEdits:0};
 const database=path.resolve(process.env.RUNTIME_DIR||'.runtime','ergonomic.sqlite');
 if(fs.existsSync(database)){
  const db=new DatabaseSync(database,{readOnly:true});
  const imported=db.prepare('SELECT data FROM supplier_import WHERE id=1').get(),edits=db.prepare('SELECT id,data FROM product_edits').all();
  effective=imported?{...seed,...JSON.parse(imported.data)}:seed;
  const byId=new Map(edits.map(e=>[e.id,JSON.parse(e.data)]));effective={...effective,products:effective.products.map(p=>({...p,...byId.get(p.id),id:p.id,slug:p.slug,categorySlug:p.categorySlug}))};
  runtime={supplierImport:!!imported,productEdits:edits.length};db.close();
 }
 const fields=read(path.join(folder,'ui-registry.json')).map(f=>({...f,role:f.role||'interface'}));
 const add=(id,original,binding,extra={})=>{if(typeof original==='string'&&original.trim())fields.push({id,role:binding.kind,original,value:original,binding,maxLength:Math.max(original.length*3,500),...extra});};
 const protectedTerms=text=>['info@ergonomic.lt','ergonomic@azprekyba.lt','+37069199833','UAB A-Z Prekyba','Buivydiškių g. 22'].filter(term=>text.includes(term));
 function htmlFields(scope,html){
  const {document}=parseHTML('<html><body>'+html+'</body></html>'),selector='h1,h2,h3,h4,h5,h6,p,li,summary,figcaption,a,button,label';
  Array.from(document.body.querySelectorAll(selector)).forEach((el,index)=>{
   if(el.parentElement?.closest(selector))return;
   const template=htmlTemplate(el);if(!template.text.replace(/\[\[\w+\]\]/g,'').trim())return;
   const binding={kind:'html',scope,selector,index,tokens:template.tokens};
   const common=Object.keys(template.tokens).length?null:fields.find(f=>['ui','value'].includes(f.binding.kind)&&f.original===template.text);
   if(common){common.htmlBindings??=[];common.htmlBindings.push(binding);}
   else add('html.'+hash(scope+':'+index).slice(0,20),template.text,binding,{context:el.id||el.tagName,protectedTerms:[...protectedTerms(template.text),...(el.closest('.hp-popular-model')&&/^H\d$/.test(el.tagName)?[template.text]:[])]});
  });
  for(const attribute of ['alt','aria-label','title','placeholder']){
   const selector='['+attribute+']';Array.from(document.body.querySelectorAll(selector)).forEach((el,index)=>{const value=el.getAttribute(attribute);if(value?.trim()){
    const binding={kind:'html',scope,selector,index,attribute};const common=fields.find(f=>['ui','value'].includes(f.binding.kind)&&f.original===value);
    if(common){common.htmlBindings??=[];common.htmlBindings.push(binding);}else add('html.'+hash(scope+':'+attribute+':'+index).slice(0,20),value,binding,{protectedTerms:protectedTerms(value)});
   }});
  }
 }
 const legacy=[...seed.legacy,...read('content/legacy-additions.json')];
 for(const page of legacy){
  for(const name of ['h1','title','description'])add('page.'+hash(page.path+':'+name).slice(0,20),page[name],{kind:'page',path:page.path,field:name},{maxLength:name==='description'?500:200,context:page.path});
  if(page.path!=='/')htmlFields('legacy:'+page.path,legacyArticle(page).html);
 }
 const source=fs.readFileSync('src/lib/approved-home-markup.ts','utf8');
 for(const [name,scope] of [['approvedHeroMarkup','home-hero'],['approvedSectionsMarkup','home-sections']]){const literal=source.match(new RegExp('export const '+name+' = (.*);'));assert(literal);htmlFields(scope,JSON.parse(literal[1]));}
 const references=[];
 for(const product of effective.products){
  const publicCopy=publicProductCopy(product);
  const source=product.sourceDescription?.trim();
  add('product.'+product.id+'.description',publicCopy.description,{kind:'product',productId:product.id},{context:productPath(product),preserveNumbers:true,protectedTerms:[],...(source?{translationSource:source,sourceNumberTokens:[...new Set(numberTokens(source))],maxLength:Math.max(1500,source.length*4+publicCopy.description.length*2)}:{})});
  for(const feature of publicCopy.features)add('product.'+product.id+'.feature.'+hash(feature).slice(0,12),feature,{kind:'feature',productId:product.id},{preserveNumbers:true});
  publicCopy.configurations.forEach((c,n)=>{
   const localized=localizeConfiguration(c,publicCopy.name,n);
   const source=(c.sourceDescription||c.description)?.trim();
   add('configuration.'+product.id+'.'+c.id,localized.description,{kind:'configuration',productId:product.id,configurationId:c.id},{preserveNumbers:true,protectedTerms:[publicCopy.name],context:productPath(product)+' model '+c.id,...(source?{translationSource:source,sourceNumberTokens:[...new Set(numberTokens(source))],maxLength:Math.max(1000,source.length*4+localized.description.length*2)}:{})});
  });
  references.push({productId:product.id,name:publicCopy.name,path:productPath(product),sourceUrl:product.sourceUrl,sourceDescription:product.sourceDescription,configurationFacts:product.configurations.map(c=>({id:c.id,code:c.code,sourceDescription:c.sourceDescription||c.description,supplierOptions:c.supplierOptions||[]}))});
 }
 for(const category of effective.categories)add('category.'+category.id,categoryLabel(category.id,category.name),{kind:'category',id:category.id});
 const facts={brand:'Ergonomic.lt',company:'UAB A-Z Prekyba',email:'info@ergonomic.lt',secondaryEmail:'ergonomic@azprekyba.lt',phone:'+37069199833',address:'Buivydiškių g. 22, Vilnius, LT-07195',offer:'Baldų prekyba ir kietųjų baldų gamyba pagal užsakymą, įskaitant STEAM stalus ir spintas.',mode:'Katalogas su pasiūlymo užklausomis; kainos tikslinamos individualiai.',supplierPolicy:'Gamintojų vardai ir sourceUrl yra tik vidiniai; viešai jų nerodyti. Modelių vardus, ID, kodus ir tikras taisykles išsaugoti.',unknown:'Nėra patvirtintų kainų, likučių, pristatymo terminų, universalių sertifikatų ar sveikatos pažadų. Užklausos išsaugojimas nereiškia el. laiško pristatymo.',keywords:['ergonominiai baldai','ergonominiai stalai','ergonominės kėdės','biuro kėdės']};
 const protectedCatalog=effective.products.map(p=>({id:p.id,name:p.name,slug:p.slug,categorySlug:p.categorySlug,brand:p.brand,sourceUrl:p.sourceUrl,published:p.published,translationReviewed:p.translationReviewed,configurations:p.configurations.map(c=>({id:c.id,code:c.code,configurator:c.configurator,sourceDescription:c.sourceDescription||c.description,supplierOptions:c.supplierOptions,details:c.details}))}));
 const payload={schemaVersion:1,siteId:'ergonomic-lt',canonicalHost:'ergonomic.lt',locale:'lt-LT',baselineId:hash({fields,protectedCatalog}),protected:{catalogHash:hash(protectedCatalog),seedHash:hash(fs.readFileSync('content/seed.json','utf8')),routes:legacy.map(p=>p.path),sourceGroups:effective.products.length,runtime},fields};
 return {payload,facts,references,protectedCatalog};
}
function validate(file){verifySourceState();const candidate=read(file),baseline=read(baselineFile);const result=validatePackage(candidate,baseline);console.log(JSON.stringify(result));return candidate;}
function compile(candidate,activate=false){
 const output=compilePackage(candidate),targets=['compiled-ui.json','compiled-server.json','active-revision.json'].map(f=>path.join(folder,f));
 const before=[...targets,activeFile,path.resolve('public/media/home-final/demo.js'),path.resolve('public/media/home-final/carousels.js')].map(file=>({file,bytes:fs.existsSync(file)?fs.readFileSync(file):null}));
 try{
  safeWrite(targets[0],output.ui);safeWrite(targets[1],output.server);safeWrite(targets[2],{revision:hash(candidate),baselineId:candidate.baselineId,changed:candidate.fields.filter(f=>f.value!==f.original).map(f=>f.id)});
  const built=spawnSync(process.execPath,['scripts/home-final-demo/build.mjs'],{stdio:'pipe'});if(built.status!==0)throw Error('Homepage copy build failed: '+built.stderr);
  if(activate)safeWrite(activeFile,candidate);
 }catch(error){for(const prior of before)if(prior.bytes)fs.writeFileSync(prior.file,prior.bytes);throw error;}
}
if(command==='initialize'){
 assert(!fs.existsSync(path.join(folder,'handoff-receipt.json')),'Cannot initialize after handoff');
 if(fs.existsSync(activeFile))assert(read(activeFile).fields.every(f=>f.value===f.original),'Cannot replace an edited baseline');
 const {payload,facts,references,protectedCatalog}=generate();write(baselineFile,payload);write(activeFile,payload);write(path.join(folder,'facts.json'),facts);write(path.join(folder,'source-references.json'),references);write(path.join(folder,'protected-catalog.json'),protectedCatalog);compile(payload);console.log('Initialized '+payload.fields.length+' fields.');
}else if(command==='export'){
 if(fs.existsSync(baselineFile)){validate(activeFile);if(input){fs.mkdirSync(input,{recursive:true});write(path.join(input,'content-package.json'),read(activeFile));for(const name of ['facts.json','source-references.json','editing-instructions.txt'])fs.copyFileSync(path.join(folder,name),path.join(input,name));}console.log('Existing baseline preserved; active package exported.');}
 else{const {payload,facts,references,protectedCatalog}=generate();write(baselineFile,payload);write(activeFile,payload);write(path.join(folder,'facts.json'),facts);write(path.join(folder,'source-references.json'),references);write(path.join(folder,'protected-catalog.json'),protectedCatalog);compile(payload);console.log(JSON.stringify({fields:payload.fields.length,baselineId:payload.baselineId,sourceGroups:payload.protected.sourceGroups}));}
}else if(command==='validate')validate(input||activeFile);
else if(command==='compile'){const candidate=validate(input||activeFile);compile(candidate);}
else if(command==='diff'){const candidate=validate(input||activeFile);const changes=candidate.fields.filter(f=>f.value!==f.original).map(f=>({id:f.id,context:f.context,from:f.original,to:f.value}));const report={changed:changes.length,changes};if(process.argv[4])write(process.argv[4],report);else console.log(JSON.stringify(report,null,2));}
else if(command==='import'){
 assert(input,'Returned package path required');const candidate=validate(input),target=path.join(folder,'revisions');fs.mkdirSync(target,{recursive:true});
 const previous=read(activeFile),revision=hash(previous);write(path.join(target,revision+'.json'),previous);compile(candidate,true);console.log('Imported revision '+hash(candidate)+'; rollback '+revision);
}else if(command==='restore'){
 assert(input&&/^[a-f0-9]{64}$/.test(input),'Exact revision hash required');const candidate=validate(path.join(folder,'revisions',input+'.json'));
 const previous=read(activeFile);write(path.join(folder,'revisions',hash(previous)+'.json'),previous);compile(candidate,true);console.log('Restored '+input);
}else if(command==='seal'){validate(activeFile);sealSourceState();console.log('Editorial source state sealed.');
}else if(command==='inventory'){const candidate=read(activeFile);const counts={};for(const f of candidate.fields)counts[f.binding.kind]=(counts[f.binding.kind]||0)+1;console.log(JSON.stringify({fields:candidate.fields.length,counts},null,2));}
else throw Error('Unknown command '+command);
