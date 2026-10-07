import {getSite,listJobs} from '../src/model.mjs';
import {enqueue} from '../src/generator.mjs';
import {readFile,writeFile} from 'node:fs/promises';
const site=await getSite('roletaiklaipedoje');
const receiptUrl=new URL('../../sites/roletaiklaipedoje/WRITER_RUNS.json',import.meta.url);
let jobs=[];try{jobs=JSON.parse(await readFile(receiptUrl,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
for(const page of site.pages.slice(0,4)){
 if(page.body.length){console.log('Existing draft preserved: '+page.slug);continue;}
 const job=await enqueue('draft',site.id,page.id);
 let complete;
 while(!complete){await new Promise(r=>setTimeout(r,1000));const current=(await listJobs()).find(j=>j.id===job.id);if(['complete','failed'].includes(current.status))complete=current;}
 jobs.push(complete);await writeFile(receiptUrl,JSON.stringify(jobs,null,2));
 console.log(JSON.stringify({slug:page.slug,status:complete.status,error:complete.error,detail:complete.detail}));
 if(complete.status==='failed')throw new Error('Exact requested writer failed; no model fallback.');
}
