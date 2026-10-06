import {readFile,writeFile} from 'node:fs/promises';
const f=new URL('./public/app.mjs',import.meta.url);let s=await readFile(f,'utf8');s=s.replace('<a href="mailto:info@pinet.lt">info@pinet.lt</a><br>MB Pinet','<a href="mailto:${esc(boot.contact.email)}">${esc(boot.contact.email)}</a><br>${esc(boot.contact.operatorName)}');await writeFile(f,s);
