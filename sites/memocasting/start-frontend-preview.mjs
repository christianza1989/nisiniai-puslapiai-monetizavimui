// Standard Wrangler local bindings beside the built config; no public activation.
import fs from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
export function memoPreviewBackendAllowed(context,{stripeTest=false}={}){
 const isolated=context?.environment==='sandbox'&&context.testOnly===true&&context.shippingConnected===false&&context.shippingQuotesConnected===false&&context.productionReady===false&&context.publishOffers===false;
 if(!isolated)return false;
 return stripeTest?context.schemaVersion===1&&context.paymentConnected===true&&context.paymentProvider==='stripe'&&context.paymentEnvironment==='test'&&context.paymentAccountVerified===true:context.paymentConnected===false;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
const publicRoot=fileURLToPath(new URL('../../../dovanos-memorycasting/',import.meta.url));
const response=await fetch('http://127.0.0.1:8827/api/storefront-context',{signal:AbortSignal.timeout(5000)});
if(!response.ok)throw Error('Start the authorized local sandbox backend on8827 first.');
const context=await response.json();
const stripeTest=process.argv.includes('--stripe-test');
if(process.argv.slice(2).some(arg=>arg!=='--stripe-test'))throw Error('Unknown preview option.');
if(!memoPreviewBackendAllowed(context,{stripeTest}))throw Error('Local preview refuses a non-sandbox or unverified provider context.');
const directory=new URL('../../../dovanos-memorycasting/dist/server/',import.meta.url);
await fs.access(new URL('wrangler.json',directory));
const file=new URL('.dev.vars',directory);
let local='';try{local=await fs.readFile(file,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
for(const [key,value] of [['NICHE_DEV_SITE_ID','memocasting'],['MEMO_COMMERCE_ORIGIN','http://127.0.0.1:8827']]){
 const expression=new RegExp('^'+key+'=.*$','m'),line=key+'="'+value+'"';
 local=expression.test(local)?local.replace(expression,line):local+(local&&!local.endsWith('\n')?'\n':'')+line+'\n';
}
await fs.writeFile(file,local);
const child=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--inspector-port','0','--port','8817'],{cwd:publicRoot,stdio:'inherit',windowsHide:true});
child.on('error',()=>{console.error('Local preview process could not start.');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
process.on('SIGINT',()=>child.kill('SIGINT'));
}
