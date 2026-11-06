import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntimeTextSharing,runtimeReviewEdits,sharedEditForDefinition} from '../src/lib/text-review-sharing';
import {displayedReviewText} from '../src/lib/text-review-state';
import type {TextDefinition,TextEdit} from '../src/lib/text-review-types';
const binding='value:CBASE=FIVE',original='Five-star base';
const def:TextDefinition={id:'term:base',sourceHash:'canonical-hash',role:'Parinktis',english:original,polish:'',sourceCode:'CBASE=FIVE',suggested:'Pagrindas',context:'Pagrindas',notes:'',current:['Pagrindas'],modelCount:1};
const localDef={...def,id:'runtime:B:'+binding,sourceHash:'unchanged-runtime-hash'};
const model=(category:string,bindings:Record<string,string>={})=>({path:'/produktai/'+category+'/example/',bindings});
const key=(_category:string,id:string)=>id;
const edit:TextEdit={key:def.id,source_hash:def.sourceHash,draft:'Žmogaus pataisytas pagrindas',state:'approved',revision:7,published:'Žmogaus pataisytas pagrindas',published_hash:def.sourceHash,updated_at:'2026-11-06'};
test('new model inherits exact verified common edit without changing definition identity or stored revision/hash',()=>{
 const sharing=createRuntimeTextSharing({A:model('kedes',{[binding]:def.id}),B:model('kedes')},{[def.id]:def},{A:{[binding]:original},B:{[binding]:original}},key);
 const target=sharing.target('kedes',localDef.id)!;assert.equal(target.key,def.id);assert.equal(target.affected,2);
 const mapped=sharedEditForDefinition(localDef,edit,target)!;
 assert.equal(mapped.source_hash,localDef.sourceHash);assert.equal(mapped.published_hash,localDef.sourceHash);assert.equal(mapped.revision,7);
 assert.equal(edit.source_hash,'canonical-hash');assert.equal(localDef.id,'runtime:B:'+binding);
 process.env.TEXT_REVIEW_PROPOSALS='true';process.env.PUBLIC_ORIGIN='https://ergonomic-text-review.pinet-azprekyba.workers.dev';
 assert.equal(displayedReviewText(localDef,mapped,''),edit.draft);
});
test('category, field, original meaning, code-only originals and conflicting old terms prevent accidental sharing',()=>{
 const models={A:model('kedes',{[binding]:def.id}),B:model('rasomieji-stalai-ir-darbo-vietos'),C:model('kedes'),D:model('kedes'),E:model('kedes'),F:model('kedes',{[binding]:'conflict'}),G:model('kedes')};
 const sharing=createRuntimeTextSharing(models,{[def.id]:def,conflict:{...def,id:'conflict',sourceHash:'other'}},{A:{[binding]:original},B:{[binding]:original},C:{'value:CFRAME=FIVE':original},D:{[binding]:'Another meaning'},E:{[binding]:'FIVE'},F:{[binding]:original},G:{[binding]:original}},key);
 assert.equal(sharing.target('kedes','runtime:G:'+binding),undefined);
 assert.equal(sharing.target('kedes','runtime:E:'+binding),undefined);
 assert.equal(sharing.target('kedes','runtime:B:'+binding),undefined);
 assert.notEqual(sharing.target('rasomieji-stalai-ir-darbo-vietos','runtime:B:'+binding)?.key,def.id);
 assert.notEqual(sharing.target('kedes','runtime:C:value:CFRAME=FIVE')?.key,def.id);
 assert.notEqual(sharing.target('kedes','runtime:D:'+binding)?.key,def.id);
});
test('previous model-local edit keeps precedence; explicit local edit wins; stale canonical source remains stale',()=>{
 const target={key:def.id,sourceHash:def.sourceHash,affected:2},legacy={...edit,key:localDef.id,source_hash:localDef.sourceHash,draft:'Tik šiam modeliui'},map=new Map([[def.id,edit],[localDef.id,legacy]]);
 let r=runtimeReviewEdits(localDef,'B',map,target);assert.equal(r.local?.draft,legacy.draft);assert.equal(r.local?.key,'local:B:'+localDef.id);assert.equal(r.global?.draft,edit.draft);
 map.set('local:B:'+localDef.id,{...legacy,key:'local:B:'+localDef.id,draft:'Nauja vietinė pataisa'});
 r=runtimeReviewEdits(localDef,'B',map,target);assert.equal(r.local?.draft,'Nauja vietinė pataisa');
 assert.equal(sharedEditForDefinition(localDef,{...edit,source_hash:'obsolete'},target)?.source_hash,'obsolete');
});
test('new shared storage is stable across model insertion order and never uses runtime definition hash',()=>{
 const originals={A:{[binding]:original},B:{[binding]:original}};
 const a=createRuntimeTextSharing({A:model('kedes'),B:model('kedes')},{},originals,key).target('kedes','runtime:A:'+binding)!;
 const b=createRuntimeTextSharing({B:model('kedes'),A:model('kedes')},{},originals,key).target('kedes','runtime:B:'+binding)!;
 assert.deepEqual(a,b);assert.match(a.key,/^shared-runtime:chairs:/);assert.notEqual(a.sourceHash,localDef.sourceHash);
});
test('missing model original uses only an unambiguous exact-field reference in the same furniture category',()=>{
 const models={A:model('kedes',{[binding]:def.id}),B:model('kedes'),C:model('rasomieji-stalai-ir-darbo-vietos')};
 const sharing=createRuntimeTextSharing(models,{[def.id]:def},{A:{[binding]:original}},key);
 assert.equal(sharing.target('kedes','runtime:B:'+binding)?.key,def.id);
 assert.equal(sharing.target('rasomieji-stalai-ir-darbo-vietos','runtime:C:'+binding),undefined);
 const conflict=createRuntimeTextSharing({...models,D:model('kedes')},{[def.id]:def},{A:{[binding]:original},D:{[binding]:'Different base'}},key);
 assert.equal(conflict.target('kedes','runtime:B:'+binding),undefined);
 assert.equal(sharing.target('kedes','runtime:B:value:CFRAME=FIVE'),undefined);
 const leather='value:FTOPINSERT=LEATHER';
 const materials=createRuntimeTextSharing({A:model('rasomieji-stalai-ir-darbo-vietos',{[leather]:def.id}),B:model('rasomieji-stalai-ir-darbo-vietos')},{[def.id]:def},{A:{[leather]:'Leather'}},key);
 assert.equal(materials.target('rasomieji-stalai-ir-darbo-vietos','runtime:B:'+leather)?.key,def.id);
});
