import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {catalogFromMarkdown} from './score-audit.mjs';

export function auditSkeleton(siteId,canonicalHost,catalog){
 if(!/^[a-z0-9][a-z0-9-]{1,62}$/.test(siteId))throw Error('Invalid siteId.');
 if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(canonicalHost))throw Error('Use the exact canonical domain, not a URL/path.');
 return {siteId,canonicalHost,phase:1,evaluatedAt:null,evaluator:'NOT YET REVIEWED',environment:{},version:{},
  verdict:{local:'UNREVIEWED',launch:'UNREVIEWED',demand:'UNMEASURED',visual:'UNREVIEWED'},
  checks:catalog.map(item=>({...item,status:'UNVERIFIED',evidence:[],notes:'Requires actual site-specific inspection; do not copy another site\'s PASS.'}))};
}
export async function initializeAudit(projectRoot,siteId,canonicalHost){
 const catalog=catalogFromMarkdown(await readFile(new URL('../references/checklist.md',import.meta.url),'utf8'));
 const audit=auditSkeleton(siteId,canonicalHost,catalog),dir=path.resolve(projectRoot,'sites',siteId);
 const json=path.join(dir,'PHASE-1-AUDIT.json'),md=path.join(dir,'PHASE-1-AUDIT.md');
 for(const file of [json,md]){try{await access(file);throw Error(`Existing audit preserved: ${file}`);}catch(error){if(error.code!=='ENOENT')throw error;}}
 await mkdir(dir,{recursive:true});
 let report=`# ${canonicalHost} — first-phase audit\n\nUNREVIEWED scaffold. No quality score or readiness is claimed.\n\n## Inventory and versions\n\nRecord actual URLs, package hash, source/build, environment, operator facts and dependencies.\n\n## Baseline findings and repairs\n\nRecord P0/P1/P2 findings before fixes and their actual acceptance evidence.\n\n## Measurements and visual verdict\n\nRecord real screenshots, all initial guide reviews, local storage/delivery boundaries, performance and separate visual judgement.\n\n## A–Z checks\n\n`;
 for(const item of audit.checks)report+=`- [ ] **${item.id} · UNVERIFIED · ${item.stage}${item.gate?' gate':''}** — ${item.criterion}\n\n  Evidence: not yet inspected.\n\n`;
 report+='## Stage scores and launch/demand gates\n\nUse the shared scorer after inspection. Never convert unknown checks to PASS/NA merely to reach 10.\n';
 await writeFile(json,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});await writeFile(md,report,{flag:'wx'});
 return {siteId,canonicalHost,criteria:catalog.length,json,md,status:'UNREVIEWED'};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const [siteId,host]=process.argv.slice(2);if(!siteId||!host)throw Error('Usage from project root: node SKILLS/niche-site-audit/scripts/init-audit.mjs <siteId> <canonicalHost>');
 console.log(JSON.stringify(await initializeAudit(process.cwd(),siteId,host),null,2));
}
