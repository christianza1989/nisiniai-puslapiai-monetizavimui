import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url),selection=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const candidates=JSON.parse(await fs.readFile(new URL('SOURCE-CANDIDATES.json',here),'utf8'));
const reviewed=JSON.parse(await fs.readFile(new URL('SOURCE-NOTES.json',here),'utf8'));
const needed=candidates.filter(c=>!reviewed.some(r=>r.id===c.id&&r.url===c.url));
const dir=selection.privateStudio+'/sources-next60';await fs.mkdir(dir,{recursive:true});
let records=[];try{records=JSON.parse(await fs.readFile(dir+'/FETCH.json','utf8'));}catch{}
for(let start=0;start<needed.length;start+=5){
 const results=await Promise.allSettled(needed.slice(start,start+5).map(async s=>{
  const old=records.find(r=>r.id===s.id);if(old?.status===200)return old;
  const response=await fetch(s.url,{signal:AbortSignal.timeout(45000)}),bytes=Buffer.from(await response.arrayBuffer());
  const ext=response.headers.get('content-type')?.includes('pdf')?'pdf':'html',file=dir+'/'+s.id+'.'+ext;
  await fs.writeFile(file,bytes);
  return {...s,status:response.status,finalUrl:response.url,mime:response.headers.get('content-type'),retrievedAt:new Date().toISOString(),file,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,review:'NOT_YET_READ'};
 }));
 for(let n=0;n<results.length;n++){const r=results[n],s=needed[start+n];const record=r.status==='fulfilled'?r.value:{...s,error:r.reason?.message,review:'RETRIEVAL_FAILED'};records=records.filter(r=>r.id!==s.id);records.push(record);console.log(JSON.stringify({id:record.id,status:record.status,error:record.error,bytes:record.bytes}));}
 await fs.writeFile(dir+'/FETCH.json',JSON.stringify(records,null,2)+'\n');
}
console.log(JSON.stringify({retrieved:records.length,ok:records.filter(r=>r.status===200).length,alreadyReviewed:reviewed.length}));
