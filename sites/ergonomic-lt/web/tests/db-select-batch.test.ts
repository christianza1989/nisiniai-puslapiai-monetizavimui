import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {getDb,dbSelectBatch} from '../src/lib/db';
process.env.RUNTIME_DIR=mkdtempSync('D:/Core/output/ergonomic-choice-performance-20261106/read-batch-fixture-');
test('bounded read batch returns all parameter-bound result sets and cannot mutate data',async()=>{
 getDb().exec('CREATE TABLE fixture(k TEXT PRIMARY KEY,v TEXT);INSERT INTO fixture VALUES (\'a\',\'one\'),(\'b\',\'two\')');
 const rows=await dbSelectBatch<{v:string}>(['a','b'].map(k=>({sql:'SELECT v FROM fixture WHERE k=?',params:[k]})));assert.deepEqual(rows.map(r=>r.map(x=>x.v)),[['one'],['two']]);
 await assert.rejects(dbSelectBatch([{sql:'DELETE FROM fixture'}]));await assert.rejects(dbSelectBatch(Array.from({length:33},()=>({sql:'SELECT v FROM fixture'}))));assert.equal(getDb().prepare('SELECT count(*) AS n FROM fixture').get()?.n,2);
});
