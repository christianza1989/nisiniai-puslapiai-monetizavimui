import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const s={id:'S111',title:'ARPANSA: lazerio, IPL ir LED technologijų grupės',url:'https://www.arpansa.gov.au/understanding-radiation/sources-radiation/more-radiation-sources/lasers-and-intense-pulsed-light-ipl',kind:'Australian government radiation authority'};
const r=await fetch(s.url),bytes=Buffer.from(await r.arrayBuffer());if(!r.ok)throw Error('Retrieval failed');
const file=sel.privateStudio+'/sources-next60/S111.html';await fs.writeFile(file,bytes);
const record={...s,status:r.status,finalUrl:r.url,mime:r.headers.get('content-type'),retrievedAt:new Date().toISOString(),file,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,review:'NOT_YET_READ'};
for(const[name,row]of [['SOURCE-CANDIDATES.json',s],[sel.privateStudio+'/sources-next60/FETCH.json',record]]){const f=name.includes(':/')?name:new URL(name,here),list=JSON.parse(await fs.readFile(f,'utf8'));if(!list.some(x=>x.id===s.id))list.push(row);await fs.writeFile(f,JSON.stringify(list,null,2)+'\n');}
console.log({status:r.status,bytes:bytes.length});
