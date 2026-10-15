import {existsSync} from 'node:fs';
import path from 'node:path';
import {openStore} from './store.mjs';
import {importFilesystemMedia} from './filesystem-media-import.mjs';
const args=process.argv.slice(2),allowed=new Set(['--db','--organization','--operator']),values={};
for(let i=0;i<args.length;i+=2){if(!allowed.has(args[i])||!args[i+1]||allowed.has(args[i+1])||values[args[i]])throw Error('Use explicit --db FILE --organization ID --operator ACCOUNT_ID');values[args[i]]=args[i+1];}
if([...allowed].some(key=>!values[key]))throw Error('Use explicit --db FILE --organization ID --operator ACCOUNT_ID');
const filename=path.resolve(values['--db']);if(!existsSync(filename)||!existsSync(filename+'.secret'))throw Error('Existing named local database and secret file required');
const store=openStore({filename});try{console.log(JSON.stringify(await importFilesystemMedia(store,{organizationId:values['--organization'],operatorAccountId:values['--operator']})));}finally{store.close();}
