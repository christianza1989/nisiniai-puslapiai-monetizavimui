// Read-only committed-change coverage. Run the freshness gate separately first.
import {spawnSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const shared=p=>/^(?:AGENTS(?:\.override)?\.md|START_HERE\.md|CORE[^/]*\.md|SKILLS\/|scripts\/|lib\/|tests\/|config\/|content-studio\/(?:src|test|schemas)\/|core-improvements\/README\.md)/.test(p);
function git(root,args){const r=spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:30000,windowsHide:true});if(r.status!==0)throw Error('Git coverage read failed.');return r.stdout.trim();}
export async function checkUpgradeCoverage({repo,journal,base}){
 repo=path.resolve(repo);journal=path.resolve(journal);
 if(!base)throw Error('Provide the actual committed baseline.');
 const head=git(repo,['rev-parse','HEAD']),baseline=git(repo,['rev-parse',base]);git(repo,['merge-base','--is-ancestor',baseline,head]);
 const remote=git(repo,['remote','get-url','origin']),identity=/^(?:https:\/\/github\.com\/|git@github\.com:)(christianza1989\/(?:nisiniai-puslapiai-monetizavimui|niche-public-core))(?:\.git)?$/.exec(remote)?.[1];
 if(!identity)throw Error('Unexpected repository identity.');
 const changed=git(repo,['diff','--name-only','--diff-filter=ACMR',baseline,head]).split('\n').filter(p=>p&&shared(p)),covered=new Set(),records=[];
 let entries=[];try{entries=await readdir(path.join(journal,'core-improvements/entries'),{withFileTypes:true});}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const entry of entries){if(!entry.isDirectory()||!/^upgrade-[a-f0-9-]{36}$/.test(entry.name))continue;
  const record=JSON.parse(await readFile(path.join(journal,'core-improvements/entries',entry.name,'record.json'),'utf8'));
  if(record.id!==entry.name||!Array.isArray(record.paths))throw Error('Invalid upgrade record.');
  if(!String(record.issue).startsWith('https://github.com/'+identity+'/issues/'))continue;
  for(const p of record.paths){if(typeof p!=='string'||p.startsWith('/')||p.includes('\\')||p.split('/').some(v=>v==='..'||v==='.'||!v))throw Error('Unsafe upgrade path.');covered.add(p);}
  records.push(record.id);
 }
 const uncovered=changed.filter(p=>!covered.has(p));return {status:uncovered.length?'FAIL_UNRECORDED_CHANGES':'PASS_COMMITTED_COVERAGE',repository:identity,baseSha:baseline,headSha:head,changed,uncovered,records,limits:'Committed paths only; not freshness, semantic approval, test success, main merge or runtime adoption.'};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const opts={};for(let i=2;i<process.argv.length;i+=2){if(!['--repo','--journal','--base'].includes(process.argv[i])||!process.argv[i+1])throw Error('Use --repo PATH --journal PATH --base SHA.');opts[process.argv[i].slice(2)]=process.argv[i+1];}
 const result=await checkUpgradeCoverage({repo:opts.repo||process.cwd(),journal:opts.journal||process.cwd(),base:opts.base});console.log(JSON.stringify(result,null,2));process.exitCode=result.uncovered.length?1:0;
}
