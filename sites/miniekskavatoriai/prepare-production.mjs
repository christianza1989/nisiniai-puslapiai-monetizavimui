import {cp,mkdir,symlink,stat} from 'node:fs/promises';
import path from 'node:path';
const src='C:/Users/lenovo/Documents/dovanos-memorycasting';
const dst='C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/output/miniekskavatoriai-production';
await mkdir(dst,{recursive:true});
const roots=new Set(['app','build','components','config','content-packages','db','drizzle','hooks','lib','public','scripts','tests','vendor','.openai','cloudflare-env.d.ts','components.json','drizzle.config.ts','eslint.config.mjs','next-env.d.ts','next.config.ts','package-lock.json','package.json','postcss.config.mjs','proxy.ts','tsconfig.json','vercel.json','vite.config.ts']);
await cp(src,dst,{recursive:true,filter:p=>{const rel=path.relative(src,p),pieces=rel.split(path.sep);return !rel||(roots.has(pieces[0])&&!pieces.some(x=>/^\.env|^\.dev\.vars|credentials|prisijung|\.pem$|\.key$/i.test(x)));}});
try{await stat(path.join(dst,'node_modules'))}catch{await symlink(path.join(src,'node_modules'),path.join(dst,'node_modules'),'junction');}
console.log('Own production source copy ready; no .env/.dev.vars/runtime/dist copied. Shared dependencies junction.');
