import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {Script} from 'node:vm';
const root=path.resolve(process.argv[2]||'../dovanos-memorycasting/.sites-runtime/phonebridger-production');
const release=JSON.parse(await readFile(path.join(root,'release.json'),'utf8'));
const origin=process.argv[3];
if(origin&&origin!=='https://phonebridger.com')throw Error('Use the exact authorized canonical origin.');
const headers=new Set(),footers=new Set();
for(const slug of Object.keys(release.routes)){
 let html;
 if(origin){const response=await fetch(origin+'/'+slug,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Public route failed: '+slug);html=await response.text();}
 else html=await readFile(path.join(root,'assets',slug,'index.html'),'utf8');
 const h=html.match(/<header class="pb-global-header">[\s\S]*?<\/header>/g),f=html.match(/<footer class="pb-global-footer">[\s\S]*?<\/footer>/g);
 if(h?.length!==1||f?.length!==1||/<(?:header|footer) class="(?:site-header|inner-header|site-footer|inner-footer)\b/.test(html))throw Error('Shell missing or duplicated: '+slug);
 headers.add(h[0]);footers.add(f[0]);
 for(const link of (h[0]+f[0]).matchAll(/href="([^"#]+)"/g)){
  if(link[1].startsWith('mailto:')||link[1].startsWith('/assets/'))continue;
  const target=new URL(link[1],'https://phonebridger.com'),targetSlug=target.pathname.replace(/^\/|\/$/g,'');
  if(!(targetSlug in release.routes))throw Error('Missing shell route: '+link[1]);
 }
}
if(headers.size!==1||footers.size!==1)throw Error('Page shell versions differ');
for(const file of ['app.js','assets/shared-shell/shell.js'])new Script(await readFile(path.join(root,'assets',file),'utf8'));
if(origin)for(const file of ['shell.css','shell.js','icons.svg','cards.svg']){const response=await fetch(origin+'/assets/shared-shell/'+file,{signal:AbortSignal.timeout(15000)});if(!response.ok||await response.text()!==await readFile(path.join(root,'assets/assets/shared-shell',file),'utf8'))throw Error('Public shell asset differs: '+file);}
console.log(JSON.stringify({origin:origin||'local build',routes:Object.keys(release.routes).length,headerVersions:headers.size,footerVersions:footers.size,links:'PASS',scripts:'PASS',...(origin?{deployedAssets:'PASS'}:{})}));
