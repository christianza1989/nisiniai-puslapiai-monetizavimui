// Historical original examples remain intentionally covered after public card consolidation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {baseSeed} from '../src/lib/catalog';
import {attributedProduct} from '../src/lib/photo-attribution';
import {modelProduct,allProductModels as productModels} from '../src/lib/product-models';
import {productPhotograph} from '../src/lib/product-photographs';
import {galleryPhotoIdentity} from '../src/lib/gallery-photo-identity';
const seed=baseSeed(),family=seed.products.find(p=>p.slug==='xilium-darbo-kedes')!;
test('Duo-Back keeps its eight API angles and never inherits MESH, UPH or gaming examples',()=>{
 const p=attributedProduct(family),models=productModels([p]);
 for(const model of models){const own=p.configurations.find(c=>c.id===model.modelConfigurationId)!;assert.equal(model.gallery.length,8);
  const identities=new Set(model.gallery.map(galleryPhotoIdentity));for(const other of p.configurations.filter(c=>c.id!==own.id))assert(!identities.has(galleryPhotoIdentity(other.image!)),model.modelConfigurationId+' vs '+other.id);
 }
 assert(models.find(p=>p.modelConfigurationId==='23636153')!.gallery.some(src=>src.includes('402e71a7a4c0d62692aa')));
});
test('Imported and edited galleries cannot override proven photo ownership; source data is not mutated',()=>{
 const foreign=family.configurations[5].image!,c=family.configurations[0],before=JSON.stringify(family);
 const contaminated={...family,image:foreign,gallery:[foreign],configurations:family.configurations.map((x,n)=>n===0?{...x,image:foreign,gallery:[foreign],galleryOwner:family.id+':'+c.id}:x)};
 const fixed=attributedProduct(contaminated),duo=modelProduct(fixed,fixed.configurations[0]);
 assert.equal(duo.image,productPhotograph(c.image));assert(!duo.gallery.some(src=>src.includes('402e71a7a4c0d62692aa')));assert.equal(JSON.stringify(family),before);
});
test('Unknown IDs and changed supplier options cannot borrow a sibling or family image',()=>{
 for(const config of [{...family.configurations[0],id:'unknown'},{...family.configurations[0],code:'WRONG'},{...family.configurations[0],supplierOptions:['fake=value']}]){
  const p=attributedProduct({...family,configurations:[config]}),m=modelProduct(p,p.configurations[0]);assert.equal(m.image,null);assert.deepEqual(m.gallery,[]);
 }
});
test('All 1111 models have confirmed photos; standalone sofa and pouffe pages exclude other furniture types',()=>{
 const parents=seed.products.map(attributedProduct),models=productModels(parents);assert.equal(models.length,1111);assert(models.every(p=>p.image&&p.gallery.length));
 const sofa=parents.find(p=>p.id==='product_ozone-sofas_0e5fc7c6')!,old=seed.products.find(p=>p.id===sofa.id)!;
 assert.notEqual(sofa.image,productPhotograph(old.image));assert.equal(sofa.gallery.length,5);
 assert.equal(parents.find(p=>p.id==='product_oxo-pouffes_d48df641')!.gallery.length,1);
});
test('Mixed supplier API finishes stay in family context; the U773 Cadeira example keeps only white laminate',()=>{
 const p=attributedProduct(seed.products.find(p=>p.id==='product_cadeira-meeting-chairs_4071871a')!),model=productModels([p]).find(p=>p.modelConfigurationId==='16088242')!;
 assert.equal(model.gallery.length,8);assert(!model.gallery.some(src=>src.includes('wood-1-007')));assert(p.gallery.some(src=>src.includes('wood-1-007')));
});
test('Mixed Dallas frame finishes, Offa cabinet shapes and Play&Work screens never enter the specific example',()=>{
 for(const [id,pattern,count] of [['20949684',/01-dallas-table-55x55-bl-szph000/,7],['20949686',/02-dallas-table-55x55-nk-szmh000/,7],['23766670',/02-offa-sideboard-triple-box-wd000/,8],['24031746',/pw-2-0-desk-t-leg-m-pnm000/,8]] as const){
  const p=attributedProduct(seed.products.find(p=>p.configurations.some(c=>c.id===id))!),m=productModels([p]).find(m=>m.modelConfigurationId===id)!;
  assert.equal(m.gallery.length,count);const c=p.configurations.find(c=>c.id===id)!;assert(c.gallery!.length===count);assert(p.gallery.length>count); // Other legitimate family examples are retained.
  const evidence=JSON.parse(fs.readFileSync('content/photo-attribution-evidence.json','utf8')).records[p.id].configurations[id];assert(evidence.gallery.every((src:string)=>pattern.test(src)));
 }
});
