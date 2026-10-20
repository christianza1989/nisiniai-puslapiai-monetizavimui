import {cp,access} from 'node:fs/promises';
import {resolve} from 'node:path';
await access('.next/standalone/server.js');
await cp('public','.next/standalone/public',{recursive:true});
await cp('.next/static','.next/standalone/.next/static',{recursive:true});
console.log('Paruošta vietinė versija: '+resolve('.next/standalone/server.js'));
