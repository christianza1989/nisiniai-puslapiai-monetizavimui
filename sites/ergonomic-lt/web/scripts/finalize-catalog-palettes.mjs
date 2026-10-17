import fs from 'node:fs/promises';
import sharp from 'sharp';
const file='content/configurator-catalog.json',data=JSON.parse(await fs.readFile(file,'utf8')),materials=JSON.parse(await fs.readFile('content/render-materials-catalog.json','utf8'));
for(const family of data.families)for(const article of family.articles)article.name=family.anchors.find(a=>a.article===article.code).name;
for(const [field,vs] of Object.entries(data.palettes))if(/COLOR|CHCOL/.test(field))for(const [code,item] of Object.entries(vs)){
 let image=item.image||materials.colors[code]?.image;
 if(!image)try{const name='/media/configurator/catalog-swatches/'+code.toLowerCase()+'.jpg';await fs.access('public'+name);image=name;}catch{}
 if(!image)continue;
 const {data:rgb,info}=await sharp('public'+image).resize(16,16).removeAlpha().raw().toBuffer({resolveWithObject:true}),total=[0,0,0];
 for(let i=0;i<rgb.length;i+=info.channels)for(let c=0;c<3;c++)total[c]+=rgb[i+c];
 item.image=image;item.color='#'+total.map(n=>Math.round(n/256).toString(16).padStart(2,'0')).join('');
}
await fs.writeFile(file,JSON.stringify(data));console.log('Local finish control palettes finalized');
