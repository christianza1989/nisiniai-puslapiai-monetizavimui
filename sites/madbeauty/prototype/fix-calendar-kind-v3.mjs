import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('public/workspace-ui.mjs',import.meta.url),source=await readFile(file,'utf8');
if(!source.includes("d.organization.kind==='salon'"))throw Error('Exact migration target missing');
await writeFile(file,source.replace("d.organization.kind==='salon'","d.organizations[0]?.kind==='salon'"));
const css=new URL('public/workspace.css',import.meta.url),styles=await readFile(css,'utf8'),rule='.time-appointment{font-size:11px;gap:2px}.time-appointment strong{font-size:12px}.time-appointment small{font-size:10px}.time-axis span{font-size:11px}';
await writeFile(css,styles.replace(rule,'').trimEnd()+'\n'+rule+'\n');
