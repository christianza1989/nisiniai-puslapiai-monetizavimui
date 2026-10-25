import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inlineNodes,bodyPlainText} from '../src/content-body.mjs';
import * as v2 from '../src/content-package-v2.mjs';
test('package compatibility exports are the same pure accessors',()=>{
 assert.equal(v2.inlineNodes,inlineNodes);assert.equal(v2.bodyPlainText,bodyPlainText);
 const body=[{type:'paragraph',text:'Senas tekstas'},{type:'richParagraph',content:[{text:'Naujas '},{text:'tekstas'}]},{type:'richList',items:[[{text:'Pirmas'}],[{text:'Antras'}]]},{type:'list',items:['A','B']}];
 assert.equal(bodyPlainText(body),'Senas tekstas\nNaujas tekstas\nPirmas\nAntras\nA\nB');assert.equal(inlineNodes({body}).length,4);
});
test('runtime review dependency has no eager filesystem schema import',async()=>{
 const workflow=await readFile(new URL('../src/content-workflow.mjs',import.meta.url),'utf8');
 const body=await readFile(new URL('../src/content-body.mjs',import.meta.url),'utf8');
 const minimum=await readFile(new URL('../src/minimum-content.mjs',import.meta.url),'utf8');
 assert.ok(workflow.includes("from './content-body.mjs'"));assert.ok(!workflow.includes('content-package-v2.mjs'));assert.ok(!body.includes('node:fs'));
 assert.ok(minimum.includes("from './content-body.mjs'"));assert.ok(!minimum.includes('content-package-v2.mjs'));
});
