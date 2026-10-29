import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'../../output/signaturepads-migration-20261029');
const target=path.resolve('../niche-public-core/sites/signaturepads/migration');
const data=JSON.parse(await readFile(path.join(root,'normalized-browser.json'),'utf8'));
const fragments=JSON.parse(await readFile(path.join(root,'fragments.json'),'utf8'));
for(const fragment of fragments){const route=data.routes.find(r=>r.path===fragment.path);if(route&&route.kind!=='catalog'){route.html=fragment.html;}}
for(const product of data.products){const route=data.routes.find(r=>r.productId===product.id);product.name=route.title;product.contentHtml=route.html;}
data.home.categoryCards=[
 {title:'PARAŠO PLANŠETĖS',href:'/iranga/paraso-plansetes/',image:data.home.images[1]},
 {title:'MONITORIŲ IŠPLĖTIMAI',href:'/iranga/elektroninio-paraso-plansetes-monitoriu-ispletimai/',image:data.home.images[2]},
 {title:'MOBILŪS SPRENDIMAI',href:'/produktas/programine-iranga-signotec-signosign-universal/',image:data.home.images[3]},
 {title:'PROGRAMINĖ ĮRANGA',href:'/iranga/programine-iranga/',image:data.home.images[4]}
];
data.contact={email:'sales@signaturepads.lt',phone:'+370 686 88369'};
data.status='unapproved-local-migration-preview';
data.ownerScope={retainExistingAppearance:true,retainAllText:true,retainUrls:true,inquiryOnly:true};
const assets=new Set(data.assets);
data.favicon='/wp-content/uploads/2023/10/cropped-Favicon-32x32.jpg';
assets.add(data.favicon);
for(const r of data.routes)for(const m of r.html.matchAll(/(?:src|href)="(\/wp-content\/uploads\/[^"#?]+)/g))assets.add(m[1].replaceAll('&amp;','&'));
for(const p of data.products)for(const image of p.images){image.variants=[];for(const m of image.srcset.matchAll(/(https:\/\/signaturepads\.lt\/[^,\s]+)\s+(\d+)w/g)){const src=new URL(m[1]).pathname;const width=+m[2];if(width<=1024){image.variants.push({src,width});assets.add(src);}}}
await mkdir(target,{recursive:true});
await mkdir(path.join(root,'public'),{recursive:true});
const manifest=[],queue=[...assets];let next=0;
await Promise.all(Array.from({length:4},async()=>{while(next<queue.length){const src=queue[next++];const file=path.resolve(root,'public','.'+decodeURIComponent(src));if(!file.startsWith(path.join(root,'public')+path.sep))throw new Error('unsafe asset path');const url=data.origin+src;try{let bytes,contentType;try{bytes=await readFile(file);}catch{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(String(response.status));bytes=Buffer.from(await response.arrayBuffer());contentType=response.headers.get('content-type');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes);}manifest.push({url,path:src,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),...(contentType?{contentType}:{})});}catch(e){manifest.push({url,path:src,error:String(e)});}}}));
if(process.argv[3]){
  const sharp=createRequire(path.resolve(process.argv[3]))('sharp');
  const images=[data.home.logo,...data.home.images,...data.home.categoryCards.map(c=>c.image),...data.products.flatMap(p=>p.images),...data.routes.flatMap(r=>r.images)];
  for(const image of images){try{const info=await sharp(path.join(root,'public',image.src)).metadata();image.width=info.width;image.height=info.height;}catch{}}
}
// Retain the incumbent font, self-hosted. Google's stylesheet defines subsets
// and font weights; it is not replaced with an unrelated design font.
const fontCss=await fetch('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',{headers:{'User-Agent':'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36'}}).then(r=>r.text());
let css=fontCss;
for(const url of new Set([...fontCss.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]))){const bytes=Buffer.from(await fetch(url).then(r=>r.arrayBuffer()));const name='/signaturepads/fonts/'+createHash('sha256').update(bytes).digest('hex').slice(0,16)+'.woff2';const file=path.join(root,'public',name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes);css=css.replaceAll(url,name);manifest.push({url,path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await mkdir(path.join(root,'public/signaturepads'),{recursive:true});
await writeFile(path.join(root,'public/signaturepads/fonts.css'),css);
const license=await fetch('https://raw.githubusercontent.com/googlefonts/opensans/main/OFL.txt');
if(license.ok)await writeFile(path.join(root,'public/signaturepads/Open-Sans-OFL.txt'),await license.text());
await writeFile(path.join(target,'site-source.json'),JSON.stringify(data,null,2));
await writeFile(path.join(root,'asset-manifest.json'),JSON.stringify(manifest,null,2));
await writeFile(path.join(target,'url-map.json'),JSON.stringify(data.routes.map(r=>({source:data.origin+r.path,target:r.path,status:'preserve-200',kind:r.kind})),null,2));
console.log(JSON.stringify({routes:data.routes.length,products:data.products.length,html:data.routes.map(r=>({path:r.path,characters:r.html.length})),assets:manifest.length,bytes:manifest.reduce((n,r)=>n+(r.bytes||0),0),failures:manifest.filter(r=>r.error)},null,2));
