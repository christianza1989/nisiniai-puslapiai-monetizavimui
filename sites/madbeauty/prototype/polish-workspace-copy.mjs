import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('./public/workspace-ui.mjs',import.meta.url);
let source=await readFile(file,'utf8');
const replacements=[
 [" · ${esc(r.id)}</p>","</p>"],
 ["title='vizitų suvestinė'","title='Vizitų suvestinė'"],
 [">profilių būsenos</h2>",">Profilių būsenos</h2>"],
 ["<h2 style=\"font-size:26px\">vizitų istorija</h2>","<h2 style=\"font-size:26px\">Vizitų istorija</h2>"],
 ["${esc(c.email)} · </p>","${esc(c.email)}</p>"],
 ["${ctx.dayLabel(0)} · </p>","${ctx.dayLabel(0)}</p>"],
 ["<span>laukia laiko</span>","<span>Laukia laiko</span>"],
 ["ctx.openDialog('pokalbis apie vizitą'","ctx.openDialog('Pokalbis apie vizitą'"],
 ["${textarea('žinutė'","${textarea('Žinutė'"],
];
for(const [before,after] of replacements){if(!source.includes(before))throw Error('Expected copy not found: '+before);source=source.replaceAll(before,after);}
await writeFile(file,source);
console.log('Nine scoped workspace copy corrections applied.');
