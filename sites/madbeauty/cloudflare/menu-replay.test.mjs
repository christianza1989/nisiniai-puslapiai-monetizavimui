import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const runtime=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting'),{build}=await import(pathToFileURL(path.join(runtime,'node_modules/esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(path.join(runtime,'node_modules/miniflare/dist/src/index.js'))),plain=value=>JSON.parse(JSON.stringify(value));
test('Actual main Worker menu create and edit recover lost target replies through two-store restarts without extra groups or versions',async()=>{
 const bundle=await build({stdin:{resolveDir:import.meta.dirname,sourcefile:'isolated-menu-replay.mjs',contents:`
  import actualWorker from './worker.mjs';
  import {MadbeautyPlatform} from './platform-object.mjs';
  import {MadbeautyOrganizationStaging} from './organization-object.mjs';
  import {createAuth} from '../backend/auth.mjs';
  import {createPlatform} from '../backend/platform.mjs';
  import {createOrganizationDirectory} from '../backend/organization-directory.mjs';
  export class MenuSource extends MadbeautyPlatform{
   constructor(ctx,env){super(ctx,env);this.store.db.exec('CREATE TABLE IF NOT EXISTS qa_menu(key TEXT PRIMARY KEY,value TEXT NOT NULL);');}
   async setup(){const old=this.store.db.prepare("SELECT value FROM qa_menu WHERE key='fixture'").get();if(old)return JSON.parse(old.value);
    const owner={id:'menu-workers-owner',email:'menu-workers-owner@example.com',name:'Isolated menu owner'};this.store.db.prepare('INSERT INTO accounts(id,site_id,email,name,operator,created_at) VALUES(?,?,?,?,1,?)').run(owner.id,this.store.siteId,owner.email,owner.name,Date.now());this.store.ensureClient(owner.id);const auth=createAuth(this.store),session=auth.session(null);this.store.db.prepare('UPDATE sessions SET account_id=? WHERE token_hash=?').run(owner.id,session.token_hash);
    const org=createPlatform(this.store).createOrganization(owner,{name:'Isolated menu replay',kind:'solo',city:'Vilnius',bio:'Synthetic replay acceptance'}),frozen=await this.freezeOrganization({operatorAccountId:owner.id,organizationId:org.id,epoch:0,requestKey:'menu-handoff'}),control={operatorAccountId:owner.id,organizationId:org.id,epoch:frozen.epoch,handoffId:frozen.handoffId},target=this.env.ORGANIZATION_STAGING.get(this.env.ORGANIZATION_STAGING.idFromName(frozen.targetName));let offset=0;for(;;){const page=await this.organizationHandoffPage({...control,offset});await target.stage(page);if(page.done)break;offset=page.nextOffset;}const receipt=await target.prepareAuthority(await this.organizationHandoffContext(control));await target.activateAuthority(await this.sealOrganizationHandoff({...control,targetReceipt:receipt}));
    const info={owner,org,token:session.token,csrf:session.csrf,targetName:frozen.targetName};this.store.db.prepare("INSERT INTO qa_menu VALUES('fixture',?)").run(JSON.stringify(info));return info;
   }
   arm(){this.store.db.prepare("INSERT INTO qa_menu VALUES('lose','1') ON CONFLICT(key) DO UPDATE SET value='1'").run();}
   directory(){return createOrganizationDirectory(this.store,{getTarget:name=>{const target=this.env.ORGANIZATION_STAGING.get(this.env.ORGANIZATION_STAGING.idFromName(name));return {executeDirectoryCommand:async packet=>{const response=await target.executeDirectoryCommand(packet);if(packet.method==='saveMenuGroup'&&!response.error&&this.store.db.prepare("SELECT value FROM qa_menu WHERE key='lose'").get()?.value==='1'){this.store.db.prepare("UPDATE qa_menu SET value='0' WHERE key='lose'").run();throw Error('Isolated committed menu reply loss');}return response;}};}});}
  }
  export class MenuTarget extends MadbeautyOrganizationStaging{
   stats(){const d=this.store.readCollections(['menuGroups','events','idempotency']);return {groups:d.menuGroups,events:d.events.filter(e=>e.type==='menu-group-saved'),replays:Object.values(d.idempotency).filter(x=>x.result?.id?.startsWith('menu-group_')),sessions:this.store.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n};}
  }
  export default actualWorker;
 `},write:false,bundle:true,format:'esm',platform:'node',external:['cloudflare:*'],loader:{'.sql':'text','.html':'text'}}),dir=await mkdtemp(path.join(os.tmpdir(),'madbeauty-menu-workers-')),origin='https://menu-workers.test',start=()=>new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'MenuSource',useSQLite:true},ORGANIZATION_STAGING:{className:'MenuTarget',useSQLite:true}},durableObjectsPersist:dir,bindings:{APP_ORIGIN:origin,RELEASE_MODE:'preview',SESSION_SECRET:'isolated-menu-workers-secret'.repeat(2)}});let mf=start();
 const source=async()=>{const ns=await mf.getDurableObjectNamespace('PLATFORM');return ns.get(ns.idFromName('madbeauty-pilot-v1'));};
 try{
  const info=plain(await(await source()).setup()),target=async()=>{const ns=await mf.getDurableObjectNamespace('ORGANIZATION_STAGING');return ns.get(ns.idFromName(info.targetName));},stats=async()=>plain(await(await target()).stats()),call=async input=>{const response=await mf.dispatchFetch(origin+'/api/madbeauty/rpc',{method:'POST',headers:{cookie:'__Host-madbeauty_sid='+info.token,origin,'x-csrf-token':info.csrf,'content-type':'application/json'},body:JSON.stringify({method:'saveMenuGroup',input})});return {status:response.status,value:await response.json()};},input={organizationId:info.org.id,label:'Isolated recoverable group',rank:4,idempotencyKey:'native-create-key'};
  await(await source()).arm();assert.equal((await call(input)).status,503);const created=await stats();assert.equal(created.groups.length,1);assert.equal(created.events.length,1);assert.equal(created.replays.length,1);assert.equal(created.sessions,0);
  await mf.dispose();mf=start();const recovered=await call(input);assert.equal(recovered.status,200);assert.deepEqual(recovered.value.result,created.groups[0]);assert.deepEqual(await stats(),created);assert.equal((await call({...input,label:'Different payload'})).value.error.code,'IDEMPOTENCY_CONFLICT');
  const edit={...input,id:created.groups[0].id,version:1,label:'Isolated updated group',idempotencyKey:'native-edit-key'};await(await source()).arm();assert.equal((await call(edit)).status,503);const edited=await stats();assert.equal(edited.groups.length,1);assert.equal(edited.groups[0].version,2);assert.equal(edited.events.length,2);assert.equal(edited.replays.length,2);
  await mf.dispose();mf=start();assert.equal((await call(edit)).status,200);assert.deepEqual(await stats(),edited);assert.equal((await call({...edit,idempotencyKey:'new-stale-key'})).value.error.code,'VERSION_CONFLICT');assert.deepEqual(await stats(),edited);
 }finally{await mf.dispose();const absolute=path.resolve(dir);if(absolute.startsWith(path.resolve(os.tmpdir())+path.sep+'madbeauty-menu-workers-'))await rm(absolute,{recursive:true,force:true});}
});
