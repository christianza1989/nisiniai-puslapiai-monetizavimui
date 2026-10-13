import {readFileSync,mkdirSync,writeFileSync,readdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url)),kit=path.join(root,'design','kit');
const read=p=>readFileSync(path.join(root,p),'utf8'),jsString=v=>JSON.stringify(v).replaceAll('<','\\u003c');
const template=read('index.html'),css=read('style.css'),assetNames=new Set([...template.matchAll(/data-asset="([^"]+)"/g)].map(m=>m[1]));
for(const name of ['rasters/sample-golden-retriever.png',...['black','cyan','magenta','yellow'].map(c=>'rasters/spool-'+c+'.png')])assetNames.add(name);
for(const m of css.matchAll(/asset:([^"')]+)/g))assetNames.add(m[1]);
const mime=p=>({'.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(p)]||'application/octet-stream');
const icons=Object.fromEntries(readdirSync(path.join(kit,'icons','svg')).filter(p=>p.endsWith('.svg')).map(p=>[p.slice(0,-4),readFileSync(path.join(kit,'icons','svg',p),'utf8')]));
const licences={solver:read('vendor/LICENSE-TrevorPeters0n.txt'),roboto:readFileSync(path.join(kit,'fonts','Roboto-OFL.txt'),'utf8'),display:readFileSync(path.join(kit,'fonts','LibreBaskerville-OFL.txt'),'utf8')};
const model=read('model.mjs').replaceAll('export ',''),app=read('app.mjs').replace(/^import .*;\r?\n/,'');
function bundle(native){
 const assets=Object.fromEntries([...assetNames].map(p=>[p,native?'https://memorystring.local/app-assets/'+p:'data:'+mime(p)+';base64,'+readFileSync(path.join(kit,p)).toString('base64')]));
 const code=`window.MEMORYSTRING_SOLVER=${jsString(read('vendor/solver.js'))};\nwindow.MS_ASSETS=${jsString(assets)};\nwindow.MS_ICONS=${jsString(icons)};\nwindow.MS_LICENCES=${jsString(licences)};\n${model}\n${app}`;
 if(code.includes('</script>'))throw Error('Unsafe script terminator');
 return template.replace('<link rel="stylesheet" href="style.css">',`<style>${css.replace(/asset:([^"')]+)/g,(_,p)=>assets[p])}</style>`).replace('<script type="module" src="app.mjs"></script>',`<script>${code}</script>`);
}
const output=path.join(root,'output'),nativeAssets=path.join(root,'android','app','src','main','assets');
mkdirSync(output,{recursive:true});mkdirSync(nativeAssets,{recursive:true});
const portable=bundle(false);writeFileSync(path.join(output,'MemoryString.html'),portable);writeFileSync(path.join(nativeAssets,'MemoryString.html'),bundle(true));
for(const p of assetNames){const dst=path.join(nativeAssets,'app-assets',p);mkdirSync(path.dirname(dst),{recursive:true});copyFileSync(path.join(kit,p),dst);}
const res=path.join(root,'android','app','src','main','res'),source=path.join(kit,'android','res');
for(const folder of readdirSync(source).filter(f=>f.startsWith('mipmap-'))){mkdirSync(path.join(res,folder),{recursive:true});for(const file of readdirSync(path.join(source,folder)))copyFileSync(path.join(source,folder,file),path.join(res,folder,file));}
for(const file of ['ms_launcher_background.xml','ms_launcher_foreground.xml','ms_launcher_monochrome.xml'])copyFileSync(path.join(source,'drawable',file),path.join(res,'drawable',file));
console.log(JSON.stringify({file:path.join(output,'MemoryString.html'),bytes:Buffer.byteLength(portable),runtimeAssets:assetNames.size,icons:Object.keys(icons).length,networkDependencies:0}));
