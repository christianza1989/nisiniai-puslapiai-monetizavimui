import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {baseSeed,catalogAsync,catalogProductAsync} from '../src/lib/catalog';
import {getDb,saveProductEdit} from '../src/lib/db';
process.env.RUNTIME_DIR=mkdtempSync('D:/Core/output/ergonomic-choice-performance-20261106/catalog-fixture-');
process.env.PUBLIC_CUSTOMER_BOUNDARY='true';process.env.TEXT_REVIEW_PROPOSALS='true';process.env.PUBLIC_CONFIGURATION_SECRET='isolated-catalog-performance-test-fixture-only';
getDb().exec(readFileSync(new URL('../migrations/0002_text_review.sql',import.meta.url),'utf8'));

test('targeted signed-product lookup equals the complete current visitor catalogue projection',async()=>{
 const complete=await catalogAsync();
 const selected=['K2ME004WW001','KEM2013WW004','KMOT'].map(code=>complete.products.find(p=>p.configurations.some(c=>c.code?.startsWith(code)))).filter(Boolean);
 assert(selected.length>=2);
 for(const parent of selected)assert.deepEqual(await catalogProductAsync(parent!.id),parent);
 assert.equal(await catalogProductAsync('missing-fixture-product'),undefined);
 const parent=selected[0]!;saveProductEdit(parent.id,{translationReviewed:false});const fresh=await catalogAsync();assert.deepEqual(await catalogProductAsync(parent.id),fresh.products.find(p=>p.id===parent.id));
});

test('SQL projection preserves imported products, edits and envelope without transferring unrelated products',async()=>{
 const seed=baseSeed(),p=seed.products.find(p=>p.configurations.some(c=>c.code==='KEM2013WW004'))!;
 const imported={...seed,products:[{...p,name:p.name+' fixture'},...seed.products.filter(x=>x.id!==p.id).slice(0,3)]};
 getDb().prepare('INSERT OR REPLACE INTO supplier_import(id,data,updated_at) VALUES(1,?,?)').run(JSON.stringify(imported),new Date().toISOString());
 const full=await catalogAsync();assert.deepEqual(await catalogProductAsync(p.id),full.products.find(x=>x.id===p.id));
 assert.equal(await catalogProductAsync('not-in-import'),undefined);
 const row=getDb().prepare(`SELECT json_set(data,'$.products',json((SELECT json_group_array(json(value)) FROM json_each(data,'$.products') WHERE json_extract(value,'$.id')=?))) AS data FROM supplier_import WHERE id=1`).get(p.id) as {data:string};
 const projected=JSON.parse(row.data);assert.deepEqual(projected,{...imported,products:[imported.products[0]]});
});
