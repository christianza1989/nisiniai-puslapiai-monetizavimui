import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createAppServer} from '../prototype/app-server.mjs';
const server=createAppServer({enabled:false,contentDiscovery:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const root=path.resolve(import.meta.dirname,'../../../research/madbeauty-implementation'),rows=[];await mkdir(root,{recursive:true});
try{for(const route of ['/gidai/kas-ieina-i-manikiuro-kaina','/gidai','/content.json','/sitemap.xml','/llms.txt','/llms-full.txt']){const response=await fetch('http://127.0.0.1:'+server.address().port+route),body=await response.text();assert.ok(!body.includes('Šiame pavyzdyje bazinė paslauga'));assert.ok(!body.includes('baf25810-3318-4b27-b59c-e0c82093824d'));if(route.startsWith('/gidai/'))assert.equal(response.status,404);if(route==='/content.json')assert.equal(JSON.parse(body).pages.length,0);rows.push({route,status:response.status,containsDraft:false});await writeFile(path.join(root,'draft-http-'+route.replaceAll('/','_')+'.txt'),body);}}finally{await new Promise(r=>server.close(r));}
await writeFile(path.join(root,'content-draft-http.json'),JSON.stringify({date:'2026-10-05',siteId:'madbeauty',scope:'actual HTTP before first approval/import; common studio draft stays private',status:'PASS',rows},null,2)+'\n');console.log(JSON.stringify({status:'PASS',requests:rows.length}));
