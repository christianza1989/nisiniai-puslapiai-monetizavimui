import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]??'.');
const skip=new Set(['.git','node_modules','.venv','venv','__pycache__','.pytest_cache','.ruff_cache','.next','.wrangler','.cache']);
const rows=[],nestedGit=[],symlinks=[];
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isSymbolicLink()){symlinks.push(path.relative(root,file));continue;}if(entry.isDirectory()){if(entry.name==='.git')nestedGit.push(path.relative(root,dir));if(!skip.has(entry.name))await walk(file);}else if(entry.isFile()){const s=await fs.stat(file);rows.push({file:path.relative(root,file).replaceAll('\\','/'),bytes:s.size});}}}
await walk(root);
const dirs={};for(const row of rows){const key=row.file.split('/')[0];dirs[key]??={files:0,bytes:0};dirs[key].files++;dirs[key].bytes+=row.bytes;}
const report={root,files:rows.length,bytes:rows.reduce((sum,r)=>sum+r.bytes,0),dirs,nestedGit,symlinks,largest:rows.sort((a,b)=>b.bytes-a.bytes).slice(0,50)};
const dest=process.argv[3];if(dest){await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
