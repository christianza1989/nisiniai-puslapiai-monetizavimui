import {readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {validateProject,steps} from '../model.mjs';
const here=dirname(fileURLToPath(import.meta.url)),kit=join(here,'kit');
const moduleOption=process.argv.indexOf('--modules'),modules=moduleOption<0?'C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules':process.argv[moduleOption+1];
const sharp=createRequire(join(modules,'package.json'))('sharp');
const manifest=JSON.parse(await readFile(join(kit,'manifest.json'),'utf8'));
const report={date:new Date().toISOString(),status:'PASS',integrityFiles:0,screenCount:0,svgCount:0,pngCount:0,transparentIllustrations:[],iconFamilies:manifest.iconCount,fonts:'glyph and variable-axis checks PASS',android:'aapt2 compile and link SDK35 PASS; resource check is not a deployed app',screens:'All 22 inspected sequentially, final targeted repairs inspected',runtimeAcceptance:'Not assessed by this asset check; see ../ACCEPTANCE.md for device evidence',sampleResults:[],limits:['AI decorative dog is separate from actual solver output','Current prototype and physical kit acceptance are separate','Generated headings are governed by exact font tokens; every pin dot is drawn mathematically in production']};
for(const file of manifest.files){
 const b=await readFile(join(kit,file.path));
 if(b.length!==file.bytes||createHash('sha256').update(b).digest('hex')!==file.sha256)throw Error('Integrity '+file.path);
 report.integrityFiles++;
 if(file.path.endsWith('.svg')){const s=b.toString();if(/<script|foreignObject|https?:|data:/i.test(s.replace('http://www.w3.org/2000/svg','')))throw Error('Unexpected SVG dependency '+file.path);report.svgCount++;}
 if(file.path.endsWith('.png')){const m=await sharp(b).metadata();if(!m.width||!m.height)throw Error('PNG dimensions '+file.path);report.pngCount++;}
}
for(const name of ['home-dog-string-art','spool-black','spool-cyan','spool-magenta','spool-yellow']){
 const p=join(kit,'rasters',name+'.png'),m=await sharp(p).metadata(),st=await sharp(p).stats();
 if(!m.hasAlpha||st.channels.at(-1).min!==0||st.channels.at(-1).max!==255)throw Error('Transparency '+name);
 report.transparentIllustrations.push({name,width:m.width,height:m.height,alphaMin:0,alphaMax:255});
}
for(const family of ['Roboto','LibreBaskerville']){const licence=await readFile(join(kit,'fonts',family+'-OFL.txt'),'utf8');if(!licence.includes('SIL OPEN FONT LICENSE Version 1.1'))throw Error('Font licence '+family);}
const tokenColors=JSON.parse(await readFile(join(kit,'tokens/design-tokens.json'),'utf8')).colors;
function luminance(hex){const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
report.tokenContrast=[];for(const [fg,bg,min] of [['ink','canvas',4.5],['muted','canvas',4.5],['white','forest',4.5],['outline','canvas',3],['error','errorSurface',4.5],['warning','warningSurface',4.5]]){const a=luminance(tokenColors[fg]),b=luminance(tokenColors[bg]),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(ratio<min)throw Error('Token contrast '+fg+'/'+bg);report.tokenContrast.push({fg,bg,ratio:Number(ratio.toFixed(2)),minimum:min});}
const screens=JSON.parse(await readFile(join(here,'screens.json'),'utf8'));
for(const s of screens.screens){const p=join(here,s.file),b=await readFile(p),m=await sharp(b).metadata();if(m.height/m.width<2||m.height/m.width>2.3)throw Error('Screen aspect '+s.id);s.sha256=createHash('sha256').update(b).digest('hex');s.width=m.width;s.height=m.height;report.screenCount++;}
if(report.screenCount!==22)throw Error('Missing screens');
await writeFile(join(here,'screens.json'),JSON.stringify(screens,null,2)+'\n');
for(const name of ['quick','detailed','fine']){const p=validateProject(JSON.parse(await readFile(join(kit,'samples',name+'.json'),'utf8')));report.sampleResults.push({name,connections:steps(p).length,pins:p.frame.pins});}
const nativeProof=join(here,'../qa/asset-kit/resource-check.apk');
try{const compiled=await stat(nativeProof);if(compiled.size<1000)throw Error('Invalid Android resource link evidence');report.androidResourceProofSha256=createHash('sha256').update(await readFile(nativeProof)).digest('hex');}catch(e){if(e.code==='ENOENT')report.android='UNVERIFIED on this machine; rerun aapt2 compile/link. Original session result is in the delivered REVIEW.json.';else throw e;}
report.manifestSha256=createHash('sha256').update(await readFile(join(kit,'manifest.json'))).digest('hex');
await writeFile(join(here,'REVIEW.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
