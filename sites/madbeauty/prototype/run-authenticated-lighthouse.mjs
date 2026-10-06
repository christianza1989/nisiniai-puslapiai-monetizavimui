import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {openStore} from '../backend/store.mjs';
import {createAuth} from '../backend/auth.mjs';
const version=process.env.MB_LH_VERSION||'v7';if(!/^v[0-9]+$/.test(version))throw Error('Version must be v followed by digits');
const runtime=path.resolve(import.meta.dirname,'../runtime'),out=path.resolve('research/madbeauty-implementation'),origin='http://127.0.0.1:8788',store=openStore({filename:path.join(runtime,'platform-preview.sqlite'),fixturePreview:true});
let token,csrf,organizationId;
try{
 const auth=createAuth(store),s=auth.session(null),c=auth.start(s,'madbeauty-provider-first-v1@example.com','local-performance-test'),verified=auth.verify(s,c.challengeId,store.capture(c.challengeId).code,'local-performance-test');token=verified.session.token;csrf=verified.session.csrf;
 organizationId=store.read().memberships.find(m=>m.accountId===verified.user.id)?.organizationId;if(!organizationId)throw Error('Authenticated provider workspace required');
}finally{store.close();}
const cookie='madbeauty_sid='+token,preflight=await fetch(origin+'/api/madbeauty/session',{headers:{cookie}}).then(r=>r.json());if(!preflight.organizations.some(o=>o.id===organizationId))throw Error('Provider session preflight failed');
const headers=path.join(runtime,'lighthouse-auth-headers-'+version+'.json');await writeFile(headers,JSON.stringify({Cookie:cookie}));
const output=path.join(runtime,'lighthouse-calendar-auth-'+version),cli='C:/Users/lenovo/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/lighthouse/cli/index.js';let cleanupError=false;
try{await promisify(execFile)(process.execPath,[cli,origin+'/meistrui/kalendorius','--extra-headers='+headers,'--output=json','--output=html','--output-path='+output,'--chrome-flags=--headless --no-sandbox','--quiet'],{maxBuffer:512000});}catch(e){if(!String(e.stderr).includes('EBUSY'))throw e;cleanupError=true;}
const raw=await readFile(output+'.report.json','utf8'),report=JSON.parse(raw);if(report.runtimeError||report.categories.performance.score===null)throw Error('Invalid Lighthouse run');
const redact=text=>[cookie,token,csrf,preflight.csrf].filter(Boolean).reduce((value,secret)=>value.replaceAll(secret,'[redacted-local-test-secret]'),text);
await writeFile(path.join(out,'lighthouse-calendar-auth-'+version+'.report.json'),redact(raw));await writeFile(path.join(out,'lighthouse-calendar-auth-'+version+'.report.html'),redact(await readFile(output+'.report.html','utf8')));
if(report.audits['final-screenshot']?.details?.data)await writeFile(path.join(out,'lighthouse-calendar-auth-'+version+'.png'),Buffer.from(report.audits['final-screenshot'].details.data.split(',')[1],'base64'));
const receipt={environment:'private local preview, authenticated provider, same durable API, fictional QA record, noindex intentional',at:report.fetchTime,url:report.finalDisplayedUrl,organizationId,lighthouse:report.lighthouseVersion,cleanupError,categories:Object.fromEntries(Object.entries(report.categories).map(([k,v])=>[k,Math.round(v.score*100)])),metrics:Object.fromEntries(['largest-contentful-paint','total-blocking-time','cumulative-layout-shift','total-byte-weight'].map(k=>[k,{value:report.audits[k].numericValue,display:report.audits[k].displayValue}])),failures:Object.entries(report.audits).filter(([,a])=>a.score===0).map(([id,a])=>({id,title:a.title,details:a.details}))};
await writeFile(path.join(out,'performance-authenticated-'+version+'.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({...receipt,failures:receipt.failures.map(f=>f.id)}));
