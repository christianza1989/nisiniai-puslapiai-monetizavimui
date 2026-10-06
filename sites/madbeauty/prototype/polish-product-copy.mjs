import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('./public/workspace-ui.mjs',import.meta.url);let s=await readFile(file,'utf8');
for(const [a,b] of [["Naujas vietinis vizitas","Naujas vizitas"],["2 min. pagal laikrodį","2 min."]]){if(!s.includes(a))throw Error('Expected copy missing: '+a);s=s.replaceAll(a,b);}
await writeFile(file,s);console.log('Manual booking and hold copy clarified.');
