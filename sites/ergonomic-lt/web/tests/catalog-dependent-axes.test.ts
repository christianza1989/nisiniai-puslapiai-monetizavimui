import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogEngine,type CatalogFamily,type CatalogAnchor} from '../src/lib/catalog-configurator';
import {choiceLabel,createExpandedEngine,families} from '../src/lib/expanded-configurator';
import {baseSeed} from '../src/lib/catalog';

test('a source transition may fix the dependent wood material or remove its property entirely',()=>{
 const shared={article:'KDEPENDENT',sample:'1',name:'Fixture',classes:{},geometry:{asset:'/fixture.glb',assetSha256:'',bytes:0},components:[],profiles:[]};
 // Measured pattern: a wooden arm pad fixes shell material; full upholstery
 // removes the wood-material field. Changing only the clicked axis is invalid.
 const anchors:CatalogAnchor[]=[
  {...shared,id:'base',axes:['CARMPAD','CWOODMATERIAL'],defaults:{CARMPAD:'PLASTIC',CWOODMATERIAL:'BEECHSTAIN'},choices:{CARMPAD:['PLASTIC','LAMINATEPLYWOOD','UPH'],CWOODMATERIAL:['BEECHSTAIN']},axisTransitions:{'CARMPAD=LAMINATEPLYWOOD':'wood','CARMPAD=UPH':'upholstery'}},
  {...shared,id:'wood',axes:['CARMPAD','CWOODMATERIAL'],defaults:{CARMPAD:'LAMINATEPLYWOOD',CWOODMATERIAL:'LAMINATEPLYWOOD'},choices:{CARMPAD:['PLASTIC','LAMINATEPLYWOOD','UPH']},axisTransitions:{'CARMPAD=PLASTIC':'base','CARMPAD=UPH':'upholstery'}},
  {...shared,id:'upholstery',axes:['CARMPAD','CWOODMATERIAL'],defaults:{CARMPAD:'UPH'},choices:{CARMPAD:['PLASTIC','LAMINATEPLYWOOD','UPH']},axisTransitions:{'CARMPAD=PLASTIC':'base','CARMPAD=LAMINATEPLYWOOD':'wood'}},
 ];
 const family:CatalogFamily={id:'fixture',kind:'catalog',productId:'fixture',baseArticle:'KDEPENDENT',sample:'1',articles:[{code:'KDEPENDENT',sample:'1',name:'Fixture'}],anchors};
 const engine=createCatalogEngine(family),initial=engine.catalogInitial(family);
 const wood=engine.catalogChange(initial,'CARMPAD','LAMINATEPLYWOOD');
 assert.equal(wood.anchor,'wood');assert.equal(wood.values.CWOODMATERIAL,'LAMINATEPLYWOOD');
 const upholstery=engine.catalogChange(wood,'CARMPAD','UPH');
 assert.equal(upholstery.anchor,'upholstery');assert.equal('CWOODMATERIAL' in upholstery.values,false);
 assert.deepEqual(engine.catalogChange(upholstery,'CARMPAD','PLASTIC'),initial);
 assert.deepEqual(engine.catalogChange(wood,'CARMPAD','LAMINATEPLYWOOD'),wood);
 assert.throws(()=>engine.catalogChange(wood,'CWOODMATERIAL','BEECHSTAIN'));
});

test('Xilium armrest descriptions use PDF facts in client and server details, with source labels scoped to other articles',()=>{
 // 2026 technical description SHA d5090698...: physical page 193,
 // printed page 189. Model R75 is a separate option, not an R54 alias.
 assert.match(choiceLabel('CARMRESTS','R53BBPU',undefined,'xilium'),/3D/);
 assert.match(choiceLabel('CARMRESTS','R54POLWBPU',undefined,'xilium'),/4D/);
 assert.match(choiceLabel('CARMRESTS','R55POLWBPU',undefined,'xilium'),/X-D/);
 assert.doesNotMatch(choiceLabel('CARMRESTS','R53BBPU',undefined,'another-line'),/3D/);
 assert.equal(choiceLabel('CARMRESTS','R53BBPU',{_valueLabels:{'CARMRESTS=R53BBPU':{text:'Tikro šaltinio parinktis'}}},'another-line'),'Tikro šaltinio parinktis');
 const xilium=families.find(f=>f.id==='xilium')!,product=baseSeed().products.find(p=>p.id===xilium.productId)!;
 const engine=createExpandedEngine(),state=engine.initialStateForProduct(product);
 assert.match(engine.expandedSelection(product,state).configuration.details!.find(d=>d.label==='Porankiai')!.value,/R55 · X-D/);
});
