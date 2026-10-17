import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {hash,validatePackage} from './editorial/contract.mjs';
import {verifySourceState} from './editorial/source-state.mjs';
const review=process.argv.find(a=>a.startsWith('--review='))?.slice(9)||'.impeccable/review/all-chair-configurators-20261014';
const fingerprint='content/editorial/source-state.json';
const before=JSON.parse(fs.readFileSync(path.join(review,'before',fingerprint),'utf8'));
const current=JSON.parse(fs.readFileSync(fingerprint,'utf8'));
assert.deepEqual(current,before,'Fingerprint changed externally; reconcile that change first');
function copyCalls(text,file){
 const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),result=[];
 function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&['copyText','copyValue'].includes(node.expression.text))result.push(node.getText(source).replace(/\r\n/g,'\n'));ts.forEachChild(node,visit);}
 visit(source);return result;
}
const changed=[];
for(const item of current.files){
 const text=fs.readFileSync(item.path,'utf8'),actual=hash(text);if(actual===item.sha256)continue;
 const originalPath=path.join(review,'before',item.path);
 assert(fs.existsSync(originalPath),'Unscoped sealed source changed: '+item.path);
 const original=fs.readFileSync(originalPath,'utf8');assert.equal(hash(original),item.sha256,'Original scoped snapshot mismatch: '+item.path);
 assert.deepEqual(copyCalls(text,item.path),copyCalls(original,item.path),'Existing editorial calls changed: '+item.path);
 changed.push({path:item.path,before:item.sha256,after:actual});item.sha256=actual;
}
assert(changed.length>0,'No scoped source change to reconcile');
const packageData=JSON.parse(fs.readFileSync('content/editorial/content-package.json','utf8'));
const baseline=JSON.parse(fs.readFileSync('content/editorial/baseline-package.json','utf8'));
const validation=validatePackage(packageData,baseline);
fs.writeFileSync(path.join(review,'source-reconciliation.json'),JSON.stringify({changed,validation,baselineId:packageData.baselineId,originalFingerprint:hash(fs.readFileSync(path.join(review,'before',fingerprint),'utf8')),reason:'Request-scoped chair engines and immutable per-article assets; original editorial calls, fields, values, baseline and supplier seed preserved.'},null,2)+'\n');
const temp=fingerprint+'.chair-runtime.tmp';fs.writeFileSync(temp,JSON.stringify(current,null,2)+'\n');fs.renameSync(temp,fingerprint);
verifySourceState();console.log(JSON.stringify({reconciled:changed.length,...validation,result:'PASS'}));
