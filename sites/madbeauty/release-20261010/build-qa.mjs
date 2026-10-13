import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {core,pinCore} from './pinned-core.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),out=path.resolve(repo,'sites/madbeauty/cloudflare/output/full-release-20261010'),old=path.resolve(repo,'sites/madbeauty/platform-upgrade-20261007/evidence/hosted-ui264');
await mkdir(out,{recursive:true});
const receipt=JSON.parse(await readFile(path.resolve(repo,'sites/madbeauty/cloudflare/output/content-release-receipt.json')));
assert.equal(receipt.packageSha256,'e20c3b95b57ae9f813e55ffd0ef46688a937a7d63fe1c70246a92b8a71e71953');assert.equal(receipt.approvedPages.length,129);
const name='madbeauty-ui-acceptance-20261009',origin='https://'+name+'.phonebridger-app.workers.dev';
let source=await readFile(path.resolve(old,'../hosted-ui264-entry.mjs'),'utf8');
source=source.replace('../../cloudflare/worker.mjs',path.resolve(repo,'sites/madbeauty/cloudflare/worker.mjs').replaceAll('\\','/')).replace("'hosted-other@example.com'","'hosted-other@example.com','hosted-erasure@example.com'");
source=source.replace(' qaSnapshot(){return this.store.read();}',` qaSnapshot(){return this.store.read();}
 qaRetentionFacts(){return {policy:this.store.retentionPolicyVersion,tombstones:this.store.db.prepare('SELECT COUNT(*) AS n FROM retention_tombstones').get().n,queued:this.store.db.prepare("SELECT COUNT(*) AS n FROM retention_target_queue WHERE state!='completed'").get().n,backups:this.store.db.prepare('SELECT COUNT(*) AS n FROM retention_backups').get().n};}
`);
source=source.replace("if(request.method==='GET'&&url.pathname==='/__qa/source')", "if(request.method==='GET'&&url.pathname==='/__qa/retention')return json(await source.qaRetentionFacts());\n  if(request.method==='GET'&&url.pathname==='/__qa/source')");
await writeFile(path.resolve(out,'qa-entry.mjs'),source);
const {build}=await import(pathToFileURL(path.resolve(core,'node_modules/esbuild/lib/main.js')));
const bundle=await build({entryPoints:[path.resolve(out,'qa-entry.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[pinCore]}),worker=bundle.outputFiles[0].text;
await writeFile(path.resolve(out,'qa-worker.mjs'),worker);
const config=JSON.parse(await readFile(path.resolve(old,'wrangler.json')));assert.equal(config.name,name);assert.equal(config.migrations[0].tag,'isolated-ui-v1');
config.main='qa-worker.mjs';config.no_bundle=true;config.assets.directory=path.resolve(repo,'sites/madbeauty/cloudflare/output/assets-release');
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
config.vars={...config.vars,SOURCE_COMMIT:commit,RUNTIME_CHECKPOINT:commit,RETENTION_POLICY_VERSION:'madbeauty-2026-10-10-v1'};
await writeFile(path.resolve(out,'qa-wrangler.json'),JSON.stringify(config,null,2));
await writeFile(path.resolve(out,'qa-manifest.json'),JSON.stringify({sourceCommit:commit,artifactSha256:createHash('sha256').update(worker).digest('hex'),packageSha256:receipt.packageSha256,pages:129,assets:receipt.assets,name,origin,policy:config.vars.RETENTION_POLICY_VERSION,dirtyScope:execFileSync('git',['status','--short'],{cwd:repo,encoding:'utf8'}).trim().split('\n')},null,2));
console.log(JSON.stringify({state:'CANDIDATE_BUILT',name,pages:129,assets:receipt.assets,sha256:createHash('sha256').update(worker).digest('hex'),smtp:false,secretsChanged:false}));
