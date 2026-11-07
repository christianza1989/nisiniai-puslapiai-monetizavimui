/** Finest proven Cartesian factors of a finite captured relation. No inferred rows. */
export function independentFieldGroups(values:Record<string,string>[],fields:string[]):string[][]{
 const key=(row:Record<string,string>,keys:string[])=>JSON.stringify(keys.map(k=>row[k]??null));
 function split(group:string[]):string[][]{
  if(group.length<2||group.length>12)return [group];
  const total=new Set(values.map(v=>key(v,group))).size;
  // Pin the first field on the left to avoid checking symmetric partitions.
  for(let mask=0;mask<(1<<(group.length-1))-1;mask++){
   const left=group.filter((_,i)=>i===0||!!(mask&(1<<(i-1)))),right=group.filter(f=>!left.includes(f));
   if(new Set(values.map(v=>key(v,left))).size*new Set(values.map(v=>key(v,right))).size===total)return [...split(left),...split(right)];
  }
  return [group];
 }
 return split(fields);
}
