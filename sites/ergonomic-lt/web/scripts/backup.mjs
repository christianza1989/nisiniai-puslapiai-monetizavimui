import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const runtime=path.resolve(process.env.RUNTIME_DIR||'.runtime'),source=path.join(runtime,'ergonomic.sqlite');
if(!existsSync(source))throw new Error('Duomenų bazės dar nėra. Pirmiausia paleiskite svetainę.');
const targetDir=path.resolve(process.env.BACKUP_DIR||'backups');mkdirSync(targetDir,{recursive:true});
const target=path.join(targetDir,'ergonomic-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
const db=new DatabaseSync(source);db.exec("VACUUM INTO '"+target.replaceAll("'","''")+"'");db.close();
console.log('Duomenų bazės kopija: '+target);
