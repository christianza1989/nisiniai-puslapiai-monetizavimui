import fs from 'node:fs/promises';
import {catalog} from '../src/lib/catalog';
import {catalogFamilies,catalogInitial} from '../src/lib/catalog-configurator';
import {stateChoices,changeField,expandedSelection} from '../src/lib/expanded-configurator';
async function main(){
const probes=[];
for(const f of catalogFamilies)for(const article of f.articles){
 const p=catalog().products.find(p=>p.id===f.productId)!;let s=catalogInitial(f,article.code);
 for(let round=0;round<3;round++){
  if(round)for(const field of Object.keys(stateChoices(s))){const vs=stateChoices(s)[field];if(vs?.length>1)s=changeField(s,field,round===1?vs.at(-1)!:vs[0]);}
  const chosen=expandedSelection(p,s);probes.push({family:f.id,article:article.code,round,values:s.values,choices:stateChoices(s),options:chosen.configuration.supplierOptions});
 }
}
await fs.writeFile('../research/configurator/batch-10/source-check-probes.json',JSON.stringify(probes,null,2));
console.log(probes.length,'source comparison probes');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
