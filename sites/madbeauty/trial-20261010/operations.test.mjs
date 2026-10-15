import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {trialOrigin,trialBrowser,verifyTrialOperations} from './operations-accept.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),core=path.resolve(repo,'../dovanos-memorycasting');
const {Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
test('Native temporary server operations use real offers, calendars, roles and customer controls',async()=>{
 const mf=new Miniflare({modules:true,script:await readFile(new URL('output/worker.mjs',import.meta.url),'utf8'),compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],
  durableObjects:{PLATFORM:{className:'TemporaryTestPlatform',useSQLite:true}},images:{binding:'IMAGES'},
  bindings:{APP_ORIGIN:trialOrigin,RELEASE_MODE:'temporary-live-test',TRIAL_EXPIRES_AT:new Date(Date.now()+86400000).toISOString(),SESSION_SECRET:'isolated-native-operations-test-key-at-least-thirty-two-characters'},
  serviceBindings:{ASSETS:async request=>{try{return new Response(await readFile(new URL('output/assets'+new URL(request.url).pathname,import.meta.url)));}catch{return new Response('Not found',{status:404});}}}});
 try{const proof=await verifyTrialOperations(()=>trialBrowser((url,init)=>mf.dispatchFetch(url,init)));await writeFile(new URL('output/operations-native.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');assert.equal(proof.state,'PASS',JSON.stringify({error:proof.error,checks:proof.checks,cleanup:proof.cleanup}));}
 finally{await mf.dispose();}
});
