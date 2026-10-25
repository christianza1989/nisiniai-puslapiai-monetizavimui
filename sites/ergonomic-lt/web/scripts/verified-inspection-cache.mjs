import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

/** Reuse mathematical inspection only for proven byte-identical complete files.
 * Every caller's entire buffer is hashed before any cache lookup. Changed or
 * truncated files cannot borrow an earlier inspection, even with a claimed SHA.
 */
export function verifiedInspectionCache(inspect){
 const cache=new Map(),stats={filesHashed:0,distinctInspections:0,identicalByteReuses:0};
 return {stats,async inspect(bytes,expected){
  const actual=createHash('sha256').update(bytes).digest('hex');stats.filesHashed++;
  assert.equal(actual,expected,'Complete geometry bytes differ from source proof');
  if(cache.has(actual)){stats.identicalByteReuses++;return structuredClone(cache.get(actual));}
  const result=await inspect(bytes);stats.distinctInspections++;
  cache.set(actual,structuredClone(result));return result;
 }};
}
