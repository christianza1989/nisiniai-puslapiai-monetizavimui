import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const producer='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui';
const git=(...args)=>execFileSync('git',args,{cwd:producer,encoding:'utf8',windowsHide:true}).trim();
const files=[];
for(const dir of ['content-studio/src','content-studio/scripts'])for(const name of await fs.readdir(producer+'/'+dir)){if(!name.endsWith('.mjs'))continue;const bytes=await fs.readFile(producer+'/'+dir+'/'+name);files.push({path:dir+'/'+name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});}
const jobs=JSON.parse(await fs.readFile(sel.privateStudio+'/jobs.json','utf8')).filter(j=>sel.pages.some(p=>p.pageId===j.pageId));
const record={observedAt:new Date().toISOString(),producerDirectory:producer,readOnlyForeignCheckout:true,headAtObservation:git('rev-parse','HEAD'),branchAtObservation:git('branch','--show-current'),workingTreeAtObservation:git('status','--short'),codeFilesAtObservation:files,jobs:jobs.map(j=>({id:j.id,type:j.type,status:j.status,pageId:j.pageId,skillFingerprint:j.skillFingerprint,planningSourceSha256:j.planningSourceSha256,lastGenerationReceipt:j.lastGenerationReceipt,generationReceipts:j.generationReceipts})),limitations:['The producer checkout is dirty and owned by another chat. Its HEAD alone does not identify the code used for generation. These current file hashes are observations, not retroactive hashes at each job start. Historical prompt/result hashes and job fingerprints remain the primary execution evidence. No foreign checkout, core or skill files were modified by this content batch.']};
await fs.writeFile(new URL('PRODUCER-PROVENANCE.json',here),JSON.stringify(record,null,2)+'\n');
console.log({codeFiles:files.length,jobRecords:jobs.length,producerDirty:!!record.workingTreeAtObservation});
