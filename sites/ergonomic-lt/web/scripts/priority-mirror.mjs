import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,renameSync,readFileSync} from 'node:fs';
import path from 'node:path';
const directory='D:/Core/output/ergonomic-admin-launch-20261017';
const target=path.join(directory,'PRIORITETAI.json');
const interval=process.argv.includes('--watch');mkdirSync(directory,{recursive:true});
function sync(){
 const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','ergonomic-publication','--remote','--config','wrangler.jsonc','--json','--command',"SELECT name,revision,payload,updated_at FROM admin_documents WHERE name IN ('priorities.json','drafts.json') UNION ALL SELECT 'draft:'||model_key,0,NULL,NULL FROM publication_model_documents WHERE document='drafts.json'"],{cwd:process.cwd(),encoding:'utf8',windowsHide:true,timeout:45000});
 if(r.status!==0)throw Error('D1 prioritetų nuskaitymas nepavyko; ankstesnis failas išsaugotas.');
 const parsed=JSON.parse(r.stdout),rows=parsed.flatMap(x=>x.results||[]);const row=rows.find(r=>r.name==='priorities.json');
 if(!row)throw Error('Prioritetų dokumentas nerastas.');const data=JSON.parse(row.payload);
 const old=JSON.parse(readFileSync('content/admin-source-status.json','utf8'));const map=new Map(old.models.map(m=>[m.key,m]));
 const output={...data,models:data.order.map(key=>{const m=map.get(key);return {key,productId:m.productId,configurationId:m.configurationId,code:m.code};}),revision:row.revision,updatedAt:row.updated_at,syncedAt:new Date().toISOString(),source:'ergonomic-publication/admin_documents/priorities.json',readOnlyMirror:true};
 const temp=target+'.tmp';writeFileSync(temp,JSON.stringify(output,null,2)+'\n');renameSync(temp,target);
 const drafts=JSON.parse(rows.find(r=>r.name==='drafts.json')?.payload||'{"models":{}}');
 for(const r of rows)if(r.name.startsWith('draft:'))drafts.models[r.name.slice(6)]=true;
 const order=[...data.order,...old.models.map(m=>m.key).filter(k=>!data.order.includes(k))];
 const writer=order.map(key=>map.get(key)).filter(m=>m&&m.geometryAccepted&&!m.geminiReady&&!drafts.models[m.key]).map(m=>({key:m.key,productId:m.productId,configurationId:m.configurationId,code:m.code,sourceInventoryHash:m.revisionHash,path:m.path}));
 writeFileSync(path.join(directory,'GEMINI-EILE.json'),JSON.stringify({version:1,priorityRevision:row.revision,provider:'Gemini App',model:'4 Argon',thinking:'low',execution:'Codex-operated existing signed-in browser; no API model alias and no unattended browser robot',jobs:writer},null,2)+'\n');
 writeFileSync(path.join(directory,'PRIORITY-MIRROR-STATUS.json'),JSON.stringify({at:output.syncedAt,pid:process.pid,phase:interval?'WATCHING':'SYNCED',priorityRevision:row.revision,entries:data.order.length,writerJobs:writer.length,target}));
 return {revision:row.revision,entries:data.order.length,writerJobs:writer.length,target};
}
do{try{const result=sync();if(!interval)console.log(JSON.stringify(result));}catch(e){writeFileSync(path.join(directory,'PRIORITY-MIRROR-ERROR.json'),JSON.stringify({at:new Date().toISOString(),error:e.message}));if(!interval)throw e;}
 if(interval)await new Promise(resolve=>setTimeout(resolve,30000));
}while(interval);
