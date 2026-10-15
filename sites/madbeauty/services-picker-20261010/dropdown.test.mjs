import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {TAXONOMY_NODES} from '../prototype/taxonomy.mjs';
const {build}=await import(pathToFileURL(path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting/node_modules/esbuild/lib/main.js')));
const bundled=await build({entryPoints:[path.join(import.meta.dirname,'../prototype/public/search-select.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'browser-root',setup(b){b.onResolve({filter:/^\/(taxonomy|services-media)\.mjs$/},a=>({path:path.join(import.meta.dirname,'../prototype',a.path.slice(1))}));}}]});
const {serviceTree,serviceTreeItems,searchSelect}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const options=[{id:'all',label:'Visos paslaugos'},...TAXONOMY_NODES.filter(n=>n.scope==='core').map(n=>({...n,enabled:true}))];

test('Default tree exposes all categories; expanding every branch keeps every allowed broad/procedure selection exactly once',()=>{
 const model=serviceTree(options),collapsed=serviceTreeItems(model);
 assert.equal(collapsed.length,15);assert.equal(collapsed[0].node.id,'all');assert.ok(collapsed.slice(1).every(r=>r.node.kind==='category'));
 const rows=serviceTreeItems(model,new Set(options.map(n=>n.id))),choices=rows.filter(r=>!r.branch);
 assert.equal(new Set(choices.map(r=>r.node.id)).size,options.length);assert.equal(choices.length,options.length);
 const child=rows.find(r=>r.node.id==='manikiuras-klasikinis-manikiuras');assert.equal(child.level,3);assert.equal(child.parentKey,'branch:manikiuras');
 const broad=rows.find(r=>r.key==='pick:manikiuras');assert.equal(broad.broad,true);assert.equal(broad.level,3);
 for(const row of rows){assert.ok(row.pos>=1&&row.pos<=row.size);}
});

test('Accentless search ranks exact groups first, accepts ancestor words/aliases and keeps clear paths',()=>{
 const model=serviceTree(options),matches=serviceTreeItems(model,new Set(),'manikiuras');
 assert.equal(matches[0].node.id,'manikiuras');assert.ok(matches.some(r=>r.node.id==='manikiuras-klasikinis-manikiuras'));
 const precise=serviceTreeItems(model,new Set(),'nagai klasikinis');assert.equal(precise[0].node.id,'manikiuras-klasikinis-manikiuras');assert.equal(precise[0].path,'Nagai · Manikiūras');
 assert.deepEqual(serviceTreeItems(model,new Set(),'zzzznerandama'),[]);
});

test('Enabled backend extensions stay selectable; disabled and archived choices are excluded, malformed ancestry cannot hide choices',()=>{
 const extra=[{id:'custom',label:'Nauja sritis',kind:'category',enabled:true},{id:'custom-group',label:'Nauja grupė',kind:'group',parentId:'custom',enabled:true,aliases:['unikalus']},{id:'custom-treatment',label:'Nauja procedūra',kind:'treatment',parentId:'custom-group',enabled:true},{id:'disabled',label:'Neleistina',enabled:false},{id:'archived',label:'Archyvas',archived:true},{id:'orphan',label:'Be tėvinės grupės',kind:'treatment',parentId:'missing',enabled:true},{id:'cycle-a',label:'A',parentId:'cycle-b'},{id:'cycle-b',label:'B',parentId:'cycle-a'}];
 const model=serviceTree([...options,...extra]);assert.equal(model.index.has('disabled'),false);assert.equal(model.index.has('archived'),false);
 assert.equal(serviceTreeItems(model,new Set(),'unikalus').find(r=>r.node.id==='custom-treatment').path,'Nauja sritis · Nauja grupė');
 const rows=serviceTreeItems(model,new Set(model.nodes.map(n=>n.id)));assert.equal(rows.filter(r=>!r.branch).length,model.nodes.length);
 assert.equal(model.count('custom'),1);assert.ok(rows.some(r=>r.node.id==='orphan'));
});

test('Service/city combobox semantics and escaped hidden values retain the existing form contract',()=>{
 const service=searchSelect({id:'home-service',name:'paslauga',label:'Paslauga',options:[{id:'safe-id',label:'<img onerror="bad">'}],value:'safe-id'});
 assert.match(service,/aria-haspopup="tree"/);assert.match(service,/name="paslauga" value="safe-id"/);assert.match(service,/&lt;img/);assert.doesNotMatch(service,/<img onerror/);
 const city=searchSelect({id:'home-city',name:'miestas',label:'Miestas',options:[{id:'vilnius',label:'Vilnius'}],value:'vilnius'});assert.match(city,/aria-haspopup="listbox"/);assert.match(city,/name="miestas" value="vilnius"/);
});
