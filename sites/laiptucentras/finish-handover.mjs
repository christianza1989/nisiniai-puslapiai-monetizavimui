import {readFile,writeFile,cp,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const local=new URL('./',import.meta.url),dest=new URL('FIRST-RUN/',local);
const final=`Sukūriau **laiptucentras.lt vietinę pirmos fazės svetainę**: 11 puslapių, 3 gidai, originalūs vaizdai ir D1 poreikio forma. Forma registruoja įrengimo poreikį be gamybos ar pasiūlymo pažado.

[Atidaryti peržiūrą](http://127.0.0.1:8786/) · [Auditas](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/laiptucentras/PHASE-1-AUDIT.md)

20 core testų ir šešių nišų SEO patikros praėjo. Mobilus Lighthouse: pradžia **92**, gidas **93**.

Vietinis auditas **9,72/10**, tačiau tikras 200 % didinimas nepatikrintas. Domenas viešai nepaleistas; produkcijos ir tikros paklausos vartai lieka atviri. Pirmasis rezultatas išsaugotas FIRST-RUN.

![Laiptų centro pradžia](C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/laiptucentras/qa/home-desktop-final.png)
`;
await writeFile(new URL('FINAL.md',dest),final);
await cp(new URL('qa/browser-handover.json',local),new URL('qa/browser-handover.json',dest));
const record=JSON.parse(await readFile(new URL('FIRST-RUN.json',dest),'utf8'));
for(const file of ['FINAL.md','README.md','qa/browser-handover.json']){
 const data=await readFile(new URL(file,dest));record.evidenceFiles.push({path:file,bytes:(await stat(new URL(file,dest))).size,sha256:createHash('sha256').update(data).digest('hex')});
}
record.finalTextStatus='Prepared exact final text; receiving parent records actual publication timestamp';
record.browserHandover='Viewport override reset and IAB deliverable tab left at homepage; qa/browser-handover.json';
await writeFile(new URL('FIRST-RUN.json',dest),JSON.stringify(record,null,2));
for(const row of record.evidenceFiles){const bytes=await readFile(new URL(row.path,dest));if(createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw new Error('Snapshot hash mismatch '+row.path);}
const audit=JSON.parse(await readFile(new URL('PHASE-1-AUDIT.json',local),'utf8'));
if(audit.checks.length!==85||new Set(audit.checks.map(c=>c.id)).size!==85)throw new Error('Incomplete audit');
console.log(JSON.stringify({snapshotFilesVerified:record.evidenceFiles.length,all85CriteriaStored:true,parentScore:null,preview:'http://127.0.0.1:8786/',deliveryFile:'FIRST-RUN/FINAL.md'}));
