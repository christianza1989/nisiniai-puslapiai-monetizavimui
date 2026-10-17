import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const hash=b=>createHash('sha256').update(b).digest('hex');
const source=path.resolve('../research/configurator/batch-10-materials'),target=path.resolve('public/media/configurator/catalog-materials');
await fs.mkdir(target,{recursive:true});const materials=JSON.parse(await fs.readFile(path.join(source,'materials.json'),'utf8')),result={schemaVersion:1,colors:{}},report=[];
for(const [code,m] of Object.entries(materials)){
 const bytes=await fs.readFile(path.join(source,m.file));if(hash(bytes)!==m.sourceSha256)throw Error('Source finish changed');
 const meta=await sharp(bytes).metadata(),extension=meta.format==='png'?'png':'jpg',name=m.sourceSha256.slice(0,24)+'.'+extension;
 await fs.writeFile(path.join(target,name),bytes);
 result.colors[code]={image:'/media/configurator/catalog-materials/'+name,factor:m.factor,roughness:m.roughness,metalness:m.metalness,group:m.group,width:meta.width,height:meta.height,sourceSha256:m.sourceSha256};
 report.push({code,file:'public/media/configurator/catalog-materials/'+name,width:meta.width,height:meta.height,sourceSha256:m.sourceSha256,origin:'Nowy Styl public GLTF export; original embedded material image for finish '+code+'; downloaded at source resolution, without resizing.'});
}
await fs.writeFile('content/render-materials-catalog.json',JSON.stringify(result));
await fs.writeFile('../research/configurator/batch-10/material-verification.json',JSON.stringify(report,null,2));
console.log('Source finishes',report.length,'unique raster files',new Set(report.map(r=>r.file)).size);
