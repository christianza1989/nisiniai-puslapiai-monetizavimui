import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {Worker} from 'node:worker_threads';
import {SCHEMA,ALGORITHM,validateProject,steps,threadMeters} from '../model.mjs';
const here=dirname(fileURLToPath(import.meta.url)),kit=join(here,'kit');
const moduleOption=process.argv.indexOf('--modules'),modules=moduleOption<0?'C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules':process.argv[moduleOption+1];
const req=createRequire(join(modules,'package.json')),sharp=req('sharp');
const source=await readFile(join(here,'../vendor/solver.js'),'utf8'),size=192;
const pixels=await sharp(join(kit,'rasters/sample-golden-retriever.png')).resize(size,size,{fit:'cover'}).removeAlpha().raw().toBuffer();
const target=new Float32Array(size*size);for(let i=0;i<size*size;i++)target[i]=(pixels[i*3]*.299+pixels[i*3+1]*.587+pixels[i*3+2]*.114)/255;
const solve=cfg=>new Promise((resolve,reject)=>{
 const worker=new Worker("const {parentPort}=require('node:worker_threads');global.self={postMessage:m=>parentPort.postMessage(m)};parentPort.on('message',m=>self.onmessage({data:m}));\n"+source,{eval:true});
 const timeout=setTimeout(()=>{worker.terminate();reject(Error('Sample solve timed out'));},90000);
 worker.on('error',e=>{clearTimeout(timeout);reject(e);});worker.on('message',m=>{if(m.type==='done'||m.type==='error'){clearTimeout(timeout);worker.terminate();if(m.type==='error')reject(Error(m.message));else resolve(m);}});
 worker.postMessage({type:'start',cfg});
});
const coords=pin=>{const a=pin/200*2*Math.PI-Math.PI/2;return{x:256+238*Math.cos(a),y:256+238*Math.sin(a)};};
const summary=[];
await mkdir(join(kit,'detail'),{recursive:true});await mkdir(join(kit,'samples'),{recursive:true});
for(const [label,limit] of [['quick',1400],['detailed',2400],['fine',3500]]){
 const cfg={nails:200,size,channels:1,target,bg:[1],bgHex:'#ffffff',offsetRad:-Math.PI/2,minGap:7,reuse:.35,lenBias:-.2,earlyStop:true,memBudget:80*1048576,layers:[{hex:'#151515',rgb:[.08],alpha:.12,lines:limit,start:0}]};
 const result=await solve(cfg);
 const project=validateProject({schema:SCHEMA,id:'memorystring-sample-'+label,title:'Golden retriever sample · '+label,createdAt:'2026-10-13T00:00:00Z',algorithm:ALGORITHM,frame:{diameterCm:42,pins:200,numbering:'clockwise-top-1'},layers:result.layers,step:0});
 let drawing='<circle cx="256" cy="256" r="240" fill="#FFFDF8"/>';
 for(const layer of project.layers){drawing+='<g fill="none" stroke="'+layer.color+'" stroke-width=".6" stroke-opacity="'+layer.alpha+'">';for(let i=1;i<layer.path.length;i++){const a=coords(layer.path[i-1]),b=coords(layer.path[i]);drawing+='<path d="M'+a.x.toFixed(2)+' '+a.y.toFixed(2)+'L'+b.x.toFixed(2)+' '+b.y.toFixed(2)+'"/>';}drawing+='</g>';}
 for(let i=0;i<200;i++){const p=coords(i);drawing+='<circle cx="'+p.x+'" cy="'+p.y+'" r=".8" fill="#183D35"/>';}
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'+drawing+'</svg>';
 await writeFile(join(kit,'detail',label+'.svg'),svg);await writeFile(join(kit,'detail',label+'.png'),await sharp(Buffer.from(svg)).png().toBuffer());await writeFile(join(kit,'samples',label+'.json'),JSON.stringify(project,null,2)+'\n');
 summary.push({label,limit,actualConnections:steps(project).length,straightThreadMetres:threadMeters(project),source:'AI sample photo through actual pinned MIT solver; not a physical portrait'});console.log(JSON.stringify(summary.at(-1)));
}
await writeFile(join(kit,'detail','solver-results.json'),JSON.stringify(summary,null,2)+'\n');
