import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import path from'node:path';
const core='C:/Users/lenovo/Documents/dovanos-memorycasting',dir=path.join(core,'public/fonts/akmenas');
const url='https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@48,400;48,500&display=swap';
const cssResponse=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'}});if(!cssResponse.ok)throw new Error('Font CSS failed');let css=await cssResponse.text();
// This static Czech/Lithuanian and Latin glyph subset is the actual site font,
// never a runtime Google Fonts request. Preserve OFL and source provenance.
css=css.split(/(?=\/\* )/).filter(v=>!v.includes('/* vietnamese */')).join('');
const sources=[...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map(v=>v[1]))],files=[];
for(let i=0;i<sources.length;i++){const r=await fetch(sources[i]);if(!r.ok)throw new Error('Font download failed');const b=Buffer.from(await r.arrayBuffer());if(b.subarray(0,4).toString()!=='wOF2')throw new Error('Expected WOFF2');const file=`fraunces-subset-${i}.woff2`;await writeFile(path.join(dir,file),b);css=css.replaceAll(sources[i],`/fonts/akmenas/${file}`);files.push({file,source:sources[i],bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
const original=await readFile(path.join(dir,'fonts.css'),'utf8'),manrope=original.slice(original.indexOf("@font-face {\n  font-family: 'Manrope'"));if(!manrope.startsWith('@font-face'))throw new Error('Manrope expected');
await writeFile(path.join(dir,'fonts.css'),css+'\n'+manrope);
const module=path.join(core,'components/niche/akmenas-site.module.css'),body=await readFile(module,'utf8');if(!body.includes('.site{'))throw new Error('Scoped site CSS expected');await writeFile(module,css+'\n'+manrope+'\n'+body.slice(body.indexOf('.site{')));
const renderer=path.join(core,'components/niche/akmenas-site.tsx'),tsx=await readFile(renderer,'utf8');await writeFile(renderer,tsx.replace('<link rel="stylesheet" href="/fonts/akmenas/fonts.css" precedence="akmenas-fonts"/>','').replace("{i===0&&segments.length>1?'.':''}","{i===0&&segments.length>1?'. ':''}"));
await writeFile(new URL('FONT-OPTIMIZATION.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),url,localOnly:true,files,change:'Modern WOFF2 Latin/Lithuanian subsets; @font-face in the scoped module removes a render-blocking stylesheet request; OFL retained.'},null,2));console.log(JSON.stringify(files.map(({file,bytes})=>({file,bytes}))));
