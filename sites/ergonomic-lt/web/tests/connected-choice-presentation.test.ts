import test from 'node:test';import assert from 'node:assert/strict';
import {connectedFieldLabel,connectedColourLabel,connectedValueLabel} from '../src/lib/connected-choice-presentation';
import {independentFieldGroups} from '../src/lib/finite-choice-fields';
test('chair field labels are Lithuanian and bench wording does not reach chair controls',()=>{
 assert.equal(connectedFieldLabel('Colour 3D upholstery - back of backrest'),'Atlošo išorinės pusės 3D audinio spalva');
 assert.equal(connectedFieldLabel('Suoliuko porankių metalo spalva / Seat height'),'Porankių metalo spalva / Sėdynės aukštis');
 assert.equal(connectedValueLabel('None'),'Nėra');
});
test('remove alternate aliases while preserving original shade names and real colour marks',()=>{
 assert.equal(connectedColourLabel('AL · RAL 9006 White Aluminium AL, ALU, WA, X'),'RAL 9006 White Aluminium');
 assert.equal(connectedColourLabel('RAL 9010 Pure White BI, WH, W'),'RAL 9010 Pure White');
 assert.equal(connectedColourLabel('RAL 9016 Traffic White BI, WT, W'),'RAL 9016 Traffic White');
 assert.equal(connectedColourLabel('Chrome CR, Z'),'Chrome');
 for(const value of ['CSE01','SX3066 · Silvertex','NCS S 2005-Y60R Cashmere NK','NJ Acacia Light','BLACK · Black'])assert.equal(connectedColourLabel(value),value);
});
test('only an exact Cartesian relation can become independent controls',()=>{
 const values=['a','b'].flatMap(A=>['x','y'].map(B=>({A,B,C:B==='x'?'one':'two'})));
 assert.deepEqual(independentFieldGroups(values,['A','B','C']),[['A'],['B','C']]);
 const partial=[{A:'a',B:'x'},{A:'b',B:'x'},{A:'b',B:'y'}];assert.deepEqual(independentFieldGroups(partial,['A','B']),[['A','B']]);
});
