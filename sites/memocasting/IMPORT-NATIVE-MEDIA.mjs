import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {nativeMedia} from './NATIVE-MEDIA.mjs';
import {pages} from './CONTENT.mjs';
process.env.STUDIO_DATA_DIR=fileURLToPath(new URL('./studio-data/',import.meta.url));
process.env.STUDIO_OUTPUT_DIR=fileURLToPath(new URL('./studio-output/',import.meta.url));
const {getSite,saveResponsiveAsset}=await import('../../content-studio/src/model.mjs');
const owners=JSON.parse(await readFile(new URL('./OWNER-ASSETS.json',import.meta.url),'utf8')).entries;
let site=await getSite('memocasting');const entries=[];
for(const [language,descriptions]of Object.entries(nativeMedia))for(const [key,[alt,credit]]of Object.entries(descriptions)){
 const owner=owners.find(e=>e.key===key);if(owner?.decision.startsWith('private'))throw Error('Private owner image may not enter native public plan');
 const source=owner?new URL('file:///C:/Users/Lenovo/Downloads/holders3/'+owner.sourceFile):new URL('./media-originals/'+key+'.png',import.meta.url);
 const bytes=await readFile(source),sourceSha256=createHash('sha256').update(bytes).digest('hex');
 if(owner&&sourceSha256!==owner.sourceSha256)throw Error('Owner original changed: '+key);
 const page=pages.find(p=>p.image===key),baseAsset=owner?site.assets.find(a=>a.id===owner.variantIds[0]):site.assets.find(a=>a.id===site.pages.find(p=>p.slug===page?.slug)?.media[0]?.id);
 if(!baseAsset)throw Error('Missing inspected source asset: '+key);
 let family=site.assets.filter(a=>a.alt===alt&&a.credit===credit);
 if(!family.length)family=(await saveResponsiveAsset(site.id,{mime:owner?'image/webp':'image/png',alt,credit,rights:baseAsset.rights,prompt:baseAsset.prompt||'Same inspected original; native descriptive metadata only.'},bytes)).variants;
 entries.push({key:key+'-'+language,language,sourceKey:key,sourceSha256,alt,credit,variantIds:family.map(a=>a.id),variants:family.map(a=>({id:a.id,width:a.width,height:a.height,src:a.src}))});
 site=await getSite(site.id);
}
await writeFile(new URL('./NATIVE-ASSETS.json',import.meta.url),JSON.stringify({version:1,preparedOn:'2026-10-12',scope:'Same previously inspected originals; native alt/caption families, no new generation; not yet approved/published',entries},null,2));
console.log(JSON.stringify({nativeFamilies:entries.length,nativeVariants:entries.reduce((n,e)=>n+e.variantIds.length,0),newGeneration:false,originalsUnchanged:true,published:false}));
