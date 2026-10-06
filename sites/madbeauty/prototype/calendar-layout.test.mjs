import test from 'node:test';
import assert from 'node:assert/strict';
import {positionCalendarRecords} from './public/calendar-layout.mjs';
test('three simultaneous short visits get distinct lanes; later and adjacent visits regain full width',()=>{
 const result=positionCalendarRecords([{id:'A',from:540,to:555},{id:'B',from:540,to:555},{id:'C',from:540,to:555},{id:'next',from:555,to:570},{id:'later',from:600,to:660}]);
 assert.equal(result.maxLanes,3);
 assert.deepEqual(result.items.slice(0,3).map(r=>r.lane),[0,1,2]);
 assert.deepEqual(result.items.map(r=>r.lanes),[3,3,3,1,1]);
});
test('a long visit connects staggered overlaps without assigning a colliding lane',()=>{
 const records=[{id:'long',from:540,to:600},{id:'short1',from:555,to:570},{id:'short2',from:570,to:585},{id:'third',from:575,to:590}];
 const {items,maxLanes}=positionCalendarRecords(records);
 assert.equal(maxLanes,3);
 for(const a of items)for(const b of items)if(a.id!==b.id&&a.from<b.to&&b.from<a.to)assert.notEqual(a.lane,b.lane);
 assert.ok(items.every(r=>r.lanes===3));
});
test('busy blocks participate in overlap placement and do not narrow the rest of the day',()=>{
 const {items}=positionCalendarRecords([{id:'visit',from:540,to:570},{id:'block',block:true,from:555,to:600},{id:'later',from:600,to:630}]);
 assert.equal(items[0].lanes,2);assert.equal(items[1].lanes,2);assert.equal(items[2].lanes,1);
});
test('empty and unordered days retain deterministic time order',()=>{
 assert.deepEqual(positionCalendarRecords([]),{items:[],maxLanes:1});
 assert.deepEqual(positionCalendarRecords([{id:'B',from:600,to:615},{id:'A',from:540,to:555}]).items.map(r=>r.id),['A','B']);
});
