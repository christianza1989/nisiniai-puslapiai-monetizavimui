import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('./public/workspace-ui.mjs',import.meta.url);let s=await readFile(file,'utf8');
const before="<table><thead><tr><th>Profilis</th><th>Miestas</th><th>Tinkamumas </th><th>Veiksmas</th>";
if(!s.includes(before))throw Error('Eligibility table not found');
s=s.replace(before,"<table class=\"eligibility-table\"><thead><tr><th>Profilis</th><th>Miestas</th><th>Tinkamumas</th><th>Veiksmas</th>");
for(const [a,b] of [["${esc(o.profileState)}</p>","${esc(status(o.profileState))}</p>"],["${esc(r.organizationId)} · ${esc(r.kind)}","${esc(r.city||d.organizations.find(o=>o.id===r.organizationId)?.city||'')} · ${r.kind==='salon'?'Salonas':'Savarankiškas meistras'}"]]){if(!s.includes(a))throw Error('Expected operator copy missing');s=s.replaceAll(a,b);}
await writeFile(file,s);console.log('Operator mobile catalog and review facts polished.');
