// Bounded existing-plan execution. No new topics, approval or publication.
import {getSite,listJobs} from '../src/model.mjs';
import {enqueue} from '../src/generator.mjs';
const [siteId,pageId]=process.argv.slice(2);
if(!process.env.STUDIO_DATA_DIR||!process.env.STUDIO_OUTPUT_DIR||!siteId||!pageId)throw Error('Usage: explicit private STUDIO_DATA_DIR and STUDIO_OUTPUT_DIR; node content-studio/scripts/draft-page.mjs <site-id> <existing-page-id>');
await getSite(siteId);
if((await listJobs()).some(j=>j.siteId===siteId&&['queued','running'].includes(j.status)))throw Error('An existing site job is active; wait for its owner.');
const job=await enqueue('draft',siteId,pageId);
console.log(JSON.stringify({jobId:job.id,siteId,pageId,state:'queued-private-draft'}));
while(true){
 await new Promise(resolve=>setTimeout(resolve,500));
 const current=(await listJobs()).find(j=>j.id===job.id);
 if(current.status==='failed')throw Error(current.error);
 if(current.status==='complete'){console.log(JSON.stringify({jobId:job.id,state:current.status,detail:JSON.parse(current.detail),generationReceipt:current.generationReceipts?.[pageId]||null}));break;}
}
