import fs from 'node:fs/promises';
import fixtures from '../content/configurator-catalog-fixtures.json';
import {catalog} from '../src/lib/catalog';
import {validateState,stateChoices,changeField,expandedSelection} from '../src/lib/expanded-configurator';
async function main(){const probes=[];
for(const family of ['4me','bjarg','prox']){
 const fixture=(fixtures as any[]).find(p=>p.family===family&&(family!=='bjarg'||p.anchor.endsWith(':HRUA'))),product=catalog().products.find(p=>p.id===fixture.productId)!;
 let state=validateState(product,{family,anchor:fixture.anchor,values:fixture.values});
 if(stateChoices(state).CPRICEGROUP?.includes('_2'))state=changeField(state,'CPRICEGROUP','_2');
 for(const field of Object.keys(stateChoices(state)).filter(k=>k.endsWith('GROUP')&&k!=='CPRICEGROUP')){const choices=stateChoices(state)[field];if(choices.includes('VL'))state=changeField(state,field,'VL');}
 let index=0;for(const field of Object.keys(stateChoices(state)).filter(k=>/COLOR|CHCOL/.test(k)&&!/PLASTIC|FRAME/.test(k))){const choices=stateChoices(state)[field];state=changeField(state,field,choices[index++%choices.length]);}
 const selection=expandedSelection(product,state);probes.push({family,article:selection.configuration.code,state,choices:stateChoices(state),options:selection.configuration.supplierOptions});
}
await fs.writeFile('../research/configurator/batch-10/colour-check-probes.json',JSON.stringify(probes,null,2));console.log(probes.length,'independent multi-colour construction probes');}
main().catch(error=>{console.error(error);process.exitCode=1;});
