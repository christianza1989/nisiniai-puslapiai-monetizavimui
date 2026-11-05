import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../content/seed.json';
import manifest from '../content/prepared-3d-catalog.json';
import {preparedCatalog} from '../src/lib/prepared-3d-catalog';
import {productModels} from '../src/lib/product-models';
import type {Seed} from '../src/lib/types';
test('isolated prepared catalog preserves originals and the complete review view',()=>{
 const source=seed as Seed,original=JSON.stringify(source),prior=process.env.PREPARED_3D_CATALOG_ONLY;
 try{
  delete process.env.PREPARED_3D_CATALOG_ONLY;assert.equal(preparedCatalog(source),source);
  process.env.PREPARED_3D_CATALOG_ONLY='true';const projected=preparedCatalog(source),models=productModels(projected.products),all=preparedCatalog(source,true);
  assert.deepEqual(new Set(models.flatMap(p=>p.configurations.filter(c=>c.id===p.modelConfigurationId).map(c=>c.code))),new Set(manifest.codes));
  assert.equal(models.length,346);assert.equal(productModels(all.products).length,797);
  assert.ok(projected.products.every(p=>['kedes','rasomieji-stalai-ir-darbo-vietos'].includes(p.categorySlug)));
  assert.ok(all.products.every(p=>p.reviewCatalogPrefix==='/su-pasleptais-produktais'));
  assert.equal(JSON.stringify(source),original);
 }finally{if(prior===undefined)delete process.env.PREPARED_3D_CATALOG_ONLY;else process.env.PREPARED_3D_CATALOG_ONLY=prior;}
});
