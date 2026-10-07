import {readFile} from 'node:fs/promises';
import {getSite,listJobs} from '../src/model.mjs';
import {enqueue} from '../src/generator.mjs';
const [siteId,pageId,requestFile]=process.argv.slice(2);
if(!process.env.STUDIO_DATA_DIR||!process.env.STUDIO_OUTPUT_DIR||!siteId||!pageId||!requestFile)throw Error('Usage: explicit private DATA/OUTPUT; revise-page.mjs <site-id> <page-id> <request.json> with expectedRevisionHash and editorialInstruction.');
await getSite(siteId);if((await listJobs()).some(j=>j.siteId===siteId&&['queued','running'].includes(j.status)))throw Error('Existing site job active');
const request=JSON.parse(await readFile(requestFile,'utf8')),job=await enqueue('revise',siteId,pageId,request);
console.log(JSON.stringify({jobId:job.id,state:'queued-private-explicit-revision'}));
while(true){await new Promise(r=>setTimeout(r,500));const j=(await listJobs()).find(x=>x.id===job.id);if(j.status==='failed')throw Error(j.error);if(j.status==='complete'){console.log(JSON.stringify({jobId:j.id,state:j.status,generationReceipt:j.generationReceipts?.[pageId],detail:JSON.parse(j.detail)}));break;}}
