import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.resolve('content-studio/package.json')),sharp=require('sharp');
const evidence=path.resolve('research/madbeauty-implementation');
const version=process.env.MB_CROP_QA_VERSION||'v5';
const rows=JSON.parse(await fs.readFile(path.join(evidence,`profile-crop-browser-${version}.json`),'utf8'));
const receipt=[];
for(const width of [1280,390]){
 const targets=rows.filter(r=>r.metrics.width===width);
 for(let start=0;start<targets.length;start+=8){
  const group=targets.slice(start,start+8),tileWidth=width===1280?640:390,tileHeight=width===1280?310:760;
  const inputs=await Promise.all(group.map(async(r,i)=>{
   const source=path.join(evidence,r.screenshot),metadata=await sharp(source).metadata(),top=width===1280?110:0;
   const pixels=await sharp(source).extract({left:0,top,width:metadata.width,height:Math.min(width===1280?620:760,metadata.height-top)}).resize(tileWidth,tileHeight,{fit:'contain',background:'#ffffff'}).png().toBuffer();
   return {input:pixels,left:(i%2)*tileWidth,top:Math.floor(i/2)*tileHeight};
  }));
  const file=`profile-crop-sheet-${version}-${width}-${Math.floor(start/8)+1}.png`;
  await sharp({create:{width:tileWidth*2,height:tileHeight*Math.ceil(group.length/2),channels:3,background:'#ffffff'}}).composite(inputs).png().toFile(path.join(evidence,file));
  receipt.push({file,width,sourceScreenshots:group.map(r=>r.screenshot),purpose:'QA contact sheet only; original browser screenshots retained',review:'pending pixel inspection'});
 }
}
await fs.writeFile(path.join(evidence,`profile-crop-contact-sheets-${version}.json`),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({sheets:receipt.length,sourceScreenshots:rows.length}));
