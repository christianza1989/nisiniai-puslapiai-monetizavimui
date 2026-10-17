import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {renderMaterial} from '../src/lib/render-materials';
import library from '../content/render-materials.json';

test('3D albedas naudoja originalą, o ne mažą pasirinkimo pavyzdį',()=>{
  const exact=renderMaterial({code:'VL0034',group:'VL',image:'/media/configurator/finishes/VL0034.jpg',color:'#76685e'});
  assert.equal(exact.image,library.colors.VL0034.image);assert.equal(exact.color,'#ffffff');assert.equal(exact.approximate,false);
  const known=renderMaterial({code:'VL9999',group:'VL',image:'/tiny-thumbnail.jpg',color:'#123456'});
  assert.equal(known.image,library.groups.VL.image);assert.equal(known.color,'#123456');assert.equal(known.approximate,true);
  const unknown=renderMaterial({code:'NAP9999',group:'NAPPA',image:'/tiny-thumbnail.jpg',color:'#654321'});
  assert.equal(unknown.image,undefined);assert.equal(unknown.normalImage,undefined);assert.equal(unknown.color,'#654321');
});

test('Originalios medžiagos yra 1024 px; aštuonios bazės išlaiko visus šaltinio trikampius',async()=>{
  assert.equal(Object.keys(library.colors).length,8);
  for(const texture of Object.values(library.colors)){
    const size=await sharp('public'+texture.image).metadata();assert.equal(size.width,1024);assert.equal(size.height,1024);
  }
  const report=JSON.parse(fs.readFileSync('.impeccable/review/configurator-render-quality/source-quality.json','utf8'));
  assert.equal(report.bases.length,8);
  for(const base of report.bases){assert.equal(base.outputTriangles,base.sourceTriangles);assert(base.bytes<8_000_000);}
  for(const texture of report.textures)assert.equal(createHash('sha256').update(fs.readFileSync(texture.file)).digest('hex'),texture.assetSha256);
});
