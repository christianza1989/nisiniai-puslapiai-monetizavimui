import {test} from 'node:test';import assert from 'node:assert/strict';
import overlays from '../content/verified-chair-finish-v2.json';
import {preparedFinishLabel} from '../src/lib/prepared-finish-label';
import {customerLabel,customerColourLabel} from '../src/lib/customer-names';
test('all thirteen own finish labels show only changed physical parts and original colour marks',()=>{
 const expected={KXLI002WW002:['Sėdynė CUR66167','Sėdynė CSE42','Sėdynės šonai SM07','Galvos atramos 3D audinys RN64089','Atlošo 3D audinys RN64089','Sėdynė SM07','Sėdynės šonai RN60165'],KXEN028WW001:['Atlošas CSE42 · Sėdynė CSE42 · Sėdynės šonai CSE42','Atlošas MLF22 · Sėdynė MLF22 · Sėdynės šonai RN60165','Sėdynės šonai RN60165','Atlošas LDS74','Sėdynė LDS56','Sėdynės šonai LDS74']};
 for(const [code,overlay]of Object.entries(overlays))assert.deepEqual(overlay.qualified.witnesses[0].singles.map(s=>preparedFinishLabel(s.values,overlay.fullBeforeFinish,f=>f,(_f,v)=>v)),expected[code as keyof typeof expected]);
});
test('availability suffix is removed for both upholstery collections and protected colour marks',()=>{
 assert.equal(customerLabel('Cura (extended)',new Set(),''),'Cura');
 assert.equal(customerColourLabel('SM07 (extended)',new Set(['SM07']),'Spalva',['SM07']),'SM07');
 assert.equal(customerColourLabel('SM07 ( EXTENDED ) · Original Blue',new Set(['SM07']),'Spalva',['SM07']),'SM07 · Original Blue');
});
