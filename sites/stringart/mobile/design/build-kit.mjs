import {mkdir,writeFile,readFile,readdir,copyFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url)), kit=join(here,'kit');
const option=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const modules=option('--modules','C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(join(modules,'package.json'))('sharp');
const colors={canvas:'#F7F5EF',surface:'#FFFDF8',forest:'#164D40',ink:'#183D35',copper:'#B57859',muted:'#52645E',outline:'#75877C',subtle:'#DFE5DE',error:'#8B3D32',errorSurface:'#F8E7E2',warning:'#815112',warningSurface:'#FFF2D6',cyan:'#0089A4',magenta:'#C40068',yellow:'#FFD244',black:'#232724',white:'#FFFFFF'};
const tokens={version:1,language:'en',platform:'android',colors,space:[4,8,12,16,20,24,32,40,48],radius:{card:14,field:12,sheet:24,pill:999},touchTarget:48,icon:{viewport:24,stroke:1.8},type:{body:{family:'Roboto',size:16,line:24,weight:400},hint:{family:'Roboto',size:14,line:20,weight:400},title:{family:'Roboto',size:24,line:32,weight:600},label:{family:'Roboto',size:16,line:22,weight:500},pin:{family:'Roboto',size:56,line:64,weight:600},display:{family:'Libre Baskerville',size:40,line:48,weight:400}},motion:{durationMs:180,reducedMotion:true}};
async function put(path,data){const out=join(kit,path);await mkdir(dirname(out),{recursive:true});await writeFile(out,data);return out;}
function svg(w,h,content){return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+content+'</svg>';}
const circle='M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20';
const paths={
'arrow-left':['M20 12H4m7-7-7 7 7 7'],'arrow-right':['M4 12h16m-7-7 7 7-7 7'],
'plus':['M12 4v16M4 12h16'],'close':['m6 6 12 12M18 6 6 18'],
'settings':['M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z','M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8'],
'folder':['M3 7V4h7l3 3h8v13H3V7Z','M3 8h18'],
'image':['M3 3h18v18H3Z','m3 17 6-6 4 4 3-3 5 5','M16 6a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3'],
'rotate-cw':['M20 8a8 8 0 1 0 0 8','M20 3v5h-5'],
'zoom-in':['M10 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14','m15 15 6 6M10 6v8M6 10h8'],
'move-horizontal':['M3 12h18m-4-4 4 4-4 4M7 8l-4 4 4 4'],
'move-vertical':['M12 3v18m-4-4 4 4 4-4M8 7l4-4 4 4'],
'sun':['M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10','M12 1v2m0 18v2M1 12h2m18 0h2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4'],
'contrast':[circle,'M12 2v20M12 4c10 0 10 16 0 16'],
'play':['m8 4 13 8-13 8V4Z'],'pause':['M7 4v16M17 4v16'],
'speaker':['M3 9h5l6-5v16l-6-5H3V9Z','M17 8c3 2 3 6 0 8M20 5c5 4 5 10 0 14'],
'speaker-off':['M3 9h5l6-5v16l-6-5H3V9Z','M3 21 21 3'],
'repeat':['M4 8c3-6 14-6 17 1M3 15c3 6 14 6 17 0','M21 4v5h-5M3 20v-5h5'],
'more-vertical':['M12 3a1 1 0 1 0 0 2a1 1 0 1 0 0-2M12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2M12 19a1 1 0 1 0 0 2a1 1 0 1 0 0-2'],
'download':['M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5'],
'upload':['M12 16V4m-5 5 5-5 5 5M3 16v5h18v-5'],
'file-json':['M4 2h10l6 6v14H4V2Z','M14 2v6h6M9 11c-2 0-2 2-3 3 1 1 1 3 3 3M15 11c2 0 2 2 3 3-1 1-1 3-3 3'],
'pencil':['m3 17 13-13 4 4L7 21H3v-4Z','m13 7 4 4'],
'trash':['M3 6h18M8 6V3h8v3M5 6v15h14V6M10 10v7M14 10v7'],
'check':['m4 12 5 5L20 6'],'check-circle':[circle,'m7 12 3 3 7-7'],
'info':[circle,'M12 11v6M12 7v.01'],
'alert-triangle':['M12 2 23 21H1L12 2Z','M12 8v6m0 3v.01'],
'lock':['M6 10V7a6 6 0 0 1 12 0v3M3 10h18v12H3V10Z','M12 15v3'],
'help-circle':[circle,'M9 8c0-4 8-4 7 1-.5 2-4 2-4 5m0 3v.01'],
'chevron-right':['m9 5 7 7-7 7'],'chevron-down':['m5 9 7 7 7-7'],
'clock':[circle,'M12 6v6l4 2'],
'moon':['M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z'],
'reset':['M4 9a8 8 0 1 1 0 8','M4 4v5h5'],
'pin':['M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7Z','M12 6a3 3 0 1 0 0 6a3 3 0 1 0 0-6'],
'frame':[circle,'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2'],
'thread':['M6 3c0-2 12-2 12 0s-12 2-12 0Zm0 18c0-2 12-2 12 0s-12 2-12 0ZM7 4v16M17 4v16M7 6l10 4M7 10l10 4M7 14l10 4'],
'code':['m8 5-6 7 6 7m8-14 6 7-6 7M14 3l-4 18'],
'flask':['M9 2h6M10 2v8L3 21h18L14 10V2M7 15h10'],
'hand-heart':['M5 12V7c0-2 3-2 3 0V4c0-2 3-2 3 0v5V3c0-2 3-2 3 0v6V5c0-2 3-2 3 0v6c4-4 6-1 3 4l-3 6H8L2 14c-2-3 1-5 3-2Z'],
'phone':['M6 1h12v22H6V1Z','M10 19h4'],
'external-link':['M14 3h7v7m0-7-10 10M10 5H3v16h16v-7'],
'eye':['M1 12c5-10 17-10 22 0-5 10-17 10-22 0Z','M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8'],
'eye-off':['M1 12c5-10 17-10 22 0-5 10-17 10-22 0Z','M3 21 21 3']
};
const fontSha='66928797f271fed5ee428544e7229685e2d90127';
if(process.argv.includes('--fetch-fonts')){
 for(const [family,file,target] of [['roboto','Roboto[wdth,wght].ttf','Roboto-Variable.ttf'],['librebaskerville','LibreBaskerville[wght].ttf','LibreBaskerville-Variable.ttf'],['roboto','OFL.txt','Roboto-OFL.txt'],['librebaskerville','OFL.txt','LibreBaskerville-OFL.txt']]){
  const url='https://raw.githubusercontent.com/google/fonts/'+fontSha+'/ofl/'+family+'/'+encodeURIComponent(file);
  const response=await fetch(url);if(!response.ok)throw Error('Font fetch '+response.status);
  await put('fonts/'+target,Buffer.from(await response.arrayBuffer()));
 }
}
await put('tokens/design-tokens.json',JSON.stringify(tokens,null,2)+'\n');
await put('tokens/memorystring.css','@font-face{font-family:Roboto;src:url("../fonts/Roboto-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}\n@font-face{font-family:"Libre Baskerville";src:url("../fonts/LibreBaskerville-Variable.woff2") format("woff2");font-weight:400 700;font-display:swap}\n:root{'+Object.entries(colors).map(([k,v])=>'--ms-'+k+':'+v+';').join('')+'--ms-body:Roboto,system-ui,sans-serif;--ms-display:"Libre Baskerville",Georgia,serif;--ms-touch:3rem;--ms-radius:0.875rem;}\n.ms-icon{width:1.5rem;height:1.5rem;flex:none;color:currentColor}.ms-pin-number{font-variant-numeric:tabular-nums;font-family:var(--ms-body)}\n');
for(const [name,ds] of Object.entries(paths)){
 const source=svg(24,24,'<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ds.map(d=>'<path d="'+d+'"/>').join('')+'</g>');
 await put('icons/svg/'+name+'.svg',source);
 for(const size of [24,36,48,72,96]){await put('icons/png/'+size+'/'+name+'.png',await sharp(Buffer.from(source.replace('currentColor',colors.forest))).resize(size,size).png().toBuffer());await put('icons/png/white/'+size+'/'+name+'.png',await sharp(Buffer.from(source.replace('currentColor',colors.white))).resize(size,size).png().toBuffer());}
 await put('android/res/drawable/ms_'+name.replaceAll('-','_')+'.xml','<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">'+ds.map(d=>'<path android:fillColor="@android:color/transparent" android:strokeColor="@color/ms_ink" android:strokeWidth="1.8" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="'+d+'"/>').join('')+'</vector>');
}
const markContent='<circle cx="50" cy="50" r="48" fill="'+colors.forest+'"/><clipPath id="mark"><circle cx="50" cy="50" r="48"/></clipPath><g clip-path="url(#mark)" fill="none" stroke="'+colors.copper+'" stroke-width="2" stroke-linecap="round"><path d="M18 19 84 75M44 3 25 94M78 9 39 96M3 41 94 62M7 67 83 17"/></g>';
await put('brand/memorystring-mark.svg',svg(100,100,markContent));
await put('brand/memorystring-mark-mono.svg',svg(100,100,'<circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3"/><path d="M18 19 84 75M44 5 25 94M78 9 39 96M5 41 94 62M7 67 83 17" stroke="currentColor" stroke-width="3" fill="none"/>'));
for(const size of [48,96,192,512,1024])await put('brand/png/memorystring-mark-'+size+'.png',await sharp(Buffer.from(svg(100,100,markContent))).resize(size,size).png().toBuffer());
function points(n,r,c=120){return Array.from({length:n},(_,i)=>{const a=i/n*2*Math.PI-Math.PI/2;return{x:c+r*Math.cos(a),y:c+r*Math.sin(a)};});}
for(const [cm,pins] of [[42,200],[50,240],[60,300]]){
 const ps=points(pins,100);
 const content='<circle cx="120" cy="120" r="104" fill="#EDDBBA" stroke="#BCA47C" stroke-width="1"/><circle cx="120" cy="120" r="92" fill="#F4E5C9"/>'+ps.map(p=>'<circle cx="'+p.x.toFixed(3)+'" cy="'+p.y.toFixed(3)+'" r="1.1" fill="'+colors.ink+'"/>').join('')+'<circle cx="120" cy="20" r="2.5" fill="'+colors.copper+'"/>';
 const asset=svg(240,240,content);await put('frames/frame-'+cm+'cm-'+pins+'pins.svg',asset);await put('frames/frame-'+cm+'cm-'+pins+'pins.png',await sharp(Buffer.from(asset)).resize(480).png().toBuffer());
}
const help=svg(320,320,'<g transform="translate(40 40)">'+points(200,100).map((p,i)=>'<circle cx="'+p.x.toFixed(2)+'" cy="'+p.y.toFixed(2)+'" r="'+(i===0?3:1)+'" fill="'+(i===0?colors.copper:colors.forest)+'"/>').join('')+'</g><path d="M202 22A145 145 0 0 1 298 130m-11-6 11 6-1-13" fill="none" stroke="'+colors.copper+'" stroke-width="2"/><g fill="'+colors.ink+'" font-family="sans-serif" font-size="16" text-anchor="middle"><text x="160" y="20">1</text><text x="296" y="165">51</text><text x="160" y="311">101</text><text x="24" y="165">151</text></g>');
await put('frames/pin-numbering-200.svg',help);await put('frames/pin-numbering-200.png',await sharp(Buffer.from(help)).resize(640).png().toBuffer());
for(const name of ['black','cyan','magenta','yellow']){
 const col=colors[name], swatch=svg(80,80,'<circle cx="40" cy="40" r="32" fill="'+col+'" stroke="'+colors.ink+'" stroke-width="1"/><g stroke="'+(name==='black'?'#52645E':'#FFFFFF')+'" stroke-opacity=".2" stroke-width=".8">'+Array.from({length:12},(_,i)=>'<path d="M'+(14+i*2)+' 16 66 '+(32+i*2)+'"/>').join('')+'</g>');
 await put('threads/swatch-'+name+'.svg',swatch);await put('threads/swatch-'+name+'.png',await sharp(Buffer.from(swatch)).resize(160).png().toBuffer());
}
const ps=points(40,76,120);
let lines='';for(let i=0;i<40;i++){const a=ps[i],b=ps[(i+13)%40];lines+='<path d="M'+a.x+' '+a.y+'L'+b.x+' '+b.y+'"/>';}
const empty=svg(280,260,'<g fill="none" stroke="'+colors.copper+'" stroke-width="1.2">'+lines+'<path d="M120 152c-55-42-48-70-28-70 16 0 28 20 28 20s12-20 28-20c20 0 27 28-28 70c20 29 66 36 100 35"/></g>'+ps.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="2.2" fill="'+colors.forest+'"/>').join(''));
await put('illustrations/empty-projects.svg',empty);await put('illustrations/empty-projects.png',await sharp(Buffer.from(empty)).resize(840,780).png().toBuffer());
await put('android/res/values/colors.xml','<resources>'+Object.entries(colors).map(([name,color])=>'<color name="ms_'+name+'">'+color+'</color>').join('')+'</resources>');
await put('android/res/values/dimens.xml','<resources><dimen name="ms_touch">48dp</dimen><dimen name="ms_margin">20dp</dimen><dimen name="ms_icon">24dp</dimen><dimen name="ms_body">16sp</dimen><dimen name="ms_hint">14sp</dimen><dimen name="ms_title">24sp</dimen><dimen name="ms_pin">56sp</dimen></resources>');
await put('android/res/drawable/ms_launcher_background.xml','<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="@color/ms_forest"/></shape>');
const fg='<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><group android:pivotX="54" android:pivotY="54" android:scaleX=".58" android:scaleY=".58" android:translateX="4" android:translateY="4"><path android:fillColor="@android:color/transparent" android:strokeColor="@color/ms_copper" android:strokeWidth="3.2" android:strokeLineCap="round" android:pathData="M18 19L84 75M44 5L25 94M78 9L39 96M5 41L94 62M7 67L83 17"/></group></vector>';
await put('android/res/drawable/ms_launcher_foreground.xml',fg);
await put('android/res/drawable/ms_launcher_monochrome.xml',fg.replaceAll('@color/ms_copper','@android:color/white'));
for(const version of [26,33])await put('android/res/mipmap-anydpi-v'+version+'/ic_launcher.xml','<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@drawable/ms_launcher_background"/><foreground android:drawable="@drawable/ms_launcher_foreground"/>'+(version===33?'<monochrome android:drawable="@drawable/ms_launcher_monochrome"/>':'')+'</adaptive-icon>');
const launcher=svg(100,100,'<rect width="100" height="100" rx="20" fill="'+colors.forest+'"/><g transform="translate(17 17) scale(.66)">'+markContent+'</g>');
for(const [density,size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]])await put('android/res/mipmap-'+density+'/ic_launcher.png',await sharp(Buffer.from(launcher)).resize(size,size).png().toBuffer());
await put('android/play-store-icon-512.png',await sharp(Buffer.from(launcher.replace('rx="20"','rx="0"'))).resize(512,512).png().toBuffer());
await put('brand/splash-mark.svg',svg(288,288,'<g transform="translate(64 64) scale(1.6)">'+markContent+'</g>'));
await put('brand/splash-mark.png',await sharp(Buffer.from(svg(288,288,'<g transform="translate(64 64) scale(1.6)">'+markContent+'</g>'))).resize(864).png().toBuffer());
await put('licences/LICENSE-TrevorPeters0n.txt',await readFile(join(here,'../vendor/LICENSE-TrevorPeters0n.txt')));
const python=option('--python','python'), prep=spawnSync(python,[join(here,'prepare-fonts.py'),kit],{encoding:'utf8'});
if(prep.status!==0)throw Error(prep.stderr||prep.stdout);
console.log(prep.stdout.trim());
const wordmark=await readFile(join(kit,'brand/memorystring-wordmark.svg'));
await put('brand/png/memorystring-wordmark.png',await sharp(wordmark).resize({width:1400}).png().toBuffer());
await put('android/res/font/ms_roboto.ttf',await readFile(join(kit,'fonts/Roboto-Variable.ttf')));
await put('android/res/font/ms_libre_baskerville.ttf',await readFile(join(kit,'fonts/LibreBaskerville-Variable.ttf')));
await put('android/res/values/type.xml','<resources><style name="MemoryString.Body" parent="@android:style/TextAppearance.Material.Body1"><item name="android:fontFamily">@font/ms_roboto</item><item name="android:textSize">16sp</item><item name="android:textColor">@color/ms_ink</item></style><style name="MemoryString.Display" parent="@android:style/TextAppearance.Material.Headline"><item name="android:fontFamily">@font/ms_libre_baskerville</item><item name="android:textSize">40sp</item><item name="android:textColor">@color/ms_ink</item></style></resources>');
const cols=8,cell=130,rows=Math.ceil(Object.keys(paths).length/cols);
let iconBoard='<rect width="1040" height="'+(rows*cell+70)+'" fill="'+colors.canvas+'"/><text x="24" y="35" font-family="sans-serif" font-size="22" fill="'+colors.ink+'">MemoryString · original vector icon family</text>';
Object.entries(paths).forEach(([name,ds],i)=>{const x=(i%cols)*cell+45,y=Math.floor(i/cols)*cell+72;iconBoard+='<g transform="translate('+x+' '+y+') scale(2)" fill="none" stroke="'+colors.forest+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ds.map(d=>'<path d="'+d+'"/>').join('')+'</g><text x="'+((i%cols)*cell+65)+'" y="'+(y+76)+'" text-anchor="middle" font-family="sans-serif" font-size="11" fill="'+colors.ink+'">'+name+'</text>';});
await put('previews/icon-family.png',await sharp(Buffer.from(svg(1040,rows*cell+70,iconBoard))).png().toBuffer());
const manifest={version:1,date:'2026-10-13',status:'prepared asset kit, not yet wired to redesigned app',generator:'Original SVG/Android vector sources + Sharp rasterisation; named illustrative rasters use built-in ImageGen',fontSource:{repo:'google/fonts',sha:fontSha,licence:'SIL Open Font License 1.1'},iconCount:Object.keys(paths).length,files:[]};
async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=join(dir,f.name);if(f.isDirectory())await walk(p);else if(f.name!=='manifest.json'){const b=await readFile(p);manifest.files.push({path:relative(kit,p).replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}}}
await walk(kit);manifest.files.sort((a,b)=>a.path.localeCompare(b.path));await put('manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({kit,icons:manifest.iconCount,files:manifest.files.length,bytes:manifest.files.reduce((n,f)=>n+f.bytes,0)}));
