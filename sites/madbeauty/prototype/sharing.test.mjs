import test from 'node:test';
import assert from 'node:assert/strict';
import {sharingHtml,syncSharing} from './public/sharing.mjs';
test('Sharing tags escape values and route changes remove previous article metadata',()=>{
 const metadata={openGraph:{title:'<b>"Tekstas" & vardas',description:'Aprašymas',url:'https://madbeauty.lt/gidai/testas',locale:'lt_LT',type:'article',publishedTime:'2026-10-07T07:00:00Z',images:[{url:'https://madbeauty.lt/content-assets/test.webp',width:1200,height:800,alt:'Vaizdas'}]}};
 const html=sharingHtml(metadata);assert.match(html,/&lt;b&gt;&quot;Tekstas&quot; &amp; vardas/);assert.doesNotMatch(html,/<b>/);assert.match(html,/twitter:card" content="summary_large_image/);
 const tags=[],document={querySelectorAll:()=>[...tags],createElement:()=>({setAttribute(k,v){this[k]=v;},remove(){tags.splice(tags.indexOf(this),1);}}),head:{append:tag=>tags.push(tag)}};
 syncSharing(document,metadata);assert.ok(tags.some(t=>t.property==='article:published_time'));assert.ok(tags.some(t=>t.name==='twitter:image'));
 syncSharing(document,undefined);assert.equal(tags.length,0);
});
