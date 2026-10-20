// Historical original examples remain intentionally covered after public card consolidation.
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {baseSeed,catalog,productPath} from '../src/lib/catalog';
import {allProductModels as productModels,resolveProduct,selectedModelConfiguration} from '../src/lib/product-models';
import {expandedForProduct,initialStateForProduct,expandedSelection,validateState,stateToken,parseStateToken} from '../src/lib/expanded-configurator';
import {catalogForProduct,catalogInitial} from '../src/lib/catalog-configurator';
import {pilotForProduct} from '../src/lib/configurator';
import {storeQuote} from '../src/lib/quotes';
import {getDb} from '../src/lib/db';
import {galleryPhotoIdentity,uniqueGalleryPhotos} from '../src/lib/gallery-photo-identity';
import {GET} from '../src/app/api/produkto-kortele/route';
const folder=fs.mkdtempSync(path.resolve('../research/model-catalog-tests-'));process.env.RUNTIME_DIR=folder;process.env.PREVIEW_CATALOG='true';
after(()=>{getDb().close();fs.rmSync(folder,{recursive:true,force:true});});
const parents=catalog().products,models=productModels(parents);
const xilium=parents.find(p=>p.id==='product_xilium-swivel-chairs_0fe4091b')!;
test('Every supplier example is individually routable, with its own photograph and exact source code',()=>{
 assert.equal(models.length,1111);assert.equal(new Set(models.map(productPath)).size,1111);
 for(const p of parents){const children=models.filter(m=>m.id===p.id);assert.equal(children.length,p.configurations.length||1);
  for(const model of children){assert(model.name);assert.equal(resolveProduct(parents,model.categorySlug,model.slug)?.modelConfigurationId,model.modelConfigurationId);
   if(model.modelConfigurationId){const c=p.configurations.find(c=>c.id===model.modelConfigurationId)!;assert.equal(model.image,c.image);assert.equal(selectedModelConfiguration(model)?.code,c.code);assert.equal(model.gallery[0],c.image);const identities=new Set(model.gallery.map(galleryPhotoIdentity));assert(c.gallery?.every(photo=>identities.has(galleryPhotoIdentity(photo))));assert.equal(identities.size,model.gallery.length);assert.deepEqual(model.gallery,uniqueGalleryPhotos([c.image,...c.gallery||[]]));}
  }
  assert(resolveProduct(parents,p.categorySlug,p.slug));
 }
 assert.equal(resolveProduct(parents,xilium.categorySlug,xilium.slug+'-modelis-fake'),undefined);
});
test('Xilium has seven separate examples; MESH and UPH never use the Duo-Back configurator',()=>{
 const children=productModels([xilium]);assert.equal(children.length,7);
 for(const p of children){const c=selectedModelConfiguration(p)!;const pilot=pilotForProduct(p);if(pilot)assert(pilot.variants.every(v=>v.id===c.id));
  assert.equal(!!expandedForProduct(p),c.code==='KXIL044WW001');
 }
 assert(children.some(p=>p.name.includes('XiliumG')));
 assert.equal(resolveProduct(parents,xilium.categorySlug,xilium.slug)?.modelConfigurationId,undefined);
});
test('Individual configurators are restricted to the selected article and all initial states remain valid',()=>{
 let count=0;
 for(const p of models){if(!expandedForProduct(p))continue;count++;const s=initialStateForProduct(p),selection=expandedSelection(p,s);
  assert.equal(selection.configuration.code,selectedModelConfiguration(p)?.code);assert.deepEqual(parseStateToken(p,stateToken(s)),s);
  const f=catalogForProduct(p);if(f){assert.equal(f.articles.length,1);const full=catalogForProduct(parents.find(parent=>parent.id===p.id)!)!;
   for(const other of full.articles.filter(a=>a.code!==f.articles[0].code))assert.throws(()=>validateState(p,catalogInitial(full,other.code)));
  }
 }
 assert(count>0);
});
test('Separate supplier examples remain distinct quote items and save exact codes/options',async()=>{
 const children=productModels([xilium]);const saved=await storeQuote({name:'Modelių testas',email:'models@example.invalid',phone:'',company:'',message:'Pasirinkti modeliai',items:children.map(p=>({productId:p.id,configurationId:p.modelConfigurationId,quantity:1,note:''})),consent:true,submissionKey:randomUUID(),website:'',startedAt:Date.now()-5000});
 const row=getDb().prepare('SELECT payload FROM quotes WHERE id=?').get(saved.id) as {payload:string};const items=JSON.parse(row.payload).items;
 assert.equal(items.length,7);assert.equal(new Set(items.map((i:any)=>i.configurationId)).size,7);
 items.forEach((item:any,n:number)=>{assert.equal(item.productName,children[n].name);assert.equal(item.baseArticle,selectedModelConfiguration(children[n])!.code);assert(item.supplierOptions.length>0);});
});
test('Existing saved family specifications and model PDFs still resolve through canonical supplier IDs',async()=>{
 const p=productModels([xilium])[4],s=initialStateForProduct(p);
 assert.doesNotThrow(()=>validateState(xilium,s));const response=await GET(new Request('http://localhost/api/produkto-kortele/?produktas='+p.id+'&konfig='+encodeURIComponent(stateToken(s))));
 assert.equal(response.status,200);assert(Buffer.from(await response.arrayBuffer()).subarray(0,4).equals(Buffer.from('%PDF')));
 assert.equal(baseSeed().products.length,255);
});


test('All confirmed supplier angles survive without inheriting other family variants',()=>{
 for(const p of models){assert(p.gallery.length>=1,p.slug);const c=selectedModelConfiguration(p);if(!c)continue;
  assert.equal(p.modelGalleryCount,uniqueGalleryPhotos([c.image,...c.gallery||[]]).length);
  const identities=new Set(p.gallery.map(galleryPhotoIdentity));assert(c.gallery?.every(src=>identities.has(galleryPhotoIdentity(src))),p.slug);
 }
 const hola=models.find(p=>p.id==='product_hola-meeting-chairs_1e0db3ce')!;assert(hola.gallery.length>=8);
 assert(productModels([xilium]).every(p=>p.modelGalleryCount===8));
});
