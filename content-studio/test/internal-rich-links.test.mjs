import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveInternalRichLinks} from '../src/internal-rich-links.mjs';

const pages=[{id:'home',type:'home',slug:''},{id:'guide',type:'guide',slug:'gidai/baldas'}];
test('Creator paragraph and list links become native known-page links without changing wording',()=>{
  const body=[{type:'paragraph',text:'Skaitykite [šį gidą](/gidai/baldas/), tada apsispręskite.'},
    {type:'list',items:['Pirmas žingsnis.','Atverkite [gidą](/gidai/baldas/).']}];
  const saved=structuredClone(body),value=resolveInternalRichLinks(body,pages,'home');
  assert.deepEqual(body,saved);
  assert.deepEqual(value[0],{type:'richParagraph',content:[{type:'text',text:'Skaitykite '},
    {type:'link',text:'šį gidą',target:{kind:'page',pageId:'guide'}},{type:'text',text:', tada apsispręskite.'}]});
  assert.equal(value[1].type,'richList');assert.equal(value[1].items[0][0].text,'Pirmas žingsnis.');
  assert.deepEqual(resolveInternalRichLinks(value,pages,'home'),value);
});
for(const target of ['/nezinomas/','/gidai/baldas/?q=1','//external.example/','/'])test('unknown, query, foreign and self targets fail closed: '+target,()=>{
  assert.throws(()=>resolveInternalRichLinks([{type:'paragraph',text:`Žr. [nuorodą](${target}).`}],pages,'home'),/internal_link_target_unavailable/);
});
test('no raw HTML or external Markdown authority is introduced; revoked page is unavailable',()=>{
  const body=[{type:'paragraph',text:'<b>Tekstas</b> [šaltinis](https://example.org/)'}];
  assert.deepEqual(resolveInternalRichLinks(body,pages,'home'),body);
  assert.throws(()=>resolveInternalRichLinks([{type:'paragraph',text:'[gidas](/gidai/baldas/)'}],
    pages.map(page=>({...page,status:page.id==='guide'?'revoked':'draft'})),'home'));
});
test('headings and existing rich text resolve; native nodes and literal examples are preserved',()=>{
  const existing={type:'link',text:'Esamas',target:{kind:'page',pageId:'guide'}};
  const body=[{type:'heading',level:2,text:'Rinkitės [gidą](/gidai/baldas/)'},
    {type:'richParagraph',content:[existing,{type:'text',text:' arba [gidas](/gidai/baldas/).'}]},
    {type:'paragraph',text:'![schema](/gidai/baldas/) ir \\[pavyzdys](/gidai/baldas/) bei `[kodas](/gidai/baldas/)` ir ``[kitas](/gidai/baldas/)``.'}];
  const value=resolveInternalRichLinks(body,pages,'home');
  assert.equal(value[0].type,'richHeading');assert.deepEqual(value[1].content[0],existing);
  assert.equal(value[1].content[2].target.pageId,'guide');assert.deepEqual(value[2],body[2]);
});
