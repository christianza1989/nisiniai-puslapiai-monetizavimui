import test from 'node:test';
import assert from 'node:assert/strict';
import {manufacturerOptionName} from '../src/lib/manufacturer-option-names';
import {customerLabel} from '../src/lib/customer-names';
test('dimensions retain physical measurements while encoded choices stay hidden',()=>{
 assert.equal(manufacturerOptionName('value:GDWIDTH=_1400','1400 mm'),'1400 mm');
 assert.equal(customerLabel('1400 mm',new Set(['_1400','GDWIDTH']),'Missing'),'1400 mm');
 assert.equal(customerLabel('_1400',new Set(['_1400']),'Missing'),'Missing');
 assert.equal(customerLabel('KEM2013WW004',new Set(['KEM2013WW004']),'Missing'),'Missing');
 assert.equal(manufacturerOptionName('value:GDWIDTH=_1400','_1400'),undefined);
});
test('supplier source names translate, finish codes do not acquire guessed colours',()=>{
 assert.equal(manufacturerOptionName('value:FBASECOLOR=RAL9005','RAL 9005 Jet Black CZ, BL/BLT, Y'),'RAL 9005 Jet Black CZ, BL/BLT, Y');
 assert.equal(manufacturerOptionName('value:FTOPCOLOR=MP','MP Platinum'),'MP Platinum');
 assert.equal(manufacturerOptionName('value:FSOCKETSTANDARD=EU','European (EU)'),'Europos standartas');
 assert.equal(manufacturerOptionName('value:FTOPCOLOR=MP','MP'),'MP');
 assert.equal(manufacturerOptionName('value:CMECHANISM=BLACK','Black'),undefined);
});

test('compound dimensions use captured units and structure without inferring numbers from codes',()=>{
 assert.equal(manufacturerOptionName('value:GDDEPTH=_14902X700','1490 mm (2x 700 mm)'),'1490 mm (2 × 700 mm)');
 assert.equal(manufacturerOptionName('value:GDTOPSDEPTH=_2X8001640','2 × 800 (1640 with panel) mm'),'2 × 800 (1640 su pertvara) mm');
 assert.equal(manufacturerOptionName('value:GDWIDTH=_1200X1200','1200/1200 mm'),'1200/1200 mm');
 assert.equal(manufacturerOptionName('value:GDDEPTH=_14902X700','14902X700'),undefined);
 assert.equal(manufacturerOptionName('value:CARMRESTS=R35','1490 mm (2x 700 mm)'),undefined);
});
