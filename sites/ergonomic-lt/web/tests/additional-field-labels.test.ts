import test from 'node:test';
import assert from 'node:assert/strict';
import {localizeAdditionalPalettes} from '../scripts/additional-chair-labels.mjs';

const anchor=(field:string)=>({choices:{CFRAMEMETALCOLOR:['RAL9005']},axes:[],components:[{fields:['CFRAMEMETALCOLOR'],variants:[{dependentChoices:{[field]:['KB08']}}]}],profiles:[]});

test('a finish field introduced only by a component transition receives a Lithuanian label without changing its code',()=>{
 const palettes:any={CARMPADPLCOLOR:{KB08:{text:'Black'}}};
 assert.deepEqual(localizeAdditionalPalettes(palettes,[anchor('CARMPADPLCOLOR')],{}),[]);
 assert.equal(palettes._fieldLabels.CARMPADPLCOLOR.text,'Porankių atraminių dalių plastiko spalva');
 assert.equal(palettes._valueLabels['CARMPADPLCOLOR=KB08'].text,'Juoda');
 assert.deepEqual(Object.keys(palettes.CARMPADPLCOLOR),['KB08']);
});

test('an untranslated source field in a dependent list remains a blocking label error',()=>{
 assert.deepEqual(localizeAdditionalPalettes({},[anchor('CUNKNOWNTARGET')],{}),['CUNKNOWNTARGET']);
});
