import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createLegacyDeskColorLoader} from '../src/lib/legacy-desk-color-loader';
import {chairCandidates} from '../src/lib/chair-structure-candidates';
import colorEntries from '../content/desk-color-candidates.json';
import {legacyDeskColorIdentity as id,withLegacyDeskColors,withDeskColors,deskColorPlan,type DeskColors} from '../src/lib/desk-colors';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import type {CatalogRuntime} from '../src/lib/catalog-configurator';
import type {Product} from '../src/lib/types';

const entry=chairCandidates.models[id.productId+':'+id.sample],product={id:id.productId,categorySlug:'rasomieji-stalai-ir-darbo-vietos',modelConfigurationId:id.sample,configurations:[{id:id.sample,code:id.code}],name:'eRange'}as Product;
const readAsset=(asset:string)=>readFile(new URL('../public'+asset,import.meta.url));
const source=JSON.parse(await readFile(new URL('../public'+entry.runtime.asset,import.meta.url),'utf8'))as CatalogRuntime;
const overlay=JSON.parse(await readFile(new URL('../public'+colorEntries.models.KERG020WW001.asset,import.meta.url),'utf8'))as DeskColors;
const digest=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

test('the actual legacy overlay preserves all 576 original graphs, geometry, defaults and supplier classes',async()=>{
 const before=digest(source),runtime=await createLegacyDeskColorLoader(chairCandidates,readAsset,colorEntries)(product);assert.ok(runtime);assert.equal(digest(source),before);assert.equal(runtime.family.collectionMode,'structure-only');assert.equal(runtime.family.anchors.length,576);
 const actual=new Map(runtime.family.anchors.map(a=>[a.id,a]));for(const a of source.family.anchors){const b=actual.get(a.id)!;for(const key of ['geometry','axes','axisTransitions','axisValueChanges','classes','components','profiles']as const)assert.deepEqual(b[key],a[key]);for(const [key,value]of Object.entries(a.defaults))assert.equal(b.defaults[key],value);for(const [key,value]of Object.entries(a.choices))assert.deepEqual(b.choices[key],value);}
 assert.deepEqual(runtime.family.deskColors!.baseDimensions,{GDWIDTH:'_2000'});
});

test('actual current-engine color selection restores originals and keeps measured dimension resets and FINISH quote ownership',async()=>{
 const runtime=await createLegacyDeskColorLoader(chairCandidates,readAsset,colorEntries)(product);assert.ok(runtime);const e=createExpandedEngine(runtime);let s=e.initialStateForProduct(product);const original=e.expandedSelection(product,s);assert.equal(e.catalog.catalogValues(s).GDDEPTH,'_1000');assert.equal(e.stateChoices(s).GDDEPTH,undefined);
 s=e.changeField(s,'FOUTSIDEDESKTOPBOARDCOL','DM');const selected=e.expandedSelection(product,s),assets=[selected.assets.base!];const plan=deskColorPlan(runtime.family.deskColors!,s.values,assets);assert.ok(Object.keys(plan.materials).length);assert.deepEqual(plan.pending,[]);assert.ok(selected.configuration.supplierOptions?.includes('KERG020WW001_FINISHES.FOUTSIDEDESKTOPBOARDCOL=DM'));
 const changed=s;s=e.changeField(s,'FOUTSIDEDESKTOPBOARDCOL','VM');assert.deepEqual(deskColorPlan(runtime.family.deskColors!,s.values,assets).materials,{});assert.deepEqual(e.expandedSelection(product,s).assets,original.assets);
 s=e.changeField(changed,'GDWIDTH','_1800');assert.equal(e.catalog.catalogValues(s).GDDEPTH,'_900');assert.equal(s.values.FOUTSIDEDESKTOPBOARDCOL,'VM');assert.notDeepEqual(e.expandedSelection(product,s).assets,original.assets);
 assert.deepEqual(deskColorPlan(runtime.family.deskColors!,{...s.values,FOUTSIDEDESKTOPBOARDCOL:'DM'},[e.expandedSelection(product,s).assets.base!]).pending,['FOUTSIDEDESKTOPBOARDCOL']);
});

test('the legacy opt-in rejects other models, runtime pins, foreign URLs, changed overlay bytes and unrelated finish fields',async()=>{
 assert.throws(()=>withDeskColors(source,overlay));assert.throws(()=>withLegacyDeskColors({...source,family:{...source.family,baseArticle:'KSOO004WW002'}},overlay));assert.throws(()=>withLegacyDeskColors(source,{...overlay,componentRuntimeSha256:'a'.repeat(64)}));assert.throws(()=>withLegacyDeskColors(source,{...overlay,fields:{OTHER:overlay.fields.FOUTSIDEDESKTOPBOARDCOL}}));
 const wrong=structuredClone(colorEntries);wrong.models.KERG020WW001.componentRuntimeSha256='a'.repeat(64);await assert.rejects(createLegacyDeskColorLoader(chairCandidates,readAsset,wrong)(product),/binding/);
 wrong.models.KERG020WW001={...colorEntries.models.KERG020WW001,asset:'https://example.com/overlay.json'};await assert.rejects(createLegacyDeskColorLoader(chairCandidates,readAsset,wrong)(product),/binding/);
 await assert.rejects(createLegacyDeskColorLoader(chairCandidates,async asset=>asset===colorEntries.models.KERG020WW001.asset?Buffer.from('{}'):readAsset(asset),colorEntries)(product),/changed/);
});

test('absent opt-in and unrelated chair candidates keep their original loader behavior and never read the overlay',async()=>{
 const noColors=await createLegacyDeskColorLoader(chairCandidates,readAsset,{schemaVersion:1,models:{}})(product);assert.deepEqual(noColors,source);
 const other=Object.values(chairCandidates.models).find(x=>x.code==='KSEG002WW001')!;assert.ok(other);const p={id:other.productId,categorySlug:'kedes',modelConfigurationId:other.sample,configurations:[{id:other.sample,code:other.code}]}as Product;const reads:string[]=[];const actual=await createLegacyDeskColorLoader(chairCandidates,async asset=>{reads.push(asset);return readAsset(asset);},colorEntries)(p);assert.ok(actual);assert.equal(actual.family.deskColors,undefined);assert.deepEqual(reads,[other.runtime.asset]);
});
