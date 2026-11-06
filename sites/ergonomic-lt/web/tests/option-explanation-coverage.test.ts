import test from'node:test';import assert from'node:assert/strict';
import{explainManufacturerOption,optionExplanation}from'../src/lib/option-explanations';
test('additional captured originals produce explanations without supplier identifiers or unmentioned capabilities',()=>{
 assert.equal(explainManufacturerOption('FBASE','C-leg'),'C formos stalo kojos.');
 assert.match(explainManufacturerOption('CBASE','diam. 735 mm, five-star, black polyamide (TS38)')!,/735 mm.*juodas poliamidas/);
 assert.doesNotMatch(explainManufacturerOption('CBASE','diam. 735 mm, five-star, black polyamide (TS38)')!,/TS38|aliumin/);
 assert.match(explainManufacturerOption('FPOWERSTRIP','2x Step 4M (4x power socket, German standard (GE), black)')!,/Du juodi.*keturi vokiškojo/);
 assert.doesNotMatch(explainManufacturerOption('FPOWERSTRIP','3x Step 4M (4x power socket, French standard (FR), black)')!,/Step|USB|230|GE|FR/);
 assert.equal(explainManufacturerOption('FGASSEMBLED','Preassembled (folded legs)'),'Tiekiamas iš anksto surinktas, sulenktomis kojomis.');
 assert.equal(explainManufacturerOption('GFTOPSHAPE','L-shape, left version'),'L formos stalviršis, kairysis variantas.');
 assert.equal(explainManufacturerOption('GFVERSION','Without extension'),'Variantas be praplėtimo elemento.');
 assert.equal(explainManufacturerOption('FPOWERSTRIP','UNKNOWN'),undefined);
});
test('verified alias English creates help on the original runtime selection binding',()=>{
 const help=optionExplanation({group:'desks',model:'KPW2017WW001',field:'FPOWERSTRIP',value:'__2XSTEP4MBLACK4X230VGE',english:'2x Step 4M (4x power socket, German standard (GE), black)',label:'Du elektros lizdų blokai',context:'Elektros lizdai',configuratorUrl:'https://configurator.nowystyl.com/'});
 assert(help);assert.equal(help.optionBinding,'explanation:FPOWERSTRIP=__2XSTEP4MBLACK4X230VGE');assert.match(help.suggested,/keturi vokiškojo/);
});
