import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire(path.resolve('content-studio/package.json'))('sharp');
const dir=path.resolve('research/madbeauty-implementation'),version=process.argv[2]||'v6';
const rows=JSON.parse(await fs.readFile(path.join(dir,`screen-acceptance-${version}.json`),'utf8'));
const prefix=process.argv[3]||'all',selected=rows.filter(r=>prefix==='all'||r.id.startsWith(prefix));const receipt=[];
for(const width of [1280,390]){
 const targets=selected.filter(r=>r.metrics.width===width);
 for(let start=0;start<targets.length;start+=6){
  const group=targets.slice(start,start+6),w=width===1280?640:390,h=width===1280?450:844;
  const inputs=await Promise.all(group.map(async(r,i)=>({input:await sharp(path.join(dir,r.screenshot)).resize(w,h,{fit:'contain',background:'#fff'}).png().toBuffer(),left:(i%2)*w,top:Math.floor(i/2)*h})));
  const file=`screen-sheet-${version}-${prefix}-${width}-${Math.floor(start/6)+1}.png`;
  await sharp({create:{width:w*2,height:h*Math.ceil(group.length/2),channels:3,background:'#fff'}}).composite(inputs).png().toFile(path.join(dir,file));
  receipt.push({file,ids:group.map(r=>r.id),sourceScreenshots:group.map(r=>r.screenshot),review:'pending actual pixel inspection'});
 }
}
await fs.writeFile(path.join(dir,`screen-sheets-${version}-${prefix}.json`),JSON.stringify(receipt,null,2));console.log(JSON.stringify({sheets:receipt.length,rows:selected.length}));
