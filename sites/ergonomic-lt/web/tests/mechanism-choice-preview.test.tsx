import assert from 'node:assert/strict';
import test from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {MechanismChoicePreview} from '../src/components/mechanism-choice-preview';
import {mechanismChoicePreview} from '../src/lib/mechanism-choice-preview';

test('one-chair trial cannot enable on another model, another field or production',()=>{
 assert.equal(mechanismChoicePreview('KBJA001WW002','CMECHANISM',false),undefined);
 assert.equal(mechanismChoicePreview('KBJA002WW002','CMECHANISM',true),undefined);
 assert.equal(mechanismChoicePreview('KBJA001WW002','CARMRESTS',true),undefined);
 assert.equal(Object.keys(mechanismChoicePreview('KBJA001WW002','CMECHANISM',true)!).length,7);
});
test('mechanism list exposes short descriptions and keeps selected detail collapsed, escaping text',()=>{
 const html=renderToStaticMarkup(<MechanismChoicePreview label="Mechanizmas" value="opaque-a" choices={[{id:'opaque-a',label:'Sinchroninis',summary:'Reguliuojamas gylis.'},{id:'opaque-b',label:'<script>',summary:'Pasvirimas į priekį.'}]} onChange={()=>{}} explanation={<p>Platesnis paaiškinimas</p>}/>);
 assert(html.includes('Reguliuojamas gylis.'));
 assert(html.includes('Pasvirimas į priekį.'));
 assert(html.includes('Daugiau apie pasirinktą mechanizmą'));
 assert(!html.includes(' open=""'));
 assert(html.includes('&lt;script&gt;'));
 assert(!html.includes('<script>'));
});
