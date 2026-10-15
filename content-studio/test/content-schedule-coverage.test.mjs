import test from 'node:test';
import assert from 'node:assert/strict';
import {contentPolicy, planningWindow, scheduledPlan} from '../src/content-schedule.mjs';
const now = Date.parse('2026-10-06T12:00Z');
test('default coverage has no fabricated quota; prepared clusters share dates across batches', () => {
  assert.equal(contentPolicy().cadence, 'coverage');
  assert.equal(planningWindow(contentPolicy(),now).target, null);
  assert.throws(()=>contentPolicy({coverageTarget:0}));
  const policy=contentPolicy({coverageTarget:83,preparationDays:7});
  const approved=[{type:'guide',status:'approved',publishAt:'2026-10-05T07:00:00.000Z'}];
  const snapshot=structuredClone(approved), planned=[];
  for(let i=0;i<82;i+=24) planned.push(...scheduledPlan(Array.from({length:Math.min(24,82-i)},()=>({type:'guide',publishDate:'2026-10-13'})),[...approved,...planned],policy,now));
  assert.equal(planned.length,82);
  assert.equal(new Set(planned.map(p=>p.publishAt)).size,1);
  assert.equal(planned[0].publishAt,'2026-10-13T07:00:00.000Z');
  assert.deepEqual(approved,snapshot);
});
test('coverage never backdates and preserves genuine later dates rather than swallowing invalid dates',()=>{
  const policy=contentPolicy({coverageTarget:3});
  const scheduled=scheduledPlan([{type:'guide'},{type:'guide',publishDate:'2026-11-24'},{type:'home'}],[],policy,now);
  assert.equal(scheduled[0].publishAt,'2026-10-07T07:00:00.000Z');
  assert.equal(scheduled[1].publishAt,'2026-11-24T08:00:00.000Z');
  assert.equal(scheduled[2].publishAt,new Date(now).toISOString());
  assert.throws(()=>scheduledPlan([{type:'guide',publishDate:'2026-02-30'}],[],policy,now));
  assert.throws(()=>scheduledPlan([{type:'guide',publishDate:'2027-04-07'}],[],policy,now),/horizonto/);
});
test('explicit legacy cadence above previous hard caps can schedule multiple articles per day',()=>{
  const policy=contentPolicy({cadence:'weekly',articlesPerWeek:20,months:1});
  const result=scheduledPlan(Array.from({length:20},()=>({type:'guide'})),[],policy,now);
  assert.equal(result.length,20);
  assert.ok(new Set(result.map(p=>p.publishAt)).size<20);
  assert.equal(contentPolicy({cadence:'monthly',articlesPerMonth:50}).articlesPerMonth,50);
});
test('coverage orders explicit and inferred cluster dependencies without touching existing pages',()=>{
  const policy=contentPolicy({coverageTarget:3});
  const result=scheduledPlan([{type:'guide',slug:'child',pillarSlug:'root',publishDate:'2026-10-13'},{type:'guide',slug:'root',publishDate:'2026-10-27'}],[],policy,now);
  assert.equal(result[0].publishAt,result[1].publishAt);
  assert.throws(()=>scheduledPlan([{type:'guide',slug:'a',pillarSlug:'b'},{type:'guide',slug:'b',pillarSlug:'a'}],[],policy,now),/ciklinė/);
});
