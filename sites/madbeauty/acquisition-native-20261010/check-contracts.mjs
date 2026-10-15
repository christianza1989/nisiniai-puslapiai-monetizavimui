import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
for(const filename of ['contracts.lock.json','retirement-contracts.lock.json']){
const lock=JSON.parse(readFileSync(new URL('./'+filename,import.meta.url)));
for(const entry of lock.files){
 const local=readFileSync(new URL('./contracts/'+entry.name,import.meta.url));
 const canonical=execFileSync('git',['show',lock.source+':'+entry.path],{cwd:root,maxBuffer:1024*1024});
 if(createHash('sha256').update(local).digest('hex')!==entry.sha256||!local.equals(canonical))throw Error('Canonical contract differs: '+entry.name);
}
console.log(JSON.stringify({source:lock.source,files:lock.files.length,status:'PASS'}));
}
