import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {initialize,saveResponsiveAsset,getSite} from '../../content-studio/src/model.mjs';
const siteId='autoelektrikaivilniuje',dir=import.meta.dirname;
const generated='C:/Users/lenovo/.codex/generated_images/01a101d2-0f39-7332-82c1-695771e16875/';
const inputs=[
 ['hero','exec-9eb62735-abd7-471f-8c70-0ade298d9a3b.png','Mėlynas automobilis prie atvirų dirbtuvių vartų'],
 ['battery','exec-b4b67fb6-4afd-4dce-9b62-4fa2ab91c2b5.png','Automobilio akumuliatorius įprastai sumontuotas variklio skyriuje'],
 ['start','exec-29810869-f1e9-401d-9321-99abc6825b2a.png','Vairuotojo ranka prie automobilio užvedimo mygtuko'],
 ['scope','exec-c8f51241-84fa-4864-a3e8-36ceb8a194aa.png','Diagnostikos įrankis ir tuščias darbo aprašo lapas ant dirbtuvių stalo']
];
await initialize();await mkdir(dir+'/media',{recursive:true});
let result={};try{result=JSON.parse(await readFile(dir+'/MEDIA.json','utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
for(const [key,file,alt]of inputs){
 if(result[key])continue;
 const source=generated+file,bytes=await readFile(source),prompt=await readFile(dir+'/research/'+key+'-prompt.txt','utf8');
 await copyFile(source,dir+'/media/'+key+'.png');
 const asset=await saveResponsiveAsset(siteId,{mime:'image/png',alt,rights:'Originali projekto iliustracija, sukurta Codex integruotu ImageGen; trečiųjų šalių fotografija nenaudota.',prompt,credit:''},bytes);
 result[key]={id:asset.id,source,sha256:createHash('sha256').update(bytes).digest('hex'),alt,promptFile:'research/'+key+'-prompt.txt',role:key,review:{date:'2026-10-03',reviewer:'codex-editorial-review',accepted:true,notes:'Peržiūrėtas visas kadras: nebranduotas kontekstas, nėra tikro kliento ar mūsų dirbtuvių teiginio. Matomas diagnostikos ekranas tuščias; ne mokomoji jungimo schema.'},variants:asset.variants};
 await writeFile(dir+'/MEDIA.json',JSON.stringify(result,null,2)+'\n');
 console.log(key,asset.id,asset.variants.map(v=>`${v.width}x${v.height}/${v.bytes}B`).join(' '));
}
const history=JSON.parse(await readFile(dir+'/history/audit.json','utf8'));
await writeFile(dir+'/history/url-decisions.json',JSON.stringify({date:new Date().toISOString(),publicChangesApplied:false,redirects:[],decisions:history.inventory.map(x=>({path:x.path,action:x.path==='/'?'keep-new-original-content':'no-redirect',reason:x.path==='/'?'Teminė sąsaja išlieka, turinys ir operatorius nauji.':'Ankstesnis operatorius arba kita tema; tikro semantiškai lygiaverčio dabartinio vykdymo puslapio nėra. Istorinio kontakto ir atsiliepimų nepaveldime.'}))},null,2)+'\n');
console.log('Media families:',Object.keys(result).length,'studio assets:',(await getSite(siteId)).assets.length);
