import fs from 'node:fs';
import path from 'node:path';
import {explanationSourceModels,explanationSourceMetadata} from '../../src/lib/option-explanation-sources';
import inventory from '../../content/text-review-inventory.json';
import {optionExplanation} from '../../src/lib/option-explanations';
const out=process.argv[2];if(!out)throw Error('Provide output directory');
const definitions=new Map<string,any>(),missing=new Map<string,any>();let options=0,covered=0;
for(const [model,labels] of Object.entries(explanationSourceModels)){
 const meta=explanationSourceMetadata[model];
 if(!meta||!/^\/produktai\/(?:kedes|rasomieji-stalai-ir-darbo-vietos)\//.test(meta.path))continue;
 const group=meta.path.includes('/kedes/')?'chairs':'desks';
 for(const [binding,english] of Object.entries(labels)){
  const match=binding.match(/^value:([CF][^=]*)=(.*)$/);if(!match)continue;
  const [,field,value]=match;if(/COLOR|CHCOL|COL$|GROUP/.test(field))continue;
  options++;
  const help=optionExplanation({group,model,field,value,english,label:english,context:labels['field:'+field]||field,configuratorUrl:'https://configurator.nowystyl.com/#ban='+model+'&lang=en'});
  if(help){covered++;const prior=definitions.get(help.id)||{...help,group,field,models:[],options:[]};prior.models.push(model);prior.options.push({model,value,english});definitions.set(help.id,prior);}
  else {const key=field+'|'+english;const prior=missing.get(key)||{field,english,models:[],values:[]};prior.models.push(model);prior.values.push(value);missing.set(key,prior);}
 }
}
const rows=[...definitions.values()].map(r=>({...r,models:[...new Set(r.models)]}));
const report={at:new Date().toISOString(),options,covered,definitions:rows.length,missing:[...missing.values()],rows};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'OPTION-EXPLANATIONS-AUDIT.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({options,covered,definitions:rows.length,missing:report.missing.map(r=>({field:r.field,english:r.english}))}));
