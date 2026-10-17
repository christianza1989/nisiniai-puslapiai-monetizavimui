import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {hash} from './configurator-geometry.mjs';

// Original PBR inputs, at the supplier's original raster resolution.
// A palette thumbnail is never used as a furniture surface texture.
export async function sourceFinishMaterial(material){
 if(!material)throw Error('Source finish has no material');
 const result={factor:material.getBaseColorFactor(),roughness:material.getRoughnessFactor(),metalness:material.getMetallicFactor()};
 for(const [key,texture] of [['image',material.getBaseColorTexture()],['normalImage',material.getNormalTexture()]]){
  if(!texture)continue;
  const bytes=texture.getImage();if(!bytes?.length)throw Error('Source finish raster missing');
  const meta=await sharp(bytes).metadata(),extension=meta.format==='png'?'png':meta.format==='jpeg'?'jpg':meta.format==='webp'?'webp':null;
  if(!extension)throw Error('Unsupported source finish raster: '+meta.format);
  const digest=hash(bytes),asset='/media/configurator/additional-materials/'+digest.slice(0,24)+'.'+extension;
  const file=path.join('public',asset);await fs.mkdir(path.dirname(file),{recursive:true});
  try{if(hash(await fs.readFile(file))!==digest)throw Error('Existing source finish mismatch');}catch(error){if(error.code!=='ENOENT')throw error;
   const temporary=file+'.tmp-'+process.pid;await fs.writeFile(temporary,bytes);await fs.rename(temporary,file);
  }
  result[key]=asset;result[key+'Sha256']=digest;result[key+'Width']=meta.width;result[key+'Height']=meta.height;
 }
 return result;
}
export function sourceFinishKey(material){
 return JSON.stringify([material.factor,material.metalness,material.roughness,material.imageSha256||null]);
}
export function sourceFinishSwatch(material){
 const channel=v=>Math.round(255*(v<=0.0031308?12.92*v:1.055*v**(1/2.4)-.055)).toString(16).padStart(2,'0');
 return '#'+material.factor.slice(0,3).map(channel).join('');
}
