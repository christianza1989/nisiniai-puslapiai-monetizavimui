import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const run=promisify(execFile),out=path.resolve(import.meta.dirname,'../../../research/madbeauty-implementation'),cli='C:/Users/lenovo/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/lighthouse/cli/index.js';
await mkdir(out,{recursive:true});const rows=[];
for(const [name,url] of [['home','/'],['guide','/gidai/kas-ieina-i-manikiuro-kaina'],['calendar','/meistrui/kalendorius']].filter(([name])=>!process.env.MADBEAUTY_LH_ONLY||name===process.env.MADBEAUTY_LH_ONLY)){
  const output=path.join(out,'lighthouse-'+name+(process.env.MADBEAUTY_LH_SUFFIX||''));let cleanupError=false;
  try{await run(process.execPath,[cli,'http://127.0.0.1:8788'+url,'--output=json','--output=html','--output-path='+output,'--chrome-flags=--headless --no-sandbox','--quiet'],{maxBuffer:512000});}catch(e){if(!String(e.stderr).includes('EBUSY'))throw e;cleanupError=true;}
  const r=JSON.parse(await readFile(output+'.report.json','utf8'));if(r.runtimeError||r.categories.performance.score===null)throw Error('Invalid lab run');
  const row={name,at:r.fetchTime,url:r.finalDisplayedUrl,lighthouse:r.lighthouseVersion,cleanupError,categories:Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,Math.round(v.score*100)])),metrics:Object.fromEntries(['largest-contentful-paint','total-blocking-time','cumulative-layout-shift','total-byte-weight'].map(k=>[k,{value:r.audits[k].numericValue,display:r.audits[k].displayValue}])),failures:Object.entries(r.audits).filter(([,a])=>a.score===0).map(([id,a])=>({id,title:a.title,details:a.details}))};rows.push(row);console.log(JSON.stringify({...row,failures:row.failures.map(f=>f.id)}));
}
await writeFile(path.join(out,'performance-summary.json'),JSON.stringify({method:'Mobile Lighthouse, private local demo, noindex intentional. Fresh browser calendar route shows role entry; calendar UX measured separately in CUA.',rows},null,2));
