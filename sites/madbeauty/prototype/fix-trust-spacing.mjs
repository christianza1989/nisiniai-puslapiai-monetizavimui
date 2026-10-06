import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('./public/product-trust.mjs',import.meta.url);let s=await readFile(file,'utf8');
for(const [a,b] of [['galioja10','galioja 10'],['kaip8','kaip 8'],['po30','po 30']]){if(!s.includes(a))throw Error('Expected copy missing');s=s.replaceAll(a,b);}await writeFile(file,s);
console.log('Privacy and cookie spacing corrected.');
