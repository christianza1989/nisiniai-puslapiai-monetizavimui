import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {RETENTION_POLICY} from '../backend/retention-policy.mjs';
import {verifyTrialRetention} from './retention-accept.mjs';
import {trialBrowser,trialOrigin} from './operations-accept.mjs';
const core=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting'),{Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
test('Compiled temporary trial applies approved erasure to a new disposable customer while seeded identities remain',async()=>{
 const mf=new Miniflare({modules:true,script:await readFile(new URL('output/worker.mjs',import.meta.url),'utf8'),compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'TemporaryTestPlatform',useSQLite:true}},durableObjectsPersist:await mkdtemp(path.join(os.tmpdir(),'madbeauty-trial-retention-')),bindings:{APP_ORIGIN:trialOrigin,RELEASE_MODE:'temporary-live-test',TRIAL_EXPIRES_AT:new Date(Date.now()+86400000).toISOString(),SESSION_SECRET:'isolated-native-trial-retention-test-key-thirty-two-characters',RETENTION_POLICY_VERSION:RETENTION_POLICY.version},serviceBindings:{ASSETS:async()=>new Response('Not found',{status:404})}});
 try{const proof=await verifyTrialRetention(()=>trialBrowser((url,init)=>mf.dispatchFetch(url,init)));assert.equal(proof.state,'PASS');assert.equal(proof.checkCount,6);}finally{await mf.dispose();}
});
