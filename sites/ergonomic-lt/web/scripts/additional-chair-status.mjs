import fs from 'node:fs';
import path from 'node:path';
export function additionalChairStatus(root){
 const file=path.join(root,'preparation-status-v3.json');
 const status=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{articles:{}};
 const folder=path.join(root,'status-v4');
 if(fs.existsSync(folder))for(const file of fs.readdirSync(folder).filter(f=>/^K[A-Z0-9]+\.json$/.test(f))){
  const entry=JSON.parse(fs.readFileSync(path.join(folder,file),'utf8'));status.articles[entry.code]=entry;
 }
 return status;
}
