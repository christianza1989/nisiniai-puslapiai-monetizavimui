import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {openStore} from '../backend/store.mjs';
import {initializeFixtureRuntime} from '../backend/fixture-runtime.mjs';
import {initializeTrialReviews} from '../trial-20261010/trial-reviews.mjs';
test('Trial augmentation preserves all prior rows, valid completed visit links and 11–21 approved reviews; restart is idempotent',async()=>{
 const filename=path.join(await mkdtemp(path.join(os.tmpdir(),'madbeauty-review-test-')),'platform-preview.sqlite'),options={filename,fixturePreview:true,clock:()=>Date.parse('2026-10-11T12:00:00Z')};
 let store=openStore(options);initializeFixtureRuntime(store);const before=store.read(),accounts=store.db.prepare('SELECT * FROM accounts ORDER BY id').all(),outbox=store.db.prepare('SELECT * FROM mail_outbox').all();
 const result=initializeTrialReviews(store);assert.ok(result.created&&result.added>0);const after=store.read();
 for(const [table,rows] of Object.entries(before))if(Array.isArray(rows))for(const row of rows)assert.deepEqual(after[table].find(r=>r.id===row.id),row,'Existing '+table+' record');
 for(const o of after.organizations){const reviews=after.reviews.filter(r=>r.organizationId===o.id&&r.approved);assert.ok(reviews.length>=11&&reviews.length<=21,o.id);}
 const generated=after.reviews.filter(r=>r.id.startsWith('demo-trial-review-'));assert.equal(generated.length,result.added);
 for(const r of generated){const b=after.bookings.find(b=>b.id===r.bookingId);assert.ok(r.isDemo&&r.text.startsWith('Bandomasis atsiliepimas · '));assert.equal(b.status,'completed');assert.equal(b.organizationId,r.organizationId);assert.equal(b.clientId,r.clientId);assert.ok(Date.parse(b.endAt)<store.clock());}
 assert.deepEqual(store.db.prepare('SELECT * FROM accounts ORDER BY id').all(),accounts);assert.deepEqual(store.db.prepare('SELECT * FROM mail_outbox').all(),outbox);
 store.close();store=openStore(options);assert.deepEqual(initializeTrialReviews(store),{created:false});assert.deepEqual(store.read(),after);store.close();
});
test('Synthetic reviews refuse real storage before reading or writing data',()=>{
 assert.throws(()=>initializeTrialReviews({fixturePreview:false}),/isolated fixture/);
});
