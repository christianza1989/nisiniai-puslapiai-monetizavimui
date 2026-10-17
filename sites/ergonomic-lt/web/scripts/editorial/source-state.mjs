import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {hash} from './contract.mjs';
const file=path.resolve('content/editorial/source-state.json');
function catalogueState(){
 const database=path.resolve(process.env.RUNTIME_DIR||'.runtime','ergonomic.sqlite');
 if(!fs.existsSync(database))return hash({imports:[],edits:[]});
 const db=new DatabaseSync(database,{readOnly:true});
 try{return hash({imports:db.prepare('SELECT id,data FROM supplier_import ORDER BY id').all(),edits:db.prepare('SELECT id,data FROM product_edits ORDER BY id').all()});}
 finally{db.close();}
}
export function sealSourceState(){
 assert(!fs.existsSync(file),'Source state is already sealed; rebase an edited package explicitly instead of replacing its source fingerprint.');
 const registry=JSON.parse(fs.readFileSync('content/editorial/ui-registry.json','utf8'));
 const paths=[...new Set([...registry.flatMap(f=>(f.uses||[]).map(u=>u.file)),
  'content/seed.json','content/legacy-additions.json','src/lib/approved-home-markup.ts',
  'src/lib/legacy-article.ts','src/lib/public-product-copy.ts','src/lib/configuration-labels.ts',
  'src/lib/category-labels.ts','src/lib/product-models.ts'])].sort();
 fs.writeFileSync(file,JSON.stringify({files:paths.map(p=>({path:p,sha256:hash(fs.readFileSync(p,'utf8'))})),catalogueHash:catalogueState()},null,2)+'\n');
}
export function verifySourceState(){
 if(!fs.existsSync(file))return;
 const state=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const item of state.files)assert.equal(hash(fs.readFileSync(item.path,'utf8')),item.sha256,'Editorial source changed: '+item.path+'. Reconcile the returned package with the new source before importing.');
 assert.equal(catalogueState(),state.catalogueHash,'Local catalogue changed since export. Reconcile source facts and edits before importing.');
}
