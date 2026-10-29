import fs from'node:fs';import path from'node:path';import{spawnSync}from'node:child_process';
const root=path.resolve(process.env.O3TECH_MIGRATION_ROOT||path.resolve(import.meta.dirname,'../../../..')),pub=path.join(root,'dovanos-memorycasting');
const records=[];for(const entry of fs.readdirSync(path.join(pub,'content-packages'),{withFileTypes:true}).filter(e=>e.isDirectory())){
 const file=path.join(pub,'content-packages',entry.name,'content-package.json');const pkg=JSON.parse(fs.readFileSync(file));if(pkg.schemaVersion!==1)continue;
 const r=spawnSync(process.execPath,['tests/seo-core-smoke.mjs'],{cwd:pub,encoding:'utf8',timeout:120000,windowsHide:true,env:{...process.env,SEO_SMOKE_SITE_ID:entry.name,SEO_SMOKE_BASE_URL:'http://127.0.0.1:4784'}});
 const record={siteId:entry.name,status:r.status===0?'PASS':'FAIL',exit:r.status,error:r.error?.message,stdout:r.stdout,stderr:r.stderr};records.push(record);console.log(entry.name+' '+record.status);
}
fs.writeFileSync(path.join(root,'private/seo-smoke-all.json'),JSON.stringify({at:new Date().toISOString(),environment:'local compiled Worker, remote bindings disabled',records},null,2));if(records.some(r=>r.status!=='PASS'))process.exitCode=1;
