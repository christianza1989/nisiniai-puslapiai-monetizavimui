import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seglaRouteRecords} from '../scripts/segla-route-records';

const rows=[...Array.from({length:44},(_,i)=>({values:{CPRICEGROUP:'_1',CUPHGROUP:'CSE',CUPHCOLOR:'CSE'+i}})),...Array.from({length:7},(_,i)=>({values:{CPRICEGROUP:'_1',CUPHGROUP:'EF',CUPHCOLOR:'EF'+i}})),{values:{CPRICEGROUP:'_2',CUPHGROUP:'EF',CUPHCOLOR:'foreign'}}];
test('an EF route consumes only its seven exact records from a combined CSE44/EF7 package',()=>{
 const route={routingFixedFinishPrefix:{CPRICEGROUP:'_1',CUPHGROUP:'EF'}};
 assert.deepEqual(seglaRouteRecords(rows,'_1',route,'EF'),rows.slice(44,51));
 assert.throws(()=>seglaRouteRecords(rows,'_1',route,'CSE'));
 assert.throws(()=>seglaRouteRecords(rows,'_2',route,'EF'));
});
test('a route without a narrowed prefix preserves the previous price-based package scope',()=>{
 assert.deepEqual(seglaRouteRecords(rows,'_1'),rows.slice(0,51));
});
