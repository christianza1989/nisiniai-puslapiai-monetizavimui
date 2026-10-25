import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {sourceMirrors} from '../scripts/refine-catalog-profiles.mjs';

async function withCapture(changedFollower:string,check:(anchor:any)=>void){
 const root=path.resolve('../research/configurator/refinement-tests');await fs.mkdir(root,{recursive:true});
 const temporary=await fs.mkdtemp(path.join(root,'capture-'));const directory=path.join(temporary,'KTEST','default');await fs.mkdir(directory,{recursive:true});
 const state=(control:string,follower:string)=>({properties:{
  'KTEST_FINISHES.CUPHBACKRESTCOLOR':{value:control,visible:true,editable:true},
  'KTEST_FINISHES.CUPHSEATCOLOR':{value:follower,visible:true,editable:false},
 },choices:{'KTEST_FINISHES.CUPHBACKRESTCOLOR':[{value:'CSE42',selectable:true},{value:'CSE33',selectable:true}]}});
 const files={'base.json':state('CSE42','CSE42'),'role.json':state('CSE33',changedFollower),'manifest.json':{base:'base.json',profiles:[],materials:[],roles:{'KTEST_FINISHES.CUPHBACKRESTCOLOR':'role.json'}}};
 for(const [file,value] of Object.entries(files))await fs.writeFile(path.join(directory,file),JSON.stringify(value));
 try{const anchor={article:'KTEST',id:'KTEST:default',profiles:[],defaults:{}};await sourceMirrors(anchor,temporary);check(anchor);}
 finally{assert(temporary.startsWith(root+path.sep));await fs.rm(temporary,{recursive:true,force:true});}
}
test('source finish refinement follows a read-only seat colour proven by the original role geometry capture',async()=>{
 await withCapture('CSE33',anchor=>assert.deepEqual(anchor.profiles.find((rule:any)=>rule.derived==='fixed-color-source-probes')?.mirrors,{CUPHSEATCOLOR:'CUPHBACKRESTCOLOR'}));
});
test('equal baseline upholstery colours do not establish a mirror when the measured colour change differs',async()=>{
 await withCapture('CSE42',anchor=>assert.equal(anchor.profiles.some((rule:any)=>rule.derived==='fixed-color-source-probes'),false));
});
