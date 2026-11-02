import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {approvedHeroMarkup} from '../src/lib/approved-home-markup';
import {responsiveHomeHero} from '../src/lib/home-hero';
import assets from '../content/home-hero-assets.json';

test('responsive delivery preserves approved hero copy, links, image attributes and original markup',()=>{
 const result=responsiveHomeHero(approvedHeroMarkup),before=parseHTML('<html><body>'+approvedHeroMarkup+'</body></html>').document,after=parseHTML('<html><body>'+result+'</body></html>').document;
 assert.equal(after.body.textContent,before.body.textContent);
 assert.deepEqual(Array.from(after.querySelectorAll('a')).map(a=>a.outerHTML),Array.from(before.querySelectorAll('a')).map(a=>a.outerHTML));
 const original=before.querySelector('img')!,image=after.querySelector('img')!;
 for(const key of ['class','width','height','alt','fetchpriority','decoding'])assert.equal(image.getAttribute(key),original.getAttribute(key));
 assert.equal(image.getAttribute('sizes'),'100vw');
 assert.deepEqual(image.getAttribute('srcset')!.split(', ').map(v=>v.split(' ')[1]),assets.variants.map(v=>v.width+'w'));
 assert.equal(responsiveHomeHero(result),result);
 assert.equal(before.querySelector('img')!.getAttribute('src'),assets.source.asset);
});
