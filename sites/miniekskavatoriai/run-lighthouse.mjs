import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const run=promisify(execFile),cli='C:/Users/lenovo/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/lighthouse/cli/index.js',rows=[];
for(const [name,url] of [['home','/'],['guide','/nuomos-kainos-sudetis'],['tool','/transejos-kasimas']]){
 const out=path.join(import.meta.dirname,'qa',`lighthouse-${name}`);let cleanupError=false;
 try{await run(process.execPath,[cli,'http://127.0.0.1:8794'+url,'--output=json','--output=html','--output-path='+out,'--chrome-flags=--headless --no-sandbox','--quiet'],{cwd:import.meta.dirname,maxBuffer:512000});}catch(e){if(!String(e.stderr).includes('EBUSY'))throw e;cleanupError=true;}
 const r=JSON.parse(await readFile(out+'.report.json','utf8'));if(r.runtimeError||r.categories.performance.score===null)throw Error('Invalid lab run');
 const row={name,date:r.fetchTime,url:r.finalDisplayedUrl,cleanupError,lighthouse:r.lighthouseVersion,environment:r.environment,settings:r.configSettings,categories:Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,Math.round(v.score*100)])),metrics:Object.fromEntries(['largest-contentful-paint','total-blocking-time','cumulative-layout-shift','total-byte-weight'].map(k=>[k,{value:r.audits[k].numericValue,display:r.audits[k].displayValue}]))};rows.push(row);console.log(JSON.stringify(row));
}
await writeFile(new URL('./qa/performance-summary.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),method:'Mobile Lighthouse on isolated production worker; GET-only canonical host bridge; real original media. Local lab, no field evidence.',rows},null,2));
