import {readFile,writeFile,mkdir,copyFile,cp} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const site=path.resolve(import.meta.dirname,'..'),repo=path.resolve(site,'../..'),core=path.resolve(repo,'../dovanos-memorycasting');
const output=path.join(import.meta.dirname,'output'),assets=path.join(output,'assets');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(output,{recursive:true});
const receipt=JSON.parse(await readFile(path.join(site,'cloudflare/output/content-release-receipt.json')));
if(receipt.packageSha256!=='98882a2d62274315166757ebc581a1cc2b4aff98f4425b179a676e4bae8cf9b2')throw Error('Current reviewed content edition required');
await cp(path.join(site,'cloudflare/output/assets-release'),assets,{recursive:true});
await copyFile(path.join(site,'prototype/public/app.mjs'),path.join(assets,'app.mjs'));
const manifest=JSON.parse(await readFile(path.join(site,'prototype/public/app-media.json')));
const publicManifest={assets:manifest.assets.map(({id,alt,variants})=>({id,alt,variants}))};
const categories=JSON.parse(await readFile(path.join(site,'prototype/public/media.json')));
await writeFile(path.join(output,'trial-media.json'),JSON.stringify({assets:[...publicManifest.assets,...categories.assets.map(({id,alt,variants})=>({id,alt,variants}))]}));
await writeFile(path.join(assets,'app-media.json'),JSON.stringify(publicManifest));
const paths=new Set(JSON.parse(await readFile(path.join(site,'cloudflare/output/asset-paths.json'))));
const imageProof=[];
for(const asset of manifest.assets){
 for(const variant of asset.variants){
  if(!/^images\/[a-z0-9-]+\.webp$/.test(variant.file))throw Error('Only responsive public WebP variants permitted');
  const source=path.join(site,'prototype/public',variant.file),bytes=await readFile(source);
  if(hash(bytes)!==variant.sha256||bytes.length!==variant.bytes)throw Error('Existing image identity mismatch');
  await mkdir(path.dirname(path.join(assets,variant.file)),{recursive:true});await copyFile(source,path.join(assets,variant.file));
  paths.add('/'+variant.file);imageProof.push({id:asset.id,path:'/'+variant.file,sha256:variant.sha256,bytes:variant.bytes});
 }
}
await writeFile(path.join(output,'trial-assets.json'),JSON.stringify([...paths].sort()));
let secrets;try{secrets=JSON.parse(await readFile(path.join(output,'secrets.private.json')));}catch(e){if(e.code!=='ENOENT')throw e;secrets={SESSION_SECRET:randomBytes(48).toString('base64url')};await writeFile(path.join(output,'secrets.private.json'),JSON.stringify(secrets),{mode:0o600});}
let expiresAt;try{expiresAt=JSON.parse(await readFile(path.join(output,'manifest.json'))).expiresAt;}catch(e){if(e.code!=='ENOENT')throw e;expiresAt=new Date(Date.now()+7*86400000).toISOString();}
const name='madbeauty-temporary-test-20261010',origin='https://bandymas.madbeauty.lt';
const configuration={name,account_id:'d102163f74a45ab6d33bca786ce281ec',main:'worker.mjs',no_bundle:true,
 compatibility_date:'2026-05-22',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,
 routes:[{pattern:'bandymas.madbeauty.lt',custom_domain:true}],assets:{directory:'./assets',binding:'ASSETS',run_worker_first:true},
 durable_objects:{bindings:[{name:'PLATFORM',class_name:'TemporaryTestPlatform'}]},
 migrations:[{tag:'trial-v1',new_sqlite_classes:['TemporaryTestPlatform']}],
 vars:{APP_ORIGIN:origin,RELEASE_MODE:'temporary-live-test',TRIAL_EXPIRES_AT:expiresAt},
 observability:{enabled:true,head_sampling_rate:0.1,traces:{enabled:true,head_sampling_rate:0.1}}};
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js')));
const bundled=await build({entryPoints:[path.join(import.meta.dirname,'worker.mjs')],write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'}});
const bytes=bundled.outputFiles[0].contents;await writeFile(path.join(output,'worker.mjs'),bytes);
await writeFile(path.join(output,'wrangler.json'),JSON.stringify(configuration,null,2)+'\n');
await writeFile(path.join(output,'manifest.json'),JSON.stringify({at:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),
 origin,worker:name,artifactSha256:hash(bytes),packageSha256:receipt.packageSha256,expiresAt,
 profiles:40,salons:6,profileImageAssets:manifest.assets.filter(a=>/^profile-/.test(a.id)).length,assets:paths.size,
 media:imageProof,configuration,scope:'Owner-authorized temporary fictional live test. Separate namespace and new session key. No SMTP or production provider/customer records. All routes noindex, no discovery. Existing approved content retains date gates.'},null,2)+'\n');
console.log(JSON.stringify({worker:name,origin,artifactSha256:hash(bytes),assets:paths.size,profileImageAssets:120,expiresAt,secretsPrinted:false}));
