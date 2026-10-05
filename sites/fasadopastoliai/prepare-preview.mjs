import {cp,mkdir,writeFile,readFile,symlink,access} from 'node:fs/promises';
import path from 'node:path';
const core='C:/Users/lenovo/Documents/dovanos-memorycasting',target=path.join(core,'output/three-sites-20261003/fasadopastoliai');
if(path.resolve(target)!==path.resolve(core,'output/three-sites-20261003/fasadopastoliai'))throw Error('Invalid scoped target');
await mkdir(target,{recursive:true});
const folders=['app','build','components','config','content-packages','db','drizzle','hooks','lib','public','scripts','tests','vendor'];
const files=['cloudflare-env.d.ts','components.json','drizzle.config.ts','eslint.config.mjs','next-env.d.ts','next.config.ts','package-lock.json','package.json','postcss.config.mjs','proxy.ts','tsconfig.json','vite.config.ts','.openai/hosting.json'];
for(const item of [...folders,...files])await cp(path.join(core,item),path.join(target,item),{recursive:true,filter:p=>!/(?:^|[\\/])(?:\.env[^\\/]*|\.dev\.vars[^\\/]*|node_modules|\.git|\.wrangler|output)(?:[\\/]|$)/.test(path.relative(path.join(core,item),p))&&!/\.previous\.\d+\.json$/.test(p)});
await mkdir(path.join(target,'.sites-runtime'),{recursive:true});await writeFile(path.join(target,'.sites-runtime/execution-profile.json'),JSON.stringify({executionProfile:'portable'}));
try{await access(path.join(target,'node_modules'))}catch(e){if(e.code!=='ENOENT')throw e;await symlink(path.join(core,'node_modules'),path.join(target,'node_modules'),'junction')}
const vite=await readFile(path.join(target,'vite.config.ts'),'utf8');await writeFile(path.join(target,'vite.config.ts'),vite.replace('    server: {','    cacheDir: ".vite-local-qa",\n    server: {'));
const manifest={date:new Date().toISOString(),target,folders,files,secretsCopied:false,nodeModules:'existing dependency junction',emailBinding:false,SMTP:false,voice:false,buildStatus:'pending',workerPort:8911,DB:'only isolated synthetic local D1'};
await mkdir(import.meta.dirname+'/qa',{recursive:true});await writeFile(import.meta.dirname+'/qa/preview-isolation.json',JSON.stringify(manifest,null,2)+'\n');console.log(target);
