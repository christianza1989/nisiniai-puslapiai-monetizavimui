import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {repo,out,hash,json,save,files,provider} from './common.mjs';
const kind=process.env.MADBEAUTY_RELEASE_KIND||'main';assert.ok(['main','trial'].includes(kind));
const oldRepo=path.resolve(repo,'../madbeauty-service-picker-20261010'),base=path.join(oldRepo,'sites/madbeauty/cloudflare/output',kind==='main'?'content-deploy6-20261012':'community-20261011/trial');
const manifest=await json(path.join(base,'manifest.json')),source=await readFile(path.join(base,'worker.mjs'),'utf8');
assert.equal(hash(source),kind==='main'?'149cf291401561907c73de39008562af52a95a2b88d72effe36cb44268e18ad3':'ff9c22835ed8efd4c23a22267112b432966a97c3e76d7fbb06e309f41cfa70ff');
const icons=['favicon.svg','favicon.ico','favicon-32.png','apple-touch-icon.png'];
const iconTags='<link rel="icon" href="/favicon.svg?v=20261013" type="image/svg+xml"><link rel="alternate icon" href="/favicon.ico?v=20261013"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20261013">';
const edits=[['<link rel="icon" href="/wordmark.svg" type="image/svg+xml">',iconTags],
 ['const target3 = path.startsWith("/favicon.") ? new Request(new URL("/wordmark.svg", url), request) : request;','const target3 = request;'],
 ['new Set([...asset_paths_default,','new Set([...asset_paths_default, '+icons.map(x=>JSON.stringify('/'+x)).join(', ')+',']];
if(kind==='trial')edits.push(['new Set([...trial_assets_default,','new Set([...trial_assets_default, '+icons.map(x=>JSON.stringify('/'+x)).join(', ')+',']);
function patch(s){for(const [before,after]of edits){assert.equal(s.split(before).length,2,'Exactly one allowed compiled edit: '+before);s=s.replace(before,after);}return s;}
await mkdir(out,{recursive:true});await cp(path.join(base,'assets'),path.join(out,'assets'),{recursive:true});
const preserved=[];for(const file of await files(path.join(base,'assets'))){const sha=hash(await readFile(path.join(base,'assets',file)));assert.equal(hash(await readFile(path.join(out,'assets',file))),sha);preserved.push({file,sha256:sha});}
for(const file of icons)await cp(path.join(repo,'sites/madbeauty/prototype/public',file),path.join(out,'assets',file));
await writeFile(path.join(out,'worker.mjs'),patch(source));const config=await json(path.join(base,'wrangler.json'));await save('wrangler.json',config);
if(kind==='main'){
 for(const file of ['content-package.json','asset-paths.json'])await cp(path.join(base,file),path.join(out,file));
 const paths=await json(path.join(out,'asset-paths.json'));await save('asset-paths.json',[...paths,...icons.map(x=>'/'+x)].sort());
 const timing=await readFile(path.join(base,'timing-worker.mjs'),'utf8');assert.equal(hash(timing),manifest.timingArtifactSha256);await writeFile(path.join(out,'timing-worker.mjs'),patch(timing));
 assert.equal(hash(await readFile(path.join(out,'content-package.json'))),manifest.packageSha256);
}
const before=await provider();const active=before.records.find(x=>x.name===config.name).deployments.deployments[0].versions;assert.deepEqual(active,[{version_id:kind==='main'?'87e6c536-aa20-4f9c-a052-62ab21f9526c':'283f9d36-88a3-44ba-87f0-dbf25e3e0f65',percentage:100}]);
await save('before.private.json',{at:new Date().toISOString(),...before});
await save('manifest.json',{...manifest,kind,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),instructionNetworkMain:'7af6b9641012a30c5f95eac38a66daeff8f8cb39',instructionCompanionMain:'ec8a9c032fe926d1d9722802d8eb26fa8bd02937',runtimeSource:'9dcd67cf1f5bd1500564b47ea6b4a2dbd8ce8f63',baseArtifactSha256:hash(source),artifactSha256:hash(await readFile(path.join(out,'worker.mjs'))),...kind==='main'?{timingArtifactSha256:hash(await readFile(path.join(out,'timing-worker.mjs')))}:{},faviconAssets:await Promise.all(icons.map(async file=>({file,sha256:hash(await readFile(path.join(out,'assets',file)))}))),totalAssets:preserved.length+icons.length,preservedAssets:preserved,patches:edits.map(([before,after])=>({before,after})),scope:kind==='main'?'Exact accepted 135-page content candidate plus favicon; incumbent compiled runtime/core preserved':'Favicon only; trial identities, expiry and content package preserved'});
console.log(JSON.stringify({kind,state:'BUILT',assets:preserved.length+icons.length,artifactSha256:hash(await readFile(path.join(out,'worker.mjs')))}));
