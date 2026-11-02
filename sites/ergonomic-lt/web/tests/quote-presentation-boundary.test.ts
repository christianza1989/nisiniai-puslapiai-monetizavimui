import test from 'node:test';
import assert from 'node:assert/strict';
import {choiceLabel as fullChoiceLabel,fieldLabels as fullFields} from '../src/lib/expanded-configurator';
import {choiceLabel,fieldLabels} from '../src/lib/choice-presentation';
import source from '../content/source-choice-presentation.json';
import arms from '../content/armrest-presentation.json';

test('lightweight basket labels equal the full configurator for all structural source choices',()=>{
 const pairs=new Set(['CARMRESTS=NONE','CBASE=NONE','CCASTORS=NONE','CBASE=ALUPOLISHED','CCASTORS=UNKNOWN','CARMRESTS=R55','CARMRESTS=R70','CARMRESTS=GTP56']);
 for(const key of Object.keys(source.choices))if(/^(CARMRESTS|CBASE|CCASTORS)=/.test(key))pairs.add(key);
 for(const article of Object.values(arms.articles))for(const value of Object.keys(article.choices))pairs.add('CARMRESTS='+value);
 for(const family of ['xilium','souly',undefined])for(const pair of pairs){const [field,value]=pair.split('=');assert.equal(choiceLabel(field,value,undefined,family),fullChoiceLabel(field,value,undefined,family),pair);}
 assert.equal(fieldLabels,fullFields);
});
