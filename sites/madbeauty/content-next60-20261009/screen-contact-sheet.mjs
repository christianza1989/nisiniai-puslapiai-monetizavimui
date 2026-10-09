import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire('C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/package.json'),sharp=require('sharp');
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
for(const device of ['desktop','mobile'])for(let batch=0;batch<4;batch++){
 const width=device==='mobile'?240:410,height=device==='mobile'?650:380,cols=3,rows=5,inputs=[];
 for(let k=0;k<15;k++){
  const item=sel.pages[batch*15+k],raw=await fs.readFile(new URL('screenshots/'+item.planId+'-'+device+'.png',here)),metadata=await sharp(raw).metadata();
  const crop=await sharp(raw).extract({left:0,top:0,width:metadata.width,height:Math.min(metadata.height,device==='mobile'?1000:1100)}).resize(width,height-30,{fit:'contain',background:'white'}).png().toBuffer();
  inputs.push({input:crop,left:(k%cols)*width,top:Math.floor(k/cols)*height});
  inputs.push({input:Buffer.from(`<svg width="${width}" height="30"><rect width="${width}" height="30" fill="white"/><text x="5" y="21" font-family="Arial" font-size="12">${batch*15+k+1}. ${item.planId}</text></svg>`),left:(k%cols)*width,top:Math.floor(k/cols)*height+height-30});
 }
 await sharp({create:{width:width*cols,height:height*rows,channels:3,background:'#e4e0df'}}).composite(inputs).png().toFile(fileURLToPath(new URL('SCREENS-'+device+'-'+(batch+1)+'.png',here)));
}
console.log('Eight QA contact sheets of actual native article screenshots; publication photos unchanged.');
