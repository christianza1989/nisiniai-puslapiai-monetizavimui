/** Independent immutable components may be prepared together; bound both raw
 * bytes and concurrent reads. Unknown/large inputs retain the serial path. */
export async function prepareSourceBatches<T extends {bytes?:number}>(items:T[],prepare:(item:T)=>Promise<unknown>){
 const limit=8*1024*1024;let batch:T[]=[],bytes=0;
 async function flush(){const results=await Promise.allSettled(batch.map(prepare));batch=[];bytes=0;const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw failed.reason;}
 for(const item of items){const size=Number.isSafeInteger(item.bytes)&&item.bytes!>0?item.bytes!:limit;if(batch.length&&(batch.length>=4||bytes+size>limit))await flush();batch.push(item);bytes+=size;}
 if(batch.length)await flush();
}
