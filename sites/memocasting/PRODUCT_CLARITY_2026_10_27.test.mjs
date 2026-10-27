import test from 'node:test';
import assert from 'node:assert/strict';
import {productClarityChanges} from './PRODUCT_CLARITY_2026_10_27.mjs';

const date='2026-10-11T00:00:00Z';
const p=(id,slug,body=[])=>({id,slug,body,links:[],revisionHash:'revision-'+id,publishAt:date});
const fixture=()=>({pages:[
 p('pair','rinkinys-porai',[
  {type:'paragraph',text:'Tai gali būti bendra veikla dviese, dovana vestuvėms, metinėms ar įkurtuvėms. Dovanodami rinkinį dovanojate ir progą skirti laiko vienas kitam. Nuotraukose matote galimo rezultato bei apdailos pavyzdžius; įsigyjate medžiagų rinkinį savo liejiniui, o ne jau pagamintą skulptūrą.'},
  {type:'heading',text:'Kaip gimsta rankų liejinys?'},{type:'list',items:['Proceso žingsnis']},{type:'heading',text:'Ką pasiruošti prieš pradedant?'}]),
 p('family','seimos-rinkinys',[
  {type:'paragraph',text:'Šeimos komplekte yra du alginato ir du gipso pakeliai. Poros rinkinyje yra vienas alginato pakelis ir 1 200 g gipso. Abiejuose rinkiniuose balti dažai jau įskaičiuoti.'},
  {type:'heading',text:'Nuo atspaudo iki skulptūros'},{type:'paragraph',text:'Proceso aprašas.'},{type:'heading',text:'Balti dažai jau komplekte'}]),
 p('pair-guide','instrukcijos/poros-rinkiniui'),p('family-guide','instrukcijos/seimos-rinkiniui')
]});
test('each specific product gains a comparison and its own timed instruction link without changing the input',()=>{
 const original=fixture(), snapshot=structuredClone(original), rows=productClarityChanges(original,'2026-10-27T10:00:00Z');
 assert.deepEqual(original,snapshot); assert.equal(rows.length,2);
 for(const [index,row] of rows.entries()){
  assert.equal(row.publishAt,date); assert.equal(row.expectedRevisionHash,'revision-'+row.id);
  assert.equal(row.input.body.filter(x=>x.type==='paragraph'&&x.text.includes('vieną valandą')).length,1);
  assert.ok(row.input.body.some(x=>x.text?.includes('5–7 paras')));
  assert.ok(row.input.links.some(x=>x.targetPageId===(index===0?'family':'pair')));
  assert.ok(row.input.links.some(x=>x.targetPageId===(index===0?'pair-guide':'family-guide')));
  for(const l of row.input.links) assert.ok(row.input.body.some(x=>x.text?.includes(l.label)));
 }
});
test('refuses to edit when source wording changes, target is future, or page is missing',()=>{
 const changed=fixture();changed.pages[0].body[0].text='Kitoks turinys';assert.throws(()=>productClarityChanges(changed,'2026-10-27T10:00:00Z'),/original paragraph/);
 const future=fixture();future.pages[3].publishAt='2027-01-01T00:00:00Z';assert.throws(()=>productClarityChanges(future,'2026-10-27T10:00:00Z'),/Not public/);
 const missing=fixture();missing.pages=missing.pages.filter(p=>p.id!=='family');assert.throws(()=>productClarityChanges(missing,'2026-10-27T10:00:00Z'),/Missing page/);
});
