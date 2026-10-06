// Lanes belong to a connected overlap group, not to the entire day.
export function positionCalendarRecords(records){
 const sorted=[...records].sort((a,b)=>a.from-b.from||a.to-b.to),groups=[];
 let group=null;
 for(const record of sorted){
  if(!group||record.from>=group.end){group={end:record.to,records:[]};groups.push(group);}
  group.records.push(record);group.end=Math.max(group.end,record.to);
 }
 const items=[];let maxLanes=1;
 for(const group of groups){
  const ends=[],placed=group.records.map(record=>{
   let lane=ends.findIndex(end=>end<=record.from);
   if(lane<0)lane=ends.length;
   ends[lane]=record.to;return {...record,lane};
  });
  const lanes=ends.length;maxLanes=Math.max(maxLanes,lanes);
  items.push(...placed.map(record=>({...record,lanes})));
 }
 return {items,maxLanes};
}
