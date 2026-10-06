// Verified private shadow intake through the existing common importer.
import {mkdir,readFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyContentRelease} from '../../../content-studio/src/content-release.mjs';
import {admitMadbeautyPackage} from '../content/intake.mjs';
import {createAppServer} from '../prototype/app-server.mjs';
import {openStore} from '../backend/store.mjs';
import {createApiHandler} from '../backend/http.mjs';
const args=process.argv.slice(2),release=args[0]?path.resolve(args[0]):null,readArg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
if(!release)throw Error('Usage: preview-release.mjs <release-directory> --expected-sha256 <sha> [--port 8824]');
const core=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting'),raw=await readFile(path.join(release,'content-package.json')),digest=createHash('sha256').update(raw).digest('hex');
if(readArg('--expected-sha256')!==digest)throw Error('Exact reviewed release SHA required');
const {validateContentPackage}=await import(pathToFileURL(path.join(core,'scripts/content-package-core.mjs')));
const network=JSON.parse(await readFile(path.join(core,'config/niche-network.json'),'utf8')),contact={operatorName:network.contactsBySite?.madbeauty?.operatorName||network.operatorName,email:network.contactsBySite?.madbeauty?.email||network.defaultEmail};
const pkg=admitMadbeautyPackage(validateContentPackage(JSON.parse(raw)),contact);await verifyContentRelease(release,validateContentPackage);
const sandbox=path.resolve(import.meta.dirname,'../runtime/output/content-foundation/shadow',digest);
for(const file of ['scripts/import-content-package.mjs','scripts/content-package-core.mjs','scripts/content-package-v2.mjs','scripts/content-v2-admission.mjs','schemas/content-package.v2.schema.json']){const target=path.join(sandbox,file);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(core,file),target);}
const imported=spawnSync(process.execPath,[path.join(sandbox,'scripts/import-content-package.mjs'),release,'--shadow','--replace'],{cwd:sandbox,encoding:'utf8',windowsHide:true});
if(imported.error||imported.status!==0)throw Error(imported.error?.message||imported.stderr||'Common shadow import failed');
const contentPackagePath=path.join(sandbox,'content-staging',pkg.siteId,'content-package.json'),port=Number(readArg('--port')||8824);
const store=openStore({filename:':memory:',secret:'private-editorial-preview-not-production'.repeat(2)}),apiHandler=createApiHandler(store,{origin:'http://127.0.0.1:'+port}),server=createAppServer({apiHandler,contentPackagePath,enabled:false});server.on('close',()=>store.close());
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({state:'verified-private-shadow-not-deployed',url:'http://127.0.0.1:'+server.address().port,packageSha256:digest,contentPackagePath,commerceTargetsReady:false})));
