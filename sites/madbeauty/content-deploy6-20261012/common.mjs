import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
export {core,coreSource,pinCore} from '../release-20261010/pinned-core.mjs';
export const repo=path.resolve(import.meta.dirname,'../../..'),out=path.join(repo,'sites/madbeauty/cloudflare/output/content-deploy6-20261012'),previous=path.join(repo,'sites/madbeauty/cloudflare/output/community-20261011/main'),producer=path.resolve(repo,'../madbeauty-next6-20261012/sites/madbeauty/content-next6-20261012');
export const packageSha256='86c7595036970f905cec196d9090d712bfa11c113f09e4cd645c25611ed47509',baselineSha256='e20c3b95b57ae9f813e55ffd0ef46688a937a7d63fe1c70246a92b8a71e71953',runtimeSource='9dcd67cf1f5bd1500564b47ea6b4a2dbd8ce8f63',baselineVersion='87e6c536-aa20-4f9c-a052-62ab21f9526c';
export const hash=b=>createHash('sha256').update(b).digest('hex'),json=async f=>JSON.parse(await readFile(f)),save=async(name,v)=>{await mkdir(out,{recursive:true});await writeFile(path.join(out,name),JSON.stringify(v,null,2)+'\n');};
export function sourceBoundary(){assert.equal(execFileSync('git',['diff','--name-only',runtimeSource,'--','sites/madbeauty/backend','sites/madbeauty/prototype','sites/madbeauty/cloudflare','sites/madbeauty/content','sites/madbeauty/trial-20261010/worker.mjs'],{cwd:repo,encoding:'utf8'}).trim(),'','Current platform runtime boundary must stay unchanged');}
export async function files(dir,relative=''){let result=[];for(const e of await readdir(path.join(dir,relative),{withFileTypes:true})){const name=path.posix.join(relative,e.name);result.push(...(e.isDirectory()?await files(dir,name):[name]));}return result.sort();}
export async function provider(){
 const raw=await readFile('C:/Users/Lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8'),token=raw.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];assert.ok(token);
 const base='https://api.cloudflare.com/client/v4/accounts/d102163f74a45ab6d33bca786ce281ec',get=async suffix=>{const r=await fetch(base+suffix,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});if(r.status===401)throw Error('Wrangler OAuth refresh required; no dependent write permitted');const v=await r.json();assert.ok(v.success,'Provider status '+r.status);return v.result;},records=[];
 for(const name of ['madbeauty-platform-preview','madbeauty-ui-acceptance-20261009','madbeauty-temporary-test-20261010','madbeauty-meta-review-20261011','madbeauty-calendar-acceptance-20261009']){const [settings,deployments]=await Promise.all([get('/workers/scripts/'+name+'/settings'),get('/workers/scripts/'+name+'/deployments')]);records.push({name,settings,deployments});}
 const domains=(await get('/workers/domains')).filter(x=>x.service==='madbeauty-platform-preview').map(({hostname,service,environment})=>({hostname,service,environment})).sort((a,b)=>a.hostname.localeCompare(b.hostname));
 return {records,domains};
}
