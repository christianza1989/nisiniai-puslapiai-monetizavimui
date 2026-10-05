import {mkdir,readFile,writeFile,copyFile,readdir,stat,symlink} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..'),core='C:/Users/lenovo/Documents/dovanos-memorycasting',target=path.join(root,'output/auksarankiams-production');
await mkdir(target,{recursive:true});
async function copyDir(src,dst){await mkdir(dst,{recursive:true});for(const i of await readdir(src,{withFileTypes:true})){if(i.isSymbolicLink()||i.name.startsWith('.env')||i.name.startsWith('.dev.vars')||/credential|secret|prisijung/i.test(i.name))continue;const a=path.join(src,i.name),b=path.join(dst,i.name);if(i.isDirectory())await copyDir(a,b);else await copyFile(a,b);}}
for(const name of ['app','build','components','config','content-packages','db','drizzle','lib','public','scripts','tests','hooks','.openai'])await copyDir(path.join(core,name),path.join(target,name));
for(const name of ['package.json','package-lock.json','vite.config.ts','next.config.ts','tsconfig.json','next-env.d.ts','cloudflare-env.d.ts','proxy.ts','eslint.config.mjs','postcss.config.mjs','components.json']){try{await copyFile(path.join(core,name),path.join(target,name));}catch(e){if(e.code!=='ENOENT')throw e;}}
try{await stat(path.join(target,'node_modules'));}catch{await symlink(path.join(core,'node_modules'),path.join(target,'node_modules'),'junction');}
await writeFile(path.join(import.meta.dirname,'BUILD-COPY.json'),JSON.stringify({at:new Date().toISOString(),target,source:core,whitelist:true,excludes:['.env*','.dev.vars*','credential/secret/prisijung files','all original .wrangler state'],nodeModules:'junction to existing dependencies',build:'npm run build',previewPort:8890,smtp:0,voice:0},null,2));console.log(target);
