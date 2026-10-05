import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const source=path.resolve(process.argv[2]),dest=path.resolve(process.argv[3]);
if(source===dest||dest.startsWith(source+path.sep))throw new Error('Use a separate export directory');
await fs.mkdir(dest,{recursive:true});
if((await fs.readdir(dest)).length)throw new Error('Export destination must be empty; never overwrite an active checkout');
const folders=['app','components','config','content','content-packages','db','docs','drizzle','examples','hooks','lib','migration','public','schemas','scripts','tests','vendor','SEO SKILLS','SEO_GEO_AUTOMATIKA','sites'];
const skip=new Set(['.git','node_modules','data','output','outputs','tmp','artifacts','logs','backups','credentials','secrets','.next','.wrangler','.sites-runtime','.codex','.agents','.openai','.playwright-cli','dist','build','qa','FIRST-RUN']);
const blocked=/(?:^\.env|^\.dev\.vars|mail_login_and_password|credentials|service.account|\.(?:db|sqlite3?|log|zip|7z|exe|pem|key|tsbuildinfo)$)/i;
const rows=[];
async function copy(file,relative){const bytes=await fs.readFile(file);await fs.mkdir(path.dirname(path.join(dest,relative)),{recursive:true});await fs.writeFile(path.join(dest,relative),bytes);rows.push({file:relative.replaceAll('\\','/'),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
async function walk(dir,relative){for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(entry.isSymbolicLink()||blocked.test(entry.name))continue;const next=path.join(relative,entry.name);if(entry.isDirectory()){if(!skip.has(entry.name))await walk(path.join(dir,entry.name),next);}else if(entry.isFile())await copy(path.join(dir,entry.name),next);}}
for(const folder of folders){try{await walk(path.join(source,folder),folder);}catch(e){if(e.code!=='ENOENT')throw e;}}
for(const entry of await fs.readdir(source,{withFileTypes:true}))if(entry.isFile()&&!blocked.test(entry.name)&&(/\.(?:json|ts|mjs|cjs|md)$/.test(entry.name)||['.gitignore','.npmrc'].includes(entry.name)))await copy(path.join(source,entry.name),entry.name);
await fs.appendFile(path.join(dest,'.gitignore'),'\n# Clean multi-machine source snapshot; local state excluded.\nnode_modules/\noutput/\noutputs/\ndata/\nbuild/\nwork/\nartifacts/\nlogs/\nsecrets/\ncredentials/\n*.db\n*.sqlite3\n*.tsbuildinfo\n');
await fs.writeFile(path.join(dest,'.gitattributes'),'* text=auto\n*.md text eol=lf\n*.mjs text eol=lf\n*.js text eol=lf\n*.ts text eol=lf\n*.tsx text eol=lf\n*.json text eol=lf\n*.sh text eol=lf\n*.ps1 text eol=crlf\n*.cmd text eol=crlf\n*.png binary\n*.webp binary\n*.jpg binary\n*.woff2 binary\n*.ttf binary\n');
await fs.writeFile(path.join(path.dirname(dest),'public-core-snapshot.json'),JSON.stringify({source,generatedAt:new Date().toISOString(),historyIncluded:false,files:rows.length,bytes:rows.reduce((s,r)=>s+r.bytes,0),rows},null,2)+'\n');
console.log(JSON.stringify({files:rows.length,bytes:rows.reduce((s,r)=>s+r.bytes,0),historyIncluded:false}));
