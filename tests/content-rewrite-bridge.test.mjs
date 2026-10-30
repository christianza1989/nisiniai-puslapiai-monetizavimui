import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {runOnce,openState,sha256,reviewedPayload,bridgeRequest,taskText} from '../scripts/content-rewrite-bridge.mjs';

test('writer receives pinned site terminology and separately numbered selected fields',()=>{
 const job={id:randomUUID(),etag:'base:2',mode:'selection',note:'Fixture correction',snapshot:{siteId:'promedical',type:'guide',slug:'gidai/fixture',title:'Fixture',description:'Fixture description',body:[{type:'heading',level:2,text:'Kreipiančiųjų bėgelių tipai'},{type:'paragraph',text:'Krepšiai įstatomi į kreipiančiąsias.'}]},selection:{ranges:[{from:'body.0.text',quote:'Kreipiančiųjų bėgelių tipai'},{from:'body.1.text',quote:'Krepšiai įstatomi į kreipiančiąsias.'}]},rules:[{id:'fixture',term:'kreipianč',instruction:'Vartoti bėgeliai.'}]};
 const text=taskText(job,'004');assert.match(text,/Dalis 1 \(body\.0\.text\):\nKreipiančiųjų/);assert.match(text,/Dalis 2 \(body\.1\.text\)/);assert.match(text,/Nenaudoti „kreipianč“/);assert.match(text,/JSON masyvą/);assert(!text.includes('undefined'));assert(text.endsWith('--- PABAIGA ---\n'));
 const single=taskText({...job,selection:job.selection.ranges[0]},'005');assert.match(single,/tik pažymėtos dalies pakaitinį tekstą/);assert(!single.includes('JSON masyvą'));
});

test('file bridge preserves trial, retries stable task, waits for hash-bound double review, recovers ambiguous import',async()=>{
 const dir=await fs.mkdtemp(path.resolve('output/bridge-test-'));const root=path.join(dir,'writer'),state=path.join(dir,'bridge.sqlite');
 await fs.mkdir(path.join(root,'uzduotys'),{recursive:true});await fs.mkdir(path.join(root,'atsakymai'));await fs.writeFile(path.join(root,'RASYTOJAS.md'),'isolated fixture');
 const trial='Užduotis001\n--- PABAIGA ---\n';await fs.writeFile(path.join(root,'uzduotys/001-iso.md'),trial);
 const job={id:randomUUID(),seq:1,pageId:'page',etag:'base:0',mode:'whole',note:'Trumpiau.',state:'queued',snapshot:{id:'page',siteId:'promedical',type:'product',slug:'produktai/test',title:'Spinta',description:'Aprašymas',body:[{type:'paragraph',text:'Tikras testinis tekstas.'}],externalLinks:[]}};
 let imported=0,ambiguous=true,notified=0,receipt;
 const request=async(route,payload)=>{
  if(route==='list')return {items:payload.after===0&&job.state==='queued'?[job]:[],next:payload.after===0&&job.state==='queued'?1:null};
  if(route.endsWith('/status'))return job;
  assert.equal(route,job.id+'/draft');if(!receipt){imported++;receipt={id:job.id,state:'drafted',etag:'base:1'};job.state='drafted';}
  if(ambiguous){ambiguous=false;throw Error('Response lost after server commit');}return {...receipt,replayed:true};
 };
 const run=()=>runOnce({root,state,request,notify:async()=>{notified++}});
 let r=await run();assert.equal(r.exported,1);assert.equal((await run()).exported,0);
 assert.deepEqual(await fs.readdir(path.join(root,'uzduotys')),['001-iso.md','002-rewrite.md']);assert.equal(await fs.readFile(path.join(root,'uzduotys/001-iso.md'),'utf8'),trial);
 const answer='Atsakymas į: 002\nModelis: fixture\nNaujas patikrintas tekstas.\n--- PABAIGA ---\n';
 await fs.writeFile(path.join(root,'atsakymai/002-atsakymas.md'),answer.slice(0,-20));await run();assert.equal(notified,0);assert.equal(imported,0);
 await fs.writeFile(path.join(root,'atsakymai/002-atsakymas.md'),answer);await run();await run();assert.equal(notified,1);assert.equal(imported,0);
 const review=JSON.stringify({jobId:job.id,etag:job.etag,answerSha256:sha256(answer),reviewer:'Codex',verdict:'PASS',checks:{facts:true,core:true,links:true,language:true},evidence:'Isolated fixture facts matched the supplied source.',candidate:{changes:{title:'Spinta',description:'Patikrinta.',body:[{type:'paragraph',text:'Naujas patikrintas tekstas.'}]}}});
 await fs.writeFile(path.join(root,'patikra/002-codex.json'),review);await run();assert.equal(imported,0);
 const approval=`Atsakymas į: 002\nUžduotis: ${job.id}\nAtsakymo SHA256: ${sha256(answer)}\nCodex patikros SHA256: ${sha256(review)}\nPatvirtino: Claude\nSprendimas: GERAI\n--- PABAIGA ---\n`;
 await fs.writeFile(path.join(root,'atsakymai/002-patvirtinta.md'),approval.replace(sha256(answer),'0'.repeat(64)));r=await run();assert.equal(r.blocked.length,1);assert.equal(imported,0);
 await fs.writeFile(path.join(root,'atsakymai/002-patvirtinta.md'),approval);r=await run();assert.equal(r.blocked.length,1);assert.equal(imported,1);
 r=await run();assert.equal(r.imported,1);assert.equal(imported,1);assert.equal((await run()).imported,0);
 assert.match(await fs.readFile(path.join(root,'patikra/002-ikelta.md'),'utf8'),/base:1/);
 await fs.unlink(path.join(root,'patikra/002-ikelta.md'));await run();assert.match(await fs.readFile(path.join(root,'patikra/002-ikelta.md'),'utf8'),/base:1/);
 assert.throws(()=>reviewedPayload(job,'002',answer+'tampered',review,approval));
 assert.throws(()=>reviewedPayload(job,'002',answer,review.replace('Patikrinta.','Pakeista.'),approval));
 const db=openState(state);assert.equal(db.prepare('SELECT count(*) AS n FROM jobs').get().n,1);db.close();
 console.log('Fixture retained at '+dir);
});
test('bridge rejects live lock and never follows redirects',async()=>{
 const dir=await fs.mkdtemp(path.resolve('output/bridge-test-')),state=path.join(dir,'bridge.sqlite');
 await fs.writeFile(state+'.lock',JSON.stringify({pid:process.pid}));await assert.rejects(()=>runOnce({root:dir,state,request:()=>{throw Error('must not poll')}}),/jau veikia/);
 assert.throws(()=>bridgeRequest('http://promedical.lt','a'.repeat(43)));
 const request=bridgeRequest('https://promedical.lt','a'.repeat(43),async(url,options)=>{assert.equal(options.redirect,'error');assert.equal(url,'https://promedical.lt/admin/api/rewrite-bridge/list');return Response.json({items:[],next:null})});
 await request('list',{});await assert.rejects(()=>request('../publish',{}),/Neleidžiamas/);
});

test('partial task recovery preserves the reservation and uncertain notifications never become false sent receipts',async()=>{
 const dir=await fs.mkdtemp(path.resolve('output/bridge-test-')),state=path.join(dir,'state.sqlite'),root=path.join(dir,'writer');
 await fs.mkdir(path.join(root,'uzduotys'),{recursive:true});await fs.mkdir(path.join(root,'atsakymai'));await fs.writeFile(path.join(root,'RASYTOJAS.md'),'fixture');
 const job={id:randomUUID(),seq:1,etag:'base:0',mode:'whole',snapshot:{siteId:'promedical',type:'product',slug:'test',title:'Test',description:'Test',body:[]}};
 const request=async(route,input)=>{assert.equal(route,'list');return input.after?{items:[],next:null}:{items:[job],next:1}};
 await runOnce({root,state,request});const filename=path.join(root,'uzduotys/001-rewrite.md'),original=await fs.readFile(filename,'utf8');
 let db=openState(state);db.prepare("UPDATE jobs SET state='exporting'").run();db.close();await fs.writeFile(filename,original.slice(0,80));
 await runOnce({root,state,request});assert.equal(await fs.readFile(filename,'utf8'),original);
 db=openState(state);db.prepare("UPDATE jobs SET state='exporting'").run();db.close();await fs.writeFile(filename,'Foreign file\n--- PABAIGA ---\n');
 await assert.rejects(()=>runOnce({root,state,request}),/Failo konfliktas/);assert.match(await fs.readFile(filename,'utf8'),/^Foreign file/);
 await fs.writeFile(filename,original);await runOnce({root,state,request});
 const answer='Atsakymas į: 001\nModelis: fixture\nFirst\n--- PABAIGA ---\n';await fs.writeFile(path.join(root,'atsakymai/001-atsakymas.md'),answer);
 let notices=0;const failed=await runOnce({root,state,request,notify:async()=>{notices++;throw Error('uncertain dispatch')}});assert.equal(failed.blocked.length,1);
 await runOnce({root,state,request,notify:async()=>{notices++}});assert.equal(notices,1);
 await fs.writeFile(path.join(root,'atsakymai/001-atsakymas.md'),answer.replace('First','Second'));await runOnce({root,state,request,notify:async()=>{notices++}});assert.equal(notices,2);
 db=openState(state);assert.equal(db.prepare("SELECT count(*) n FROM notices WHERE state='dispatching'").get().n,1);assert.equal(db.prepare("SELECT count(*) n FROM notices WHERE state='sent'").get().n,1);db.close();
});
