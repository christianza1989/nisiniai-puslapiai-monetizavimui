import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createAppServer} from '../prototype/app-server.mjs';
const server=createAppServer({enabled:false,contentDiscovery:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let output='';try{const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['tests/seo-core-smoke.mjs'],{cwd:path.resolve(import.meta.dirname,'../runtime/output/content-core'),env:{...process.env,SEO_SMOKE_SITE_ID:'madbeauty',SEO_SMOKE_BASE_URL:'http://127.0.0.1:'+server.address().port},windowsHide:true});child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);child.on('error',reject);child.on('exit',resolve);});await writeFile(path.resolve(import.meta.dirname,'../../../research/madbeauty-implementation/content-common-seo-smoke.txt'),output);process.stdout.write(output);if(code!==0)process.exitCode=code||1;}finally{await new Promise(r=>server.close(r));}
