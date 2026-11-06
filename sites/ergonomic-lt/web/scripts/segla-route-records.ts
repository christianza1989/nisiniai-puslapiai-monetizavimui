import assert from 'node:assert/strict';

export function seglaRouteRecords<T extends {values:Record<string,string>}>(records:T[],price:string,route?:{routingFixedFinishPrefix?:Record<string,string>},requestedGroup?:string):T[]{
 const prefix=route?.routingFixedFinishPrefix;
 if(prefix){
  assert.deepEqual(Object.keys(prefix).sort(),['CPRICEGROUP','CUPHGROUP']);
  assert(prefix.CPRICEGROUP===price&&prefix.CUPHGROUP===requestedGroup,'Requested finish escaped the exact route prefix');
 }
 return records.filter(record=>record.values.CPRICEGROUP===price&&(!prefix||Object.entries(prefix).every(([field,value])=>record.values[field]===value)));
}
