import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire('C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/package.json');const sharp=require('sharp');
const here=new URL('.',import.meta.url);const plan=JSON.parse(await fs.readFile(new URL('MEDIA-PLAN.json',here),'utf8'));
if(plan.some(p=>!p.originalPath))throw Error('All originals required');
for(let batch=0;batch<4;batch++){
 const composites=[];for(let k=0;k<15;k++){
  const p=plan[batch*15+k];const x=(k%3)*410,y=Math.floor(k/3)*290;
  composites.push({input:await sharp(p.originalPath).resize(400,250,{fit:'cover'}).png().toBuffer(),left:x,top:y});
  composites.push({input:Buffer.from(`<svg width="400" height="32"><rect width="400" height="32" fill="white"/><text x="8" y="23" font-family="Arial" font-size="16">${p.index}. ${p.planId.replaceAll('&','&amp;')}</text></svg>`),left:x,top:y+250});
 }
 await sharp({create:{width:1230,height:1450,channels:3,background:'#eceaf1'}}).composite(composites).png().toFile(new URL('IMAGES-'+(batch+1)+'.png',here).pathname.replace(/^\/(?:([A-Z]:))/, '$1'));
}
console.log('Four QA-only contact sheets; publication originals unchanged.');
