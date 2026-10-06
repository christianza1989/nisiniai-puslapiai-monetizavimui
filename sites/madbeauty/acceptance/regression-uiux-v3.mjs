import {spawn} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..'),out=path.join(root,'research/madbeauty-implementation');
const suites=[
 {name:'backend',files:['backend/backend.test.mjs','backend/fixture-runtime.test.mjs','backend/reschedule-contract.test.mjs'],expected:36,receipt:'backend-tests-v17.tap'},
 {name:'platformHttpCalendar',files:['prototype/platform.test.mjs','prototype/http-adapter.test.mjs','prototype/calendar-layout.test.mjs'],expected:29,receipt:'platform-uiux-tests-v11.tap'},
 {name:'foundation',files:['prototype/foundation.test.mjs'],expected:9,receipt:'foundation-uiux-tests-v11.tap'}
];
const manifest={at:new Date().toISOString(),scope:'Local UIUX V3 regression; exact required suites registered before execution',newTests:['Customer request history: ownership, whitelist, labels/statuses, inactive-service rejection'],removedTests:[],suites:suites.map(s=>({...s,command:[process.execPath,'--test',...s.files.map(f=>'sites/madbeauty/'+f)]}))};
await writeFile(path.join(out,'uiux-regression-manifest-v3.json'),JSON.stringify(manifest,null,2));
const results=await Promise.allSettled(manifest.suites.map(async s=>{
 const output=await new Promise((resolve,reject)=>{const p=spawn(s.command[0],s.command.slice(1),{cwd:root,windowsHide:true});let text='';p.stdout.on('data',d=>text+=d);p.stderr.on('data',d=>text+=d);p.on('error',reject);p.on('close',code=>resolve({text,code}));});
 await writeFile(path.join(out,s.receipt),output.text);
 const passed=Number(output.text.match(/# pass (\d+)/)?.[1]),failed=Number(output.text.match(/# fail (\d+)/)?.[1]);
 if(output.code!==0||passed!==s.expected||failed!==0)throw Error(s.name+' failed: '+JSON.stringify({passed,failed,code:output.code}));
 return {name:s.name,receipt:s.receipt,passed,failed,exitCode:output.code};
}));
manifest.results=results.map(r=>r.status==='fulfilled'?r.value:{error:String(r.reason)});
manifest.totalPassed=manifest.results.reduce((n,r)=>n+(r.passed||0),0);manifest.complete=results.every(r=>r.status==='fulfilled');
await writeFile(path.join(out,'uiux-regression-manifest-v3.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest));if(!manifest.complete)process.exitCode=1;
