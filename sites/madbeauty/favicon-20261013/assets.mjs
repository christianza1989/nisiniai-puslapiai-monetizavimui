import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const repo=path.resolve(import.meta.dirname,'../../..'),pub=path.join(repo,'sites/madbeauty/prototype/public');
const require=createRequire(path.resolve(repo,'../madbeauty-platform-core-20261010/package.json')),sharp=require('sharp');
const svg=(await readFile(path.join(import.meta.dirname,'favicon-brand-m-v1.svg'),'utf8')).replace('aria-label="Madbabes"','aria-label="Madbeauty"');
await writeFile(path.join(import.meta.dirname,'favicon-brand-m-v1.svg'),svg);await writeFile(path.join(pub,'favicon.svg'),svg);
const pngs=[];
for(const size of [16,32,48,180,256]){const bytes=await sharp(Buffer.from(svg),{density:384}).resize(size,size).png().toBuffer();pngs.push({size,bytes});if(size===32)await writeFile(path.join(pub,'favicon-32.png'),bytes);if(size===180)await writeFile(path.join(pub,'apple-touch-icon.png'),bytes);if(size===256)await writeFile(path.join(import.meta.dirname,'preview.png'),bytes);}
const frames=pngs.filter(x=>x.size<=48),header=Buffer.alloc(6+16*frames.length);header.writeUInt16LE(1,2);header.writeUInt16LE(frames.length,4);let offset=header.length;
frames.forEach(({size,bytes},i)=>{const n=6+i*16;header[n]=size;header[n+1]=size;header.writeUInt16LE(1,n+4);header.writeUInt16LE(32,n+6);header.writeUInt32LE(bytes.length,n+8);header.writeUInt32LE(offset,n+12);offset+=bytes.length;});await writeFile(path.join(pub,'favicon.ico'),Buffer.concat([header,...frames.map(x=>x.bytes)]));
const width=720,height=180,tiles=[];
for(const [row,bg]of ['#ffffff','#17151c'].entries()){for(const [col,size]of [16,32,48].entries()){tiles.push({input:await sharp({create:{width:240,height:90,channels:4,background:bg}}).png().toBuffer(),left:col*240,top:row*90});tiles.push({input:pngs.find(x=>x.size===size).bytes,left:col*240+24,top:row*90+Math.floor((90-size)/2)});}}
await writeFile(path.join(import.meta.dirname,'small-size-check.png'),await sharp({create:{width,height,channels:4,background:'#fff'}}).composite(tiles).png().toBuffer());
for(const [relative,oldText,newText]of [
 ['sites/madbeauty/prototype/public/app.html','<link rel="icon" href="/wordmark.svg" type="image/svg+xml">','<link rel="icon" href="/favicon.svg?v=20261013" type="image/svg+xml"><link rel="alternate icon" href="/favicon.ico?v=20261013"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20261013">'],
 ['sites/madbeauty/cloudflare/worker.mjs',"const assetPaths=new Set([...assets,","const assetPaths=new Set([...assets,'/favicon.svg','/favicon.ico','/favicon-32.png','/apple-touch-icon.png',"],
 ['sites/madbeauty/cloudflare/worker.mjs',"const target=path.startsWith('/favicon.')?new Request(new URL('/wordmark.svg',url),request):request;","const target=request;"],
 ['sites/madbeauty/trial-20261010/worker.mjs',"const assetPaths=new Set([...trialAssets,","const assetPaths=new Set([...trialAssets,'/favicon.svg','/favicon.ico','/favicon-32.png','/apple-touch-icon.png',"],
 ['sites/madbeauty/prototype/app-server.mjs',"path.join(publicRoot,'wordmark.svg')","path.join(publicRoot,requested==='/favicon.ico'?'favicon.ico':'favicon.svg')"],
 ['sites/madbeauty/prototype/app-server.mjs',"'Content-Type':mime['.svg']});res.end(await readFile(path.join(publicRoot,requested","'Content-Type':requested==='/favicon.ico'?'image/x-icon':mime['.svg']});res.end(await readFile(path.join(publicRoot,requested"]
]){const f=path.join(repo,relative),s=await readFile(f,'utf8');if(s.includes(newText))continue;assert.equal(s.split(oldText).length,2,relative);await writeFile(f,s.replace(oldText,newText));}
console.log('SVG, multi-frame ICO and PNG assets rendered; exact source links/routes updated.');
