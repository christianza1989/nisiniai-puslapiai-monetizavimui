import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export const repo=path.resolve(import.meta.dirname,'../../..');
// Dependency binaries only. The incumbent runtime is an immutable compiled input,
// not a rebuild from old repository instructions or old core source.
export const core=path.resolve(repo,'../madbeauty-platform-core-20261010');
export const releaseRoot=path.join(repo,'sites/madbeauty/cloudflare/output/favicon-20261013');
export const out=path.join(releaseRoot,process.env.MADBEAUTY_RELEASE_KIND||'main');
export const packageSha256='86c7595036970f905cec196d9090d712bfa11c113f09e4cd645c25611ed47509',baselineSha256='e20c3b95b57ae9f813e55ffd0ef46688a937a7d63fe1c70246a92b8a71e71953';
export const hash=b=>createHash('sha256').update(b).digest('hex'),json=async f=>JSON.parse(await readFile(f));
export const save=async(name,v)=>{await mkdir(path.dirname(path.join(out,name)),{recursive:true});await writeFile(path.join(out,name),JSON.stringify(v,null,2)+'\n');};
export async function files(dir,relative=''){let result=[];for(const e of await readdir(path.join(dir,relative),{withFileTypes:true})){const name=path.posix.join(relative,e.name);result.push(...(e.isDirectory()?await files(dir,name):[name]));}return result.sort();}
export async function provider(){
 const raw=await readFile('C:/Users/Lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8'),token=raw.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];assert.ok(token);
 const base='https://api.cloudflare.com/client/v4/accounts/d102163f74a45ab6d33bca786ce281ec',get=async suffix=>{const r=await fetch(base+suffix,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});if(r.status===401)throw Error('Wrangler OAuth refresh required; no dependent write permitted');const v=await r.json();assert.ok(v.success,'Provider status '+r.status);return v.result;},records=[];
 for(const name of ['madbeauty-platform-preview','madbeauty-ui-acceptance-20261009','madbeauty-temporary-test-20261010','madbeauty-meta-review-20261011','madbeauty-calendar-acceptance-20261009']){const [settings,deployments]=await Promise.all([get('/workers/scripts/'+name+'/settings'),get('/workers/scripts/'+name+'/deployments')]);records.push({name,settings,deployments});}
 const domains=(await get('/workers/domains')).filter(x=>['madbeauty-platform-preview','madbeauty-temporary-test-20261010'].includes(x.service)).map(({hostname,service,environment})=>({hostname,service,environment})).sort((a,b)=>a.hostname.localeCompare(b.hostname));return {records,domains};
}
