import test from 'node:test';
import assert from 'node:assert/strict';
import {baseSeed} from '../src/lib/catalog';
import {modelProduct} from '../src/lib/product-models';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {configurableArticle} from '../src/lib/configuration-article';
import {supplierOptions} from '../src/lib/configuration-labels';
import {productStudioPresentation} from '../src/lib/product-studio';

const parent=baseSeed().products.find(p=>p.id==='product_xilium-swivel-chairs_0fe4091b')!;
const sample=parent.configurations.find(c=>c.id==='23636148')!;
const product=modelProduct(parent,sample),engine=createExpandedEngine();
const text=(state:ReturnType<typeof engine.initialStateForProduct>)=>{
 const article=engine.selectionArticle(product,state)!;
 return article.sections.map(s=>[...s.paragraphs,...s.rows.map(r=>r.label+': '+r.value)].join('\n')).join('\n');
};

test('148 retains its exact white, headrest and armrest source selection and model identity',()=>{
 assert.equal(configurableArticle(product)?.configurationId,'23636148');
 const state=engine.initialStateForProduct(product),selected=engine.expandedSelection(product,state);
 assert.equal(state.values.CPLASTICCOLORVERSION2,'WHITEEDITION');
 assert.equal(state.values.CHEADREST,'HRUA2DPLASTICSIDPROF');
 assert.equal(state.values.CARMRESTS,'R55POLWBPU');
 assert.equal(selected.configuration.id,sample.id);
 assert.equal(selected.configuration.code,sample.code);
 const normalize=(option:string)=>option.replace(/(\.CPRICEGROUP=)_/,'$1');
 const actual=new Set(selected.configuration.supplierOptions!.map(normalize));
 for(const option of supplierOptions(sample))assert(actual.has(normalize(option)),option);
 assert.deepEqual(engine.parseStateToken(product,engine.stateToken(state)),state);
 assert.equal(product.modelArticle!.technicalSections.flatMap(s=>s.rows).length,42);
});

test('148 component descriptions follow mechanism, headrest and armrest choices',()=>{
 const initial=engine.initialStateForProduct(product),before=text(initial);
 assert(before.includes('R55POLWBPU'));assert(before.includes('220–280 mm'));
 const changed=engine.changeField(initial,'CMECHANISM','ERNST');
 assert(text(changed).includes('ERN-ST'));
 const noHeadrest=engine.changeField(changed,'CHEADREST','NONE');
 const head=engine.selectionArticle(product,noHeadrest)!.sections.find(s=>s.id==='headrest')!;
 assert(head.paragraphs.join(' ').includes('be galvos atramos'));assert.equal(head.rows.length,0);
 const noArms=engine.changeField(noHeadrest,'CARMRESTS','NONE');
 const arms=engine.selectionArticle(product,noArms)!.sections.find(s=>s.id==='armrests')!;
 assert(arms.paragraphs.join(' ').includes('be porankių'));assert(!text(noArms).includes('R55POLWBPU'));
 const result=engine.expandedSelection(product,noArms);
 assert.equal(result.configuration.id,'23636148');
 assert(result.configuration.supplierOptions!.some(v=>v.endsWith('.CMECHANISM=ERNST')));
});

test('148 has a distinct labelled room visualization without changing its real gallery',()=>{
 const gallery=JSON.stringify(product.gallery),sourceImage=product.image;
 const scene=productStudioPresentation(product);
 assert(scene.illustrated);assert.equal(scene.image,'/media/product-studio/xilium-duo-23636148-office.png');
 assert.equal(product.image,sourceImage);assert.equal(JSON.stringify(product.gallery),gallery);
 const sibling=modelProduct(parent,parent.configurations.find(c=>c.id==='23636152')!);
 assert.notEqual(productStudioPresentation(sibling).image,scene.image);
});
