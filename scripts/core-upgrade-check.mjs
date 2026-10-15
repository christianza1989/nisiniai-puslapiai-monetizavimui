// Committed-path coverage only. This does not certify test results or deployment.
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
export function uncoveredUpgradePaths(changed,registered){
 const declared=new Set(registered);
 return changed.filter(p=>!p.startsWith('sites/')&&!p.startsWith('core-improvements/entries/')&&!declared.has(p));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{
  const args=process.argv.slice(2),opts={head:'HEAD'};
  if(args.includes('--help')){console.log('Usage: node scripts/core-upgrade-check.mjs --base COMMIT --id upgrade-UUID [--head COMMIT]. Checks committed changes against the committed journal record; run the canonical freshness handoff first.');process.exit(0);}
  for(let i=0;i<args.length;i+=2){if(!['--base','--id','--head'].includes(args[i])||!args[i+1])throw Error('invalid_arguments');opts[args[i].slice(2)]=args[i+1];}
  if(!opts.base||!/^upgrade-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(opts.id||''))throw Error('explicit_base_and_upgrade_id_required');
  const git=(...a)=>execFileSync('git',a,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024}).trim();
  const base=git('rev-parse','--verify',opts.base+'^{commit}'),head=git('rev-parse','--verify',opts.head+'^{commit}');git('merge-base','--is-ancestor',base,head);
  const recordPath='core-improvements/entries/'+opts.id+'/record.json',record=JSON.parse(git('show',head+':'+recordPath));
  if(record.id!==opts.id||!Array.isArray(record.paths)||record.paths.some(p=>typeof p!=='string'||p.startsWith('/')||p.includes('..')||p.includes('\\')))throw Error('invalid_committed_record');
  const changed=git('diff','--name-only',base,head,'--').split('\n').filter(Boolean),uncovered=uncoveredUpgradePaths(changed,record.paths);
  console.log(JSON.stringify({state:uncovered.length?'FAIL_UNCOVERED_COMMITTED_CHANGES':'PASS_COMMITTED_UPGRADE_COVERAGE',base,head,upgradeId:opts.id,changedFiles:changed.length,uncovered,scope:'Committed file paths only; no editorial, test, current-main, merge or runtime adoption claim.'},null,2));
  if(uncovered.length)process.exitCode=1;
 }catch{console.error(JSON.stringify({state:'FAIL_UPGRADE_COVERAGE',reason:'invalid_arguments_commit_or_record'}));process.exitCode=1;}
}
