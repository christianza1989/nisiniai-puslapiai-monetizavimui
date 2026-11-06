import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSourceBatches} from '../src/lib/bounded-source-preparation';
test('independent component reads obey concurrency/byte budgets and large or unknown inputs run alone',async()=>{
 const items=[{bytes:3*1024*1024},{bytes:3*1024*1024},{bytes:3*1024*1024},{},{bytes:20*1024*1024}],seen:number[]=[];let active=0,peak=0;
 await prepareSourceBatches(items,async item=>{active++;peak=Math.max(peak,active);if(!item.bytes||item.bytes>8*1024*1024)assert.equal(active,1);seen.push(items.indexOf(item));await new Promise(r=>setTimeout(r,2));active--;});
 assert.equal(peak,2);assert.deepEqual(seen,[0,1,2,3,4]);assert.equal(active,0);
});
test('a failed batch settles its in-flight reads and starts no subsequent batch',async()=>{
 let finished=false,later=false;
 await assert.rejects(prepareSourceBatches([{bytes:4e6,id:0},{bytes:4e6,id:1},{bytes:4e6,id:2}],async item=>{if(!item.id)throw Error('identity failure');if(item.id===2)later=true;await new Promise(r=>setTimeout(r,2));finished=true;}),/identity failure/);
 assert(finished);assert.equal(later,false);
});
