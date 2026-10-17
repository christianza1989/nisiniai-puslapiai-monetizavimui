// Read-only coverage of committed changes by a selected canonical upgrade record.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const git=(repo,args)=>execFileSync('git',['-C',resolve(repo),...args],{encoding:'utf8',windowsHide:true,maxBuffer:2*1024*1024});
export function checkCommittedCoverage({repo='.',journal=repo,base,entry}){
 if(!base||!/^upgrade-[a-f0-9-]{36}$/.test(entry||''))throw Error('base_and_upgrade_entry_required');
 const head=git(repo,['rev-parse','HEAD']).trim(),baseSha=git(repo,['rev-parse','--verify',base+'^{commit}']).trim();
 git(repo,['merge-base','--is-ancestor',baseSha,head]);
 const journalHead=git(journal,['rev-parse','HEAD']).trim(),root='core-improvements/entries/'+entry;
 const record=JSON.parse(git(journal,['show',journalHead+':'+root+'/record.json']));
 if(record.id!==entry||!Array.isArray(record.paths)||!record.paths.length||record.paths.some(p=>typeof p!=='string'||!p||p.startsWith('/')||p.includes('\\')||p.includes(':')||p.split('/').some(s=>!s||s==='.'||s==='..')))throw Error('invalid_upgrade_scope');
 const changed=git(repo,['diff','--name-only','-z',baseSha,head]).split('\0').filter(Boolean);
 const uncovered=changed.filter(file=>!(resolve(repo)===resolve(journal)&&file.startsWith(root+'/'))&&!record.paths.some(scope=>file===scope||file.startsWith(scope+'/')));
 return {status:uncovered.length?'FAIL_UNCOVERED':'PASS',head,baseSha,journalHead,entry,changed,uncovered,limitation:'Committed path coverage only; not semantic acceptance, freshness, safety, deployment or adoption. Working-tree changes are excluded.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const args=process.argv.slice(2),options={};
  for(let i=0;i<args.length;i+=2){const key=args[i]?.slice(2);if(!['repo','journal','base','entry'].includes(key)||!args[i+1])throw Error('Usage: node scripts/core-upgrade-check.mjs --base <commit> --entry <upgrade-id> [--repo <path>] [--journal <core-path>]');options[key]=args[i+1];}
  const report=checkCommittedCoverage(options);console.log(JSON.stringify(report,null,2));if(report.uncovered.length)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
