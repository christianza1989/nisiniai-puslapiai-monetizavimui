// File-first orchestration of the shared model transaction. No generation/release.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
if(!process.env.STUDIO_DATA_DIR)throw Error('Explicit private STUDIO_DATA_DIR required.');
const [requestFile,flag,receiptFile]=process.argv.slice(2);
if(!requestFile||!['--check','--apply'].includes(flag)||flag==='--apply'&&!receiptFile)throw Error('Usage: reconcile-private-plan.mjs <private-request.json> --check | --apply <receipt.json>');
const request=JSON.parse(await readFile(path.resolve(requestFile),'utf8'));
const model=await import('../src/model.mjs');
const site=await model.getSite(request.siteId);
const actual=createHash('sha256').update(model.stable(site)).digest('hex');
if(flag==='--check'){
 if(actual!==request.expectedSiteHash)throw Error('Site changed after request preparation.');
 console.log(JSON.stringify({status:'REQUEST_SNAPSHOT_MATCH_NOT_TRANSACTION_ACCEPTANCE',siteId:site.id,currentPages:site.pages.length,plannedActive:request.updates.length,retire:request.retire.length,activeJobs:(await model.listJobs()).filter(j=>j.siteId===site.id&&['queued','running'].includes(j.status)).map(j=>({id:j.id,status:j.status})),generation:false}));
}else{
 const receipt=await model.reconcilePrivatePlan(request.siteId,request);
 await writeFile(path.resolve(receiptFile),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({status:receipt.replayed?'PRIVATE_PLAN_RECONCILIATION_REPLAY_VERIFIED':'PRIVATE_PLAN_RECONCILED',activePages:receipt.activePages,retired:receipt.retired.length,protectedRevisions:receipt.protectedHashes.length,generation:false,productionDeployed:false}));
}
