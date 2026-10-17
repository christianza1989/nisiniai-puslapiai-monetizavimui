import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {hash} from './editorial/contract.mjs';
const original='D:/ergonomic.lt_svetaine/web';
const out='D:/Core/output/ergonomic-catalog-dedupe-20261016';
const statePath='content/editorial/source-state.json';
const before=fs.readFileSync(statePath,'utf8'),state=JSON.parse(before);
const allowed=new Set(['src/lib/product-models.ts','src/lib/seo-collections.ts','src/app/produktai/[category]/[product]/page.tsx']);
function copyCalls(source,file){
 const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),calls=[];
 function walk(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&['copyText','copyValue'].includes(node.expression.text))calls.push(node.arguments.map(a=>a.getText(tree)));ts.forEachChild(node,walk);}walk(tree);return calls;
}
const changes=[];
for(const item of state.files){
 const next=fs.readFileSync(item.path,'utf8'),prior=fs.readFileSync(original+'/'+item.path,'utf8');
 assert.equal(hash(prior),item.sha256,'Baseline itself has changed: '+item.path);
 if(hash(next)===item.sha256)continue;
 assert(allowed.has(item.path),'Unreviewed source change '+item.path);
 assert.deepEqual(copyCalls(next,item.path),copyCalls(prior,item.path),'Editorial keys or fallbacks changed');
 changes.push({path:item.path,before:item.sha256,after:hash(next),copyKeysAndFallbacksUnchanged:true});item.sha256=hash(next);
}
assert.deepEqual(changes.map(c=>c.path).sort(),[...allowed].sort());
for(const file of ['seed.json','editorial/content-package.json','editorial/baseline-package.json','editorial/compiled-server.json','editorial/compiled-ui.json','photo-attribution.json'])assert.deepEqual(fs.readFileSync('content/'+file),fs.readFileSync(original+'/content/'+file));
assert(!fs.existsSync(out+'/EDITORIAL-SOURCE-STATE-BEFORE.json'));
fs.writeFileSync(out+'/EDITORIAL-SOURCE-STATE-BEFORE.json',before);
fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
fs.writeFileSync(out+'/EDITORIAL-SOURCE-RECONCILIATION.json',JSON.stringify({at:new Date().toISOString(),historicalSourceStatePreserved:true,editorialRevisionAndBindingsUnchanged:true,sourceCodeOnly:changes},null,2));
console.log(JSON.stringify({result:'PASS',changes}));
