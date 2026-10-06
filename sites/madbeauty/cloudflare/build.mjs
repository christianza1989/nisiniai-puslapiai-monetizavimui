import {readFile,writeFile,mkdir,copyFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const site=path.resolve(import.meta.dirname,'..'),core=path.resolve(site,'../../../dovanos-memorycasting'),output=path.join(import.meta.dirname,'output'),assets=path.join(output,'assets-release');
const {validateContentPackage}=await import(pathToFileURL(path.join(core,'scripts/content-package-core.mjs')));
const raw=await readFile(path.join(site,'content/initial-release/content-package.json'));
if(createHash('sha256').update(raw).digest('hex')!=='dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579')throw Error('Approved release changed');
const pkg=validateContentPackage(JSON.parse(raw));
await mkdir(assets,{recursive:true});
const publicRoot=path.join(site,'prototype/public');
for(const entry of await readdir(publicRoot)){
 if(!/\.(?:css|mjs|svg)$/.test(entry)||['kit.mjs'].includes(entry))continue;
 await copyFile(path.join(publicRoot,entry),path.join(assets,entry));
}
await mkdir(path.join(assets,'fonts'),{recursive:true});
for(const file of await readdir(path.join(publicRoot,'fonts')))await copyFile(path.join(publicRoot,'fonts',file),path.join(assets,'fonts',file));
const media=JSON.parse(await readFile(path.join(publicRoot,'app-media.json'),'utf8'));media.assets=media.assets.filter(a=>['hero-violet','technician'].includes(a.id));
const categoryMedia=JSON.parse(await readFile(path.join(publicRoot,'media.json'),'utf8'));
await writeFile(path.join(assets,'media.json'),JSON.stringify({assets:categoryMedia.assets.map(({id,alt,variants})=>({id,alt,variants}))}));
await writeFile(path.join(assets,'app-media.json'),JSON.stringify({assets:media.assets.map(({id,alt,variants})=>({id,alt,variants}))}));
for(const file of new Set([...media.assets,...categoryMedia.assets].flatMap(a=>a.variants.map(v=>v.file)))){await mkdir(path.dirname(path.join(assets,file)),{recursive:true});await copyFile(path.join(publicRoot,file),path.join(assets,file));}
for(const name of ['cities.mjs','config.mjs','demo-model.mjs','demo-adapter.mjs','platform-domain.mjs','platform-adapter.mjs','seo-contract.mjs','profile-fixtures-v2.mjs'])await copyFile(path.join(site,'prototype',name),path.join(assets,name));
await mkdir(path.join(assets,'content-assets/madbeauty'),{recursive:true});
for(const file of new Set(pkg.pages.flatMap(p=>p.media.map(m=>path.basename(m.src)))))await copyFile(path.join(site,'content/initial-release/assets',file),path.join(assets,'content-assets/madbeauty',file));
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js')));
const network=JSON.parse(await readFile(path.join(core,'config/niche-network.json'),'utf8'));
await build({entryPoints:[path.join(core,'lib/niche-seo.ts')],outfile:path.join(output,'seo.mjs'),bundle:true,platform:'neutral',format:'esm',plugins:[{name:'site-bindings',setup(b){
 b.onResolve({filter:/^@\/lib\/niche-sites$/},()=>({path:'sites',namespace:'site'}));b.onResolve({filter:/^@\/lib\/niche-network$/},()=>({path:'network',namespace:'site'}));
 b.onLoad({filter:/.*/,namespace:'site'},a=>({contents:a.path==='sites'?"export const nicheOrigin=p=>'https://'+p.canonicalHost;export const nichePagePath=p=>p.slug?'/'+p.slug:'/';export const publicNichePages=p=>p.pages;":`export const nicheNetworkContact=()=>({operatorName:${JSON.stringify(network.operatorName)}});`,loader:'js'}));
}}]});
const all=[];async function files(root,relative=''){for(const name of await readdir(root)){const next=path.join(root,name),r=path.posix.join(relative,name);if((await stat(next)).isDirectory())await files(next,r);else all.push('/'+r);}}await files(assets);
if(all.some(file=>/profile-\d|demo-org-/.test(file)))throw Error('Stale fixture assets in output; rebuild in a clean private output directory');
await writeFile(path.join(output,'asset-paths.json'),JSON.stringify(all));
console.log(JSON.stringify({state:'candidate-built-not-deployed',approvedPages:pkg.pages.length,assets:all.length,packageSha256:createHash('sha256').update(raw).digest('hex')}));
