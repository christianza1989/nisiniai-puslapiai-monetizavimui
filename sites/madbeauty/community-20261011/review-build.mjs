import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {core,coreSource,pinCore,repo} from '../release-20261010/pinned-core.mjs';

// Local preparation only. Does not provision namespaces, secrets, routes or Meta permissions.
const accepted=path.join(repo,'sites/madbeauty/cloudflare/output/community-20261011/trial');
export const output=path.join(repo,'sites/madbeauty/cloudflare/output/community-20261011/review');
export const origin='https://perziura.madbeauty.lt';
export const expiresAt='2027-10-12T00:00:00.000Z';
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=async f=>JSON.parse(await readFile(f,'utf8'));

export async function prepareReview(){
 const receipt=await json(path.join(repo,'sites/madbeauty/community-20261011/RECEIPT.json'));
 assert.equal(execFileSync('git',['diff','--name-only',receipt.editions.trial.sourceCommit,'--','sites/madbeauty/backend','sites/madbeauty/cloudflare','sites/madbeauty/prototype','sites/madbeauty/trial-20261010'],{cwd:repo,encoding:'utf8'}).trim(),'','Review candidate must reuse the accepted runtime sources');
 const manifest=await json(path.join(accepted,'manifest.json'));
 assert.equal(manifest.artifactSha256,receipt.editions.trial.artifactSha256);
 assert.equal(sha(await readFile(path.join(accepted,'worker.mjs'))),manifest.artifactSha256);
 assert.equal(manifest.packageSha256,'e20c3b95b57ae9f813e55ffd0ef46688a937a7d63fe1c70246a92b8a71e71953');
 const baseline=await json(path.join(accepted,'wrangler.json'));
 assert.equal(baseline.vars.TRIAL_EXPIRES_AT,'2026-10-16T21:10:47.982Z');
 assert.equal(baseline.vars.APP_ORIGIN,'https://bandymas.madbeauty.lt');
 await mkdir(output,{recursive:true});
 await cp(path.join(accepted,'assets'),path.join(output,'assets'),{recursive:true});
 for(const file of ['trial-assets.json','trial-media.json'])await cp(path.join(accepted,file),path.join(output,file));
 const entry=path.join(repo,'sites/madbeauty/trial-20261010/worker.mjs');
 const source=await readFile(entry,'utf8'),marker="const origin='https://bandymas.madbeauty.lt';";
 assert.equal(source.split(marker).length,2,'Origin specialization must match exactly one accepted entry point');
 const specialized=source.replace(marker,`const origin=${JSON.stringify(origin)};`);
 const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js')));
 const bundle=await build({entryPoints:[entry],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'},plugins:[
  {name:'isolated-review-entry',setup(b){
   b.onLoad({filter:/[\\/]trial-20261010[\\/]worker\.mjs$/},()=>({contents:specialized,loader:'js',resolveDir:path.dirname(entry)}));
   b.onResolve({filter:/\.\/output\/trial-(assets|media)\.json$/},a=>({path:path.join(output,path.basename(a.path))}));
  }},pinCore
 ]});
 // Preserve the accepted runtime edition: installed workerd supports through 2026-05-22.
 // Advancing compatibility is a separately tested runtime migration, not a config-only claim.
 const config={...baseline,name:'madbeauty-meta-review-20261011',compatibility_date:baseline.compatibility_date,
  routes:[{pattern:new URL(origin).hostname,custom_domain:true}],workers_dev:false,preview_urls:false,
  // Same exported classes, entirely new Worker namespaces. No namespace IDs or cross-script bindings.
  durable_objects:{bindings:[{name:'PLATFORM',class_name:'TemporaryTestPlatform'},{name:'COMMUNITY',class_name:'MadbeautyCommunity'}]},
  migrations:[{tag:'review-v1',new_sqlite_classes:['TemporaryTestPlatform','MadbeautyCommunity']}],
  vars:{APP_ORIGIN:origin,RELEASE_MODE:'temporary-live-test',TRIAL_EXPIRES_AT:expiresAt,
   RETENTION_POLICY_VERSION:baseline.vars.RETENTION_POLICY_VERSION,FACEBOOK_APP_ID:'1827877621543839',
   FACEBOOK_GRAPH_VERSION:'v26.0',FACEBOOK_LOGIN_ENABLED:'false',COMMUNITY_ENABLED:'true'},
  observability:{enabled:true,head_sampling_rate:0.1,traces:{enabled:true,head_sampling_rate:0.1}}};
 assert.ok(!config.services&&!config.kv_namespaces&&!config.d1_databases&&!config.r2_buckets);
 for(const binding of config.durable_objects.bindings)assert.ok(!binding.namespace_id&&!binding.script_name);
 await writeFile(path.join(output,'worker.mjs'),bundle.outputFiles[0].contents);
 await writeFile(path.join(output,'wrangler.json'),JSON.stringify(config,null,2)+'\n');
 const proof={state:'LOCAL_CANDIDATE_NOT_DEPLOYED',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),coreSource,
  origin,expiresAt,artifactSha256:sha(bundle.outputFiles[0].contents),acceptedTrialArtifactSha256:manifest.artifactSha256,
  entrySourceSha256:sha(source),packageSha256:manifest.packageSha256,compatibilityDate:config.compatibility_date,
  facebookEnabled:false,secretsCreated:false,remoteMutations:0,queryRedaction:'Provider API settings required before Facebook activation; not a Wrangler 4.92 config field'};
 await writeFile(path.join(output,'native.json'),JSON.stringify({state:'UNVERIFIED',artifactSha256:proof.artifactSha256,reason:'Candidate rebuilt; run review-native.test.mjs'},null,2)+'\n');
 await writeFile(path.join(output,'manifest.json'),JSON.stringify(proof,null,2)+'\n');
 return {config,proof,script:bundle.outputFiles[0].text};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename))console.log(JSON.stringify((await prepareReview()).proof));
