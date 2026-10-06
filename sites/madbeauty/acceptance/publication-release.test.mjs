import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {admitPublicationRelease} from '../content/release-admission.mjs';
import {articleFixture} from '../content-foundation-20261006/fixture.mjs';
function reviewedMediaFixture(){
 const pkg=articleFixture(),p=pkg.pages[1];
 p.media=[360,640,800,1200,1536].map(w=>({id:'isolated-'+w,src:'/content-assets/madbeauty/isolated-'+w+'.webp',width:w,height:Math.round(w/1.5),alt:'Izoliuota testinė iliustracija',rights:'Tik priėmimo testui'}));p.editorial.featuredImageId=p.media.at(-1).id;
 return pkg;
}
test('Production V2 admission requires reviewed responsive family and exact typed catalogue identities',()=>{
 const pkg=reviewedMediaFixture();assert.equal(admitPublicationRelease(pkg),pkg);
 const missing=structuredClone(pkg);missing.pages[1].media.pop();assert.throws(()=>admitPublicationRelease(missing),/featured image/);
 const incomplete=structuredClone(pkg);incomplete.pages[1].media.shift();assert.throws(()=>admitPublicationRelease(incomplete),/five responsive/);
 const wrong=structuredClone(pkg);wrong.pages[1].editorial.commerceTargets[0].url+='?miestas=kaunas';assert.throws(()=>admitPublicationRelease(wrong),/non-canonical/);
 const unknown=structuredClone(pkg);unknown.pages[1].editorial.commerceTargets[0].id='mb:catalog:unknown';assert.throws(()=>admitPublicationRelease(unknown),/Unknown/);
 const external=structuredClone(pkg);external.pages[1].body.push({type:'richParagraph',content:[{type:'link',text:'Katalogas',target:{kind:'external',url:'https://madbeauty.lt/paslaugos/nagai'}}]});assert.throws(()=>admitPublicationRelease(external),/typed commerce/);
 const source=structuredClone(pkg);source.pages[1].editorial.sources.push({url:'https://madbeauty.lt/paslaugos/nagai'});assert.throws(()=>admitPublicationRelease(source),/external sources/);
 const legal=structuredClone(pkg);legal.pages[1].type='legal';legal.pages[1].media=[];legal.pages[1].editorial.featuredImageId=null;assert.equal(admitPublicationRelease(legal),legal);
});
test('Frozen V1 release is admitted without changing approval or media bytes',async()=>{
 const pkg=JSON.parse(await readFile(new URL('../content/initial-release/content-package.json',import.meta.url))),before=JSON.stringify(pkg);assert.equal(admitPublicationRelease(pkg),pkg);assert.equal(JSON.stringify(pkg),before);
});
