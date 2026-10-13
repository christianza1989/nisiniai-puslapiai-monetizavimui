import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.mjs';
import { identities } from './seed.mjs';
const db=new Store(process.env.MEMORYSTRING_DB||fileURLToPath(new URL('.local/operations.sqlite',import.meta.url)));
try{console.log(db.command(identities[0],{type:'reset',key:`reset-${Date.now()}`}));}finally{db.close();}
