import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {core} from '../release-20261010/pinned-core.mjs';
const {build}=await import(pathToFileURL(path.join(core,'node_modules/esbuild/lib/main.js')));
const prototype=path.resolve(import.meta.dirname,'../prototype');
const bundle=await build({entryPoints:[path.join(prototype,'public/community-ui.mjs')],write:false,bundle:true,platform:'node',format:'esm',plugins:[{name:'public-root-imports',setup(b){b.onResolve({filter:/^\/(taxonomy|cities|seo-contract)\.mjs$/},a=>({path:path.join(prototype,a.path.slice(1))}));}}]});
const {communityForm}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
test('Real form ID shadowing does not prevent comment, save or edit submission; uncertain mutations keep their operation',async()=>{
 const calls=[];let lose=true;const ctx={realAdapter:{session:{user:{id:'test-user'}},community:async(m,v)=>{calls.push({m,v});if(m==='comment'&&lose){lose=false;throw Error('Lost accepted response');}return {};}},closeDialog(){},render:async()=>{},toast(){}};
 const form=name=>({id:{tagName:'INPUT',value:'actual-post'},getAttribute:n=>n==='id'?'community-'+name:null});
 const fd=new FormData();fd.set('author','person:test-author');fd.set('id','actual-post');fd.set('text','Testinis komentaras');
 await assert.rejects(communityForm(ctx,form('comment'),fd));assert.equal(await communityForm(ctx,form('comment'),fd),true);assert.equal(calls[0].v.operation,calls[1].v.operation);assert.equal(calls[1].v.id,'actual-post');
 fd.set('album','Testinis albumas');await communityForm(ctx,form('save'),fd);assert.deepEqual(calls.at(-1).v,{author:'person:test-author',id:'actual-post',saved:true,album:'Testinis albumas'});
 fd.set('version','3');await communityForm(ctx,form('edit'),fd);assert.equal(calls.at(-1).m,'edit');assert.equal(calls.at(-1).v.version,3);
});
test('An uploaded photo stays retryable until its post mutation is confirmed',async()=>{
 let lose=true,completed=0;const operations=[],ctx={realAdapter:{session:{user:{id:'test-user'}},communityUpload:async()=>({asset:{id:'fixture-photo'},intent:{idempotencyKey:'photo-intent'}}),completeCommunityUploads:()=>completed++,community:async(m,v)=>{operations.push(v.operation);if(lose){lose=false;throw Error('Uncertain post response');}return {};}},closeDialog(){},render:async()=>{},toast(){}};
 const fd=new FormData();fd.set('text','Testinis įrašas');fd.set('photos',new File(['test-only'],'fixture.png',{type:'image/png'}));fd.set('photoRights','on');fd.set('photoAlt','Testinė iliustracija');
 const form={getAttribute:()=> 'community-post'};await assert.rejects(communityForm(ctx,form,fd));assert.equal(completed,0);await communityForm(ctx,form,fd);assert.equal(completed,1);assert.equal(operations[0],operations[1]);
});
