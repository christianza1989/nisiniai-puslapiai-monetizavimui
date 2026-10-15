import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {build}=await import(pathToFileURL(path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting/node_modules/esbuild/lib/main.js')));
const result=await build({entryPoints:[path.join(import.meta.dirname,'public/offer-admin.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-root',setup(b){b.onResolve({filter:/^\/(demo-model|cities|taxonomy|seo-contract)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {bindProcedureModeration,bindTaxonomyParent,offerAdminForm}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const editor=await build({entryPoints:[path.join(import.meta.dirname,'public/offer-editor.mjs')],write:false,bundle:true,format:'esm',platform:'node',plugins:[{name:'public-root',setup(b){b.onResolve({filter:/^\/(demo-model|cities|taxonomy|seo-contract)\.mjs$/},a=>({path:path.join(import.meta.dirname,a.path.slice(1))}));}}]});
const {procedureRequestHistory,offerAction}=await import('data:text/javascript;base64,'+Buffer.from(editor.outputFiles[0].text).toString('base64'));
test('Rejecting a procedure request needs only a reason; switching back restores required explicit mapping and retains its version',async()=>{
 const decision={value:'resolved'},field={},target={value:'procedure',closest:()=>field},submit={};let changed,received;
 const form={id:'procedure-moderation',elements:{namedItem:name=>name==='state'?decision:target},querySelector:()=>submit,addEventListener:(_,fn)=>changed=fn};
 bindProcedureModeration(form);assert.equal(target.required,true);assert.equal(target.disabled,false);assert.equal(field.hidden,false);
 decision.value='rejected';changed();assert.equal(target.required,false);assert.equal(target.disabled,true);assert.equal(field.hidden,true);assert.equal(submit.textContent,'Atmesti prašymą');
 const fd=new FormData();fd.set('state','rejected');fd.set('reason','Reikia patikslinti.');let closed=0;
 const ctx={reviewingProcedure:{id:'request',version:4},adapter:{moderateProcedure:async input=>received=input},closeDialog:()=>closed++,toast:()=>{},render:async()=>{}};
 assert.equal(await offerAdminForm(ctx,form,fd),true);assert.deepEqual(received,{id:'request',version:4,state:'rejected',reason:'Reikia patikslinti.'});assert.equal(closed,1);
 decision.value='resolved';changed();assert.equal(target.required,true);assert.equal(target.disabled,false);assert.equal(field.hidden,false);assert.equal(target.value,'procedure');assert.equal(submit.textContent,'Susieti prašymą');
});
test('Catalogue parents follow the selected hierarchy level, clear incompatible choices and omit the parent for a new category',()=>{
 const nodes=[{id:'category',kind:'category',path:['Kategorija']},{id:'group',kind:'group',path:['Kategorija','Grupė <b>']},{id:'archived',kind:'group',archived:true,path:['Neaktyvi']},{id:'procedure',kind:'treatment',path:['Procedūra']}],kind={value:'treatment'},field={},parent={value:'group',closest:()=>field};let changed;
 const form={elements:{namedItem:name=>name==='kind'?kind:parent},addEventListener:(_,fn)=>changed=fn};
 bindTaxonomyParent(form,nodes);assert.match(parent.innerHTML,/value="group"/);assert.doesNotMatch(parent.innerHTML,/value="category"|value="archived"|value="procedure"/);assert.match(parent.innerHTML,/Grupė &lt;b&gt;/);assert.equal(parent.value,'group');assert.equal(parent.required,true);
 kind.value='group';changed();assert.match(parent.innerHTML,/value="category"/);assert.doesNotMatch(parent.innerHTML,/value="group"/);assert.equal(parent.value,'');
 kind.value='category';changed();assert.equal(parent.disabled,true);assert.equal(parent.required,false);assert.equal(field.hidden,true);
 kind.value='treatment';changed();assert.equal(parent.disabled,false);assert.equal(parent.required,true);assert.equal(field.hidden,false);assert.equal(parent.value,'');
});
test('Professional request history shows saved decisions and mapping, escapes provider text and each new form starts with its own retry identity',async()=>{
 let html;const ctx={adapter:{mode:'real'},workspace:{},catalogueNodes:[{id:'procedure',path:['Nagai','Lakavimas','Procedūra']}],openDialog:(_,body)=>html=body};
 const rendered=procedureRequestHistory(ctx,{procedureRequests:[{label:'Pending <b>',description:'Description <img>',state:'pending',createdAt:'2026-10-06'},{label:'Rejected',description:'Details',state:'rejected',reason:'Reason <script>',createdAt:'2026-10-07'},{label:'Mapped',description:'Details',state:'resolved',targetId:'procedure',createdAt:'2026-10-08'}]});
 assert.match(rendered,/Laukia peržiūros/);assert.match(rendered,/Prašymas atmestas/);assert.match(rendered,/Susietas su katalogu/);assert.match(rendered,/Nagai → Lakavimas → Procedūra/);assert.match(rendered,/Pending &lt;b&gt;/);assert.match(rendered,/Reason &lt;script&gt;/);assert.doesNotMatch(rendered,/<img>|<script>|<b>/);assert.ok(rendered.indexOf('Mapped')<rendered.indexOf('Rejected'));assert.equal(procedureRequestHistory(ctx,{}),'');
 await offerAction(ctx,'request-procedure',{dataset:{}});const key=html.match(/name="idempotencyKey" value="([^"]+)"/)[1];assert.match(key,/^[a-f0-9-]{36}$/);
 await offerAction(ctx,'request-procedure',{dataset:{}});assert.notEqual(html.match(/name="idempotencyKey" value="([^"]+)"/)[1],key);
});
