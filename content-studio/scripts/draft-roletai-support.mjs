import {getSite,listJobs} from '../src/model.mjs';
import {enqueue} from '../src/generator.mjs';
import {readFile,writeFile} from 'node:fs/promises';
const site=await getSite('roletaiklaipedoje'),url=new URL('../../sites/roletaiklaipedoje/WRITER_RUNS.json',import.meta.url),jobs=JSON.parse(await readFile(url,'utf8'));
for(const p of site.pages.filter(p=>p.type!=='guide'&&!p.body.length)){
 const j=await enqueue('draft',site.id,p.id);let done;
 while(!done){await new Promise(r=>setTimeout(r,1000));const x=(await listJobs()).find(x=>x.id===j.id);if(['complete','failed'].includes(x.status))done=x;}
 jobs.push(done);await writeFile(url,JSON.stringify(jobs,null,2));console.log(JSON.stringify({slug:p.slug,status:done.status,detail:done.detail,error:done.error}));if(done.status==='failed')throw Error('Exact writer failed; no fallback.');
}
