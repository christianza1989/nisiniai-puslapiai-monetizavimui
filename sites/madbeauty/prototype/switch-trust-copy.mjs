import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('./public/content.mjs',import.meta.url);let source=await readFile(file,'utf8');
const start=source.indexOf('const trustPages='),end=source.indexOf('export function trustView',start);
if(start<0||end<0)throw Error('Expected original trust section not found; do not guess');
source=source.slice(0,start)+"import {trustPages} from './product-trust.mjs';\n"+source.slice(end);
await writeFile(file,source);console.log('Product trust copy connected');
