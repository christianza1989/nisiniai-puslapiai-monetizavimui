// Refresh captured finish dependencies without rebuilding unchanged geometry.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const file='content/configurator-expanded.json',data=JSON.parse(await fs.readFile(file,'utf8'));
const suffix=k=>k.split('.').at(-1),colors=new Map();
for(const family of data.families)for(const anchor of family.anchors){
 const source=JSON.parse(await fs.readFile(path.resolve('../research/configurator/expanded-source',family.id,anchor.id+'.json'),'utf8'));
 const profiles=[...source.finishProfiles,...(source.sideFinishProfiles||[])];
 for(const p of [source,...Object.values(source.patches),...profiles])for(const key of Object.keys(p.properties))if(/_OPTIONS\.|_FINISHES\./.test(key))anchor.classes[suffix(key)]=key.split('.')[0];
 anchor.profiles=profiles.map(p=>({defaults:Object.fromEntries(Object.entries(p.properties).filter(([k])=>/_OPTIONS\.|_FINISHES\./.test(k)).map(([k,v])=>[suffix(k),v.value])),choices:Object.fromEntries(Object.entries(p.choices).map(([k,list])=>[suffix(k),list.filter(v=>v.selectable).map(v=>v.value)]))}));
 for(const p of profiles)for(const [key,list] of Object.entries(p.choices))for(const v of list)if(v.selectable){
  const k=suffix(key);data.palettes[k]??={};if(data.palettes[k][v.value])continue;
  const item={text:v.text};
  if(v.icon&&(/COLOR|CHCOL/.test(k))){
   const image='/media/configurator/finishes/'+v.value.toLowerCase()+'.jpg';
   if(!colors.has(v.value)){const {data:rgb,info}=await sharp(path.join('public',image)).resize(16,16).removeAlpha().raw().toBuffer({resolveWithObject:true});const sum=[0,0,0];for(let i=0;i<rgb.length;i+=info.channels)for(let c=0;c<3;c++)sum[c]+=rgb[i+c];colors.set(v.value,'#'+sum.map(v=>Math.round(v/256).toString(16).padStart(2,'0')).join(''));}
   item.image=image;item.color=colors.get(v.value);
  }
  data.palettes[k][v.value]=item;
 }
}
await fs.writeFile(file,JSON.stringify(data));console.log('Refreshed source finish profiles; all geometry and source hashes preserved.');
