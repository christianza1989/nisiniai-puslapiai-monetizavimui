import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='C:/Users/lenovo/Documents/dovanos-memorycasting/public/fonts/autoelektrikaivilniuje';await mkdir(dir,{recursive:true});
const url='https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700&display=swap';
const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'}});if(!response.ok)throw Error(response.status);
const css=await response.text();let output='',files=[];
for(const block of css.matchAll(/\/\*\s*(.*?)\s*\*\/\s*(@font-face\s*\{[\s\S]*?\})/g)){
 if(!['latin','latin-ext'].includes(block[1]))continue;
 const remote=block[2].match(/url\(([^)]+)\)/)[1],family=block[2].match(/font-family:\s*'([^']+)'/)[1],weight=block[2].match(/font-weight:\s*([^;]+)/)[1];
 const name=family.toLowerCase().replaceAll(' ','-')+'-'+weight+'-'+block[1]+'.woff2',r=await fetch(remote);if(!r.ok)throw Error(remote);
 const bytes=Buffer.from(await r.arrayBuffer());await writeFile(dir+'/'+name,bytes);output+=block[2].replace(remote,'/fonts/autoelektrikaivilniuje/'+name)+'\n';files.push({name,source:remote,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
if(files.length!==10)throw Error('Expected both LT-capable subsets for five faces, got '+files.length);
await writeFile(dir+'/fonts.css',output);
for(const family of ['barlow','barlowcondensed']){const r=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/'+family+'/OFL.txt');if(!r.ok)throw Error('OFL fetch');await writeFile(dir+'/'+family+'-OFL.txt',await r.text())}
await writeFile(import.meta.dirname+'/fonts.json',JSON.stringify({date:new Date().toISOString(),cssSource:url,licence:'SIL OFL 1.1; copyright 2017 The Barlow Project Authors',files},null,2)+'\n');console.log('Downloaded',files.length,'WOFF2 files; latin-ext retained for Lithuanian.');
