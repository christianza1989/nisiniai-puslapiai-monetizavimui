import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBlocks} from '../src/model.mjs';

test('legacy migration retains a list item longer than700 characters',()=>{
 const text='Senas svetainės sakinys. '.repeat(40).trim();
 const blocks=normalizeBlocks([{type:'list',items:['Trumpas punktas.',text]}]);
 assert.equal(blocks[0].items[1],text);
});

test('legacy list limits reject overflow instead of silently approving partial copy',()=>{
 assert.throws(()=>normalizeBlocks([{type:'list',items:['x'.repeat(3001)]}]),/3000/);
 assert.equal(normalizeBlocks([{type:'list',items:['x'.repeat(3000)]}])[0].items[0].length,3000);
});
