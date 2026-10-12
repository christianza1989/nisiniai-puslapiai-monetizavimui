// Explicit sandbox-only policy update. Existing orders, stock and history stay intact.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {NodeDatabase} from '../../commerce-core/src/node-db.mjs';
import {validateStore} from '../../commerce-core/src/validation.mjs';
const release=JSON.parse(await readFile(new URL('./LATEST-RELEASE.json',import.meta.url),'utf8'));
const raw=await readFile(release.path),pkg=JSON.parse(raw);
if(pkg.siteId!=='memocasting'||pkg.canonicalHost!=='memocasting.lt'||createHash('sha256').update(raw).digest('hex')!==release.packageSha256)throw Error('Release mismatch');
const countries={LT:'',PL:'pl/',LV:'lv/',EE:'et/'};
const policies=Object.entries(countries).map(([country,prefix])=>{
 const page=pkg.pages.find(p=>p.slug===prefix+'naudojimo-salygos');
 if(!page||page.approval?.status!=='approved'||page.approval.revisionHash!==page.revisionHash)throw Error('Unapproved terms '+country);
 return {country,language:prefix?prefix.slice(0,-1):'lt',policyVersion:page.revisionHash,url:'/'+page.slug};
});
const manifest={state:'APPROVED_CONTENT_FOR_LOCAL_TEST_ONLY',packageSha256:release.packageSha256,policies,legalAdmission:false,productionActive:false};
await writeFile(new URL('./CHECKOUT-POLICIES.json',import.meta.url),JSON.stringify(manifest,null,2));
const db=new NodeDatabase(fileURLToPath(new URL('./runtime/commerce-07-8827/store.sqlite',import.meta.url)));
try{
 const row=await db.prepare('SELECT environment,config_json FROM stores WHERE id=?').bind('memocasting_local_07_8827').first();
 if(!row)throw Error('Owned fixture not provisioned');
 const config=JSON.parse(row.config_json);
 if(row.environment!=='sandbox'||config.environment!=='sandbox'||config.testOnly!==true||config.hosts.length!==1||config.hosts[0]!=='127.0.0.1:8827')throw Error('Not the owned isolated fixture');
 for(const market of config.markets){const policy=policies.find(p=>p.country===market.country);if(!policy)throw Error('Unknown market');market.policyVersion=policy.policyVersion;}
 validateStore(config);
 await db.prepare('UPDATE stores SET config_json=? WHERE id=? AND environment=?').bind(JSON.stringify(config),config.id,'sandbox').run();
 console.log(JSON.stringify({state:manifest.state,policies:policies.length,packageSha256:release.packageSha256,productionActive:false}));
}finally{db.close();}
