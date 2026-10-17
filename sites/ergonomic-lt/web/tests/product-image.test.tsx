import assert from 'node:assert/strict';
import test from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductImage} from '../src/components/product-image';
import revisions from '../content/product-image-revisions.json';
import backdrops from '../content/product-image-backdrops.json';
import {preparedImageSource} from '../src/lib/product-image-sources';

const source='/media/products-v2/1234567890abcdefabcd-1600x1600/800.webp';
test('packshots advertise actual prepared widths without a runtime optimizer',()=>{
  const html=renderToStaticMarkup(<ProductImage src={source} alt="4ME" fill sizes="320px"/>);
  assert.match(html,/160.webp 160w/);
  assert.match(html,/400.webp 400w/);
  assert.match(html,/800.webp 800w/);
  assert.match(html,/1600.webp 1600w/);
  assert.match(html,/sizes="320px"/);
  assert.match(html,/loading="lazy"/);
  assert.match(html,/position:absolute/);
  assert.doesNotMatch(html,/_next\/image/);
});
test('shorter original images are never advertised at an upscaled width',()=>{
  const html=renderToStaticMarkup(<ProductImage src="/media/products-v2/1234567890abcdefabcd-650x400/650.webp" alt="Stalas" width={650} height={400} priority/>);
  assert.match(html,/650.webp 650w/);
  assert.doesNotMatch(html,/800.webp|1600.webp/);
  assert.match(html,/loading="eager"/);
  assert.match(html,/fetchPriority="high"/);
  assert.match(html,/width="650" height="400"/);
});

test('saved quote thumbnails use the restored photograph and its own backdrop',()=>{
  const previous='9b4175134748ae390f6a',directory=revisions[previous];
  const restored=`/media/products-v2/${directory}/800.webp`;
  assert.equal(preparedImageSource(`/media/products-v2/${previous}-1600x1600/800.webp`),restored);
  const digest=directory.split('-')[0];assert.equal((backdrops as Record<string,string>)[digest],'#f4f4f4');
  const html=renderToStaticMarkup(<ProductImage src={`/media/products-v2/${previous}-1600x1600/800.webp`} alt="4ME" fill/>);
  assert(html.includes(restored));assert.match(html,/background-color:#f4f4f4/);
  assert(!html.includes(previous));
});


test('Additional supplier views use responsive originals rather than a fixed small thumbnail',()=>{
 const original='https://www.nowystyl.com/getmedia/32b30def-f511-4612-b20b-8a6978a802f1/example-angle.jpg?height=450';
 const html=renderToStaticMarkup(<ProductImage src={original} alt="Xilium" fill sizes="90px"/>);
 assert.match(html,/width=160 160w/);assert.match(html,/width=800 800w/);assert.match(html,/width=1600 1600w/);
 assert.doesNotMatch(html,/height=450/);assert.doesNotMatch(html,/_next\/image/);assert.match(html,/loading="lazy"/);
});
