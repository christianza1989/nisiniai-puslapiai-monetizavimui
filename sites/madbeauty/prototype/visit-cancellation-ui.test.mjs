import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {build}=await import(pathToFileURL(path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting/node_modules/esbuild/lib/main.js')));
const bundle=await build({entryPoints:[path.join(import.meta.dirname,'public/workspace-ui.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-module-roots',setup(b){b.onResolve({filter:/^\/(cities|taxonomy|seo-contract|demo-model|catalogue-page)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {workspaceAction,workspaceForm}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('Whole cancellation explains both saved segments and retains the original version after an unavailable or stale save',async()=>{
 const b={id:'whole-visit',version:1,startAt:'2026-10-09T16:00:00Z',endAt:'2026-10-09T17:00:00Z',durationMin:60,priceMinor:4500,segments:[{startAt:'2026-10-09T16:00:00Z',endAt:'2026-10-09T16:30:00Z',priceMinor:2000,serviceSnapshot:{label:'First <saved>',practitionerName:'One'}},{startAt:'2026-10-09T16:30:00Z',endAt:'2026-10-09T17:00:00Z',priceMinor:2500,serviceSnapshot:{label:'Second & saved',practitionerName:'Two'}}]};
 let title,html,closed=0,rendered=0,currentVersion=1,unavailable=true;const writes=[];
 const ctx={taxonomy:[],catalogueNodes:[],workspace:{bookings:[b]},state:{session:{role:'customer'}},adapter:{mode:'real',cancelBooking:async input=>{writes.push(input);if(unavailable)throw Error('Unavailable');if(input.version!==currentVersion)throw Error('Stale');currentVersion++;}},openDialog:(t,h)=>{title=t;html=h;},closeDialog:()=>closed++,toast(){},render:async()=>rendered++};
 await workspaceAction(ctx,'cancel-visit',{dataset:{id:b.id}});
 assert.equal(title,'Atšaukti visą vizitą');assert.match(html,/Atšauksi visas 2 paslaugas/);assert.match(html,/19:00–20:00/);assert.match(html,/60 min\./);assert.match(html,/45,00/);assert.match(html,/First &lt;saved&gt;/);assert.match(html,/Second &amp; saved/);assert.match(html,/Atšaukti visas paslaugas/);
 const fd=new FormData();fd.set('reason','My retained explanation');await assert.rejects(workspaceForm(ctx,{id:'cancel-visit'},fd),/Unavailable/);assert.equal(closed,0);assert.equal(rendered,0);assert.equal(ctx.dialogBooking.version,1);
 unavailable=false;currentVersion=2;await assert.rejects(workspaceForm(ctx,{id:'cancel-visit'},fd),/Stale/);assert.equal(closed,0);assert.equal(rendered,0);assert.deepEqual(writes.map(w=>[w.id,w.version,w.reason]),[[b.id,1,'My retained explanation'],[b.id,1,'My retained explanation']]);
 ctx.workspace.bookings=[{...b,version:2}];await workspaceAction(ctx,'cancel-visit',{dataset:{id:b.id}});await workspaceForm(ctx,{id:'cancel-visit'},fd);assert.equal(writes[2].version,2);assert.equal(closed,1);assert.equal(rendered,1);
 ctx.workspace.bookings=[{...b,id:'single',segments:undefined}];await workspaceAction(ctx,'cancel-visit',{dataset:{id:'single'}});assert.equal(title,'Atšaukti vizitą');assert.match(html,/Atšaukti šį vizitą/);assert.doesNotMatch(html,/visas 2/);
});
