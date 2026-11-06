import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {catalogAsync,catalogProductAsync} from '../src/lib/catalog';
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
