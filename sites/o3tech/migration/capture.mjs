import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {parseHTML} from '../../../../tools/node_modules/linkedom/esm/index.js';
const root=path.resolve(process.env.O3TECH_MIGRATION_ROOT||path.resolve(import.meta.dirname,'../../../..')), out=path.join(root,'private','capture');
await mkdir(out,{recursive:true});
const manifest=[];
async function capture(url,kind){
 const r=await fetch(url,{signal:AbortSignal.timeout(25000)});const bytes=Buffer.from(await r.arrayBuffer());
 const sha=createHash('sha256').update(bytes).digest('hex');const file=kind+'-'+sha.slice(0,16)+(kind==='api'?'.json':'.html');
 await writeFile(path.join(out,file),bytes);manifest.push({url,status:r.status,bytes:bytes.length,sha256:sha,file,kind,at:new Date().toISOString()});
 return {ok:r.ok,text:bytes.toString('utf8'),file};
}
const apis={};
for(const [key,endpoint] of Object.entries({pages:'/wp-json/wp/v2/pages?per_page=100',products:'/wp-json/wc/store/v1/products?per_page=100',categories:'/wp-json/wc/store/v1/products/categories?per_page=100'})){
 const r=await capture('https://o3tech.lt'+endpoint,'api');apis[key]=r.ok?JSON.parse(r.text):[];
}
await writeFile(path.join(out,'api.json'),JSON.stringify(apis,null,2));
const urls=new Set(['https://o3tech.lt/',...apis.pages.map(p=>p.link),...apis.products.map(p=>p.permalink),...apis.categories.map(p=>p.permalink)]);
const sitemap=await capture('https://o3tech.lt/sitemap_index.xml','sitemap');
for(const m of sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)){
 if(!m[1].startsWith('https://o3tech.lt/'))continue;
 const s=await capture(m[1],'sitemap');for(const u of s.text.matchAll(/<loc>([^<]+)<\/loc>/g))if(!/uploads|attachment|author\//.test(u[1]))urls.add(u[1]);
}
const pages=[];
for(const url of urls){
 if(pages.length>=80)throw Error('Bounded inventory exceeds80');
 try{
 const r=await capture(url,'page');if(!r.ok)continue;const {document:d}=parseHTML(r.text);
 const main=d.querySelector('#main')||d.querySelector('main')||d.body;
 const images=[...main.querySelectorAll('img')].map(i=>({src:i.getAttribute('data-src')||i.getAttribute('src'),srcset:i.getAttribute('data-srcset')||i.getAttribute('srcset'),alt:i.getAttribute('alt')||'',width:i.getAttribute('width'),height:i.getAttribute('height')}));
 const links=[...d.querySelectorAll('a[href]')].map(a=>({label:a.textContent.trim(),href:a.getAttribute('href')}));
 for(const l of links){try{const u=new URL(l.href,url);if(u.hostname==='o3tech.lt'&&!u.search&&!u.hash&&/\/(?:produktas|produkto-kategorija)\//.test(u.pathname))urls.add(u.href);}catch{}}
 const styles=[...d.querySelectorAll('style')].map(x=>({id:x.id,css:x.textContent}));
 const styleLinks=[...d.querySelectorAll('link[href]')].filter(x=>x.getAttribute('as')==='style'||x.getAttribute('rel')==='stylesheet').map(x=>x.getAttribute('href'));
 pages.push({url,path:new URL(url).pathname,title:d.querySelector('title')?.textContent||'',description:d.querySelector('meta[name=description]')?.content||'',bodyClass:d.body.className,html:main.innerHTML,images,links,styles,styleLinks,sourceFile:r.file});
 console.log('Captured '+new URL(url).pathname);
 }catch(e){manifest.push({url,error:e.message,kind:'page'});}
}
await writeFile(path.join(out,'pages.json'),JSON.stringify(pages,null,2));
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({pages:pages.length,wordpressPages:apis.pages.length,products:apis.products.length,categories:apis.categories.length,errors:manifest.filter(x=>x.error||x.status>=400)}));
