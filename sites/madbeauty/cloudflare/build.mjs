import {readFile,writeFile,mkdir,copyFile,readdir,stat,mkdtemp,rm,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {admitMadbeautyPackage} from '../content/intake.mjs';
import {verifyContentRelease} from '../../../content-studio/src/content-release.mjs';
import {admitPublicationRelease} from '../content/release-admission.mjs';
const site=path.resolve(import.meta.dirname,'..'),output=path.join(import.meta.dirname,'output');
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const core=arg('--core-root')?path.resolve(arg('--core-root')):path.resolve(site,'../../../dovanos-memorycasting');
const {validateContentPackage}=await import(pathToFileURL(path.join(core,'scripts/content-package-core.mjs')));
const packagePath=arg('--content-package')?path.resolve(arg('--content-package')):path.join(site,'content/initial-release/content-package.json');
const raw=await readFile(packagePath),expectedSha=arg('--expected-sha256')||(arg('--content-package')?null:'dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579');
if(!expectedSha||createHash('sha256').update(raw).digest('hex')!==expectedSha)throw Error('Exact approved immutable release SHA required');
const pkg=validateContentPackage(JSON.parse(raw));
await verifyContentRelease(path.dirname(packagePath),validateContentPackage);
const network=JSON.parse(await readFile(path.join(core,'config/niche-network.json'),'utf8'));
admitMadbeautyPackage(pkg,{operatorName:network.contactsBySite?.madbeauty?.operatorName||network.operatorName,email:network.contactsBySite?.madbeauty?.email||network.defaultEmail});
admitPublicationRelease(pkg);
await mkdir(output,{recursive:true});
// Build an exact asset edition: never carry media/modules from a previous release.
const assets=await mkdtemp(path.join(output,'assets-build-'));
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
for(const name of ['cities.mjs','taxonomy-data.mjs','taxonomy.mjs','content-targets.mjs','catalogue-page.mjs','services-media.mjs','config.mjs','demo-model.mjs','demo-adapter.mjs','platform-domain.mjs','platform-adapter.mjs','seo-contract.mjs','profile-fixtures-v2.mjs'])await copyFile(path.join(site,'prototype',name),path.join(assets,name));
await mkdir(path.join(assets,'content-assets/madbeauty'),{recursive:true});
for(const file of new Set(pkg.pages.flatMap(p=>p.media.map(m=>path.basename(m.src)))))await copyFile(path.join(path.dirname(packagePath),'assets',file),path.join(assets,'content-assets/madbeauty',file));
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js')));
await build({stdin:{contents:`export {projectContentPagesV2} from ${JSON.stringify(path.join(core,'lib/content-projection-v2.mjs'))};export {contentSeoV2} from ${JSON.stringify(path.join(core,'lib/content-seo-v2.mjs'))};`,resolveDir:core,sourcefile:'madbeauty-shared-content.mjs'},outfile:path.join(output,'content-core.mjs'),bundle:true,platform:'neutral',format:'esm'});
await build({entryPoints:[path.join(core,'lib/gift-seo.ts')],outfile:path.join(output,'gift-seo.mjs'),bundle:true,platform:'neutral',format:'esm'});
await build({entryPoints:[path.join(core,'lib/niche-seo.ts')],outfile:path.join(output,'seo.mjs'),bundle:true,platform:'neutral',format:'esm',plugins:[{name:'site-bindings',setup(b){
 b.onResolve({filter:/^@\/lib\/niche-sites$/},()=>({path:'sites',namespace:'site'}));b.onResolve({filter:/^@\/lib\/niche-network$/},()=>({path:'network',namespace:'site'}));
 b.onLoad({filter:/.*/,namespace:'site'},a=>({contents:a.path==='sites'?"export const nicheOrigin=p=>'https://'+p.canonicalHost;export const nichePagePath=p=>p.slug?'/'+p.slug:'/';export const publicNichePages=p=>p.pages;":`export const nicheNetworkContact=()=>({operatorName:${JSON.stringify(network.operatorName)}});`,loader:'js'}));
}}]});
const all=[];async function files(root,relative=''){for(const name of await readdir(root)){const next=path.join(root,name),r=path.posix.join(relative,name);if((await stat(next)).isDirectory())await files(next,r);else all.push('/'+r);}}await files(assets);
if(all.some(file=>/profile-\d|demo-org-/.test(file)))throw Error('Stale fixture assets in output; rebuild in a clean private output directory');
const finalAssets=path.join(output,'assets-release');
if(path.dirname(finalAssets)!==output)throw Error('Invalid build output boundary');
await rm(finalAssets,{recursive:true,force:true});
await rename(assets,finalAssets);
await writeFile(path.join(output,'content-package.json'),raw);
await writeFile(path.join(output,'asset-paths.json'),JSON.stringify(all));
await writeFile(path.join(output,'content-release-receipt.json'),JSON.stringify({schemaVersion:1,siteId:'madbeauty',canonicalOrigin:'https://madbeauty.lt',state:'verified-candidate-not-deployed',builtAt:new Date().toISOString(),packageSha256:expectedSha,contentSchemaVersion:pkg.schemaVersion,approvedPages:pkg.pages.map(p=>({id:p.id,path:'/'+p.slug,revisionHash:p.revisionHash,publishAt:p.publishAt,media:p.media.map(m=>m.src)})),assets:all.length},null,2)+'\n');
console.log(JSON.stringify({state:'candidate-built-not-deployed',approvedPages:pkg.pages.length,assets:all.length,packageSha256:createHash('sha256').update(raw).digest('hex')}));
