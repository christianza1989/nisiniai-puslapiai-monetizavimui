import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.mjs';
import { identities } from './seed.mjs';
import { makeMonthSeed } from './month-fixture.mjs';
import { mkdirSync } from 'node:fs';
const filename=process.env.MEMORYSTRING_DB||fileURLToPath(new URL('.local/operations.sqlite',import.meta.url));
const db=new Store(filename,process.env.MEMORYSTRING_FIXTURE==='baseline'?{}:{seedFactory:makeMonthSeed});
try{
 const backup=path.join(path.dirname(filename),'backups',`before-fixture-load-${Date.now()}.sqlite`);mkdirSync(path.dirname(backup),{recursive:true});db.db.prepare('VACUUM INTO ?').run(backup);
 console.log('Previous synthetic database preserved:',backup);
 console.log(db.command(identities[0],{type:'reset',key:`reset-${Date.now()}`}));
}finally{db.close();}
