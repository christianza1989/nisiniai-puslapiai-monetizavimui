import fs from 'node:fs/promises';
const here=new URL('.',import.meta.url),f=new URL('SOURCE-CANDIDATES.json',here),rows=JSON.parse(await fs.readFile(f,'utf8'));
const more=[
{id:'S113',title:'Gelish: iš anksto suformuoti Soft Gel tipsai',url:'https://gelish.com/products/soft-gel-tips-stiletto-medium-sc/1270004',kind:'Manufacturer product definition'},
{id:'S114',title:'CND: priauginimo formos paskirtis',url:'https://cdn.shopify.com/s/files/1/0794/0010/8323/files/Future_Forms_SBS.pdf?v=1709839408',kind:'Manufacturer professional documentation linked from cnd.com'},
{id:'S115',title:'Wella: sombre kaip švelnesnis ombre',url:'https://blog.wella.com/us/guide-to-sombre-hair',kind:'Manufacturer explanation'},
{id:'S116',title:'Brow Code: konkrečios henna formulės sudėtis',url:'https://browcode.co/en-as/products/henna-kit',kind:'Manufacturer product information'},
{id:'S117',title:'RefectoCil: konkretaus antakių dažo produkto informacija',url:'https://www.refectocil.co.za/product-natural-brown',kind:'Manufacturer regional product information'}
];
for(const s of more)if(!rows.some(r=>r.id===s.id))rows.push(s);
await fs.writeFile(f,JSON.stringify(rows,null,2)+'\n');
const planFile=new URL('REVISION-PLAN.json',here),plan=JSON.parse(await fs.readFile(planFile,'utf8'));
for(const id of ['SP-gidas','KP-kaina-trukme'])plan[id].instruction=plan[id].instruction.replaceAll('2026-10-09LT','2026-10-10LT');
plan['SP-hamamas']={sources:['S101'],instruction:'Hamamas prieš garinę ir bendrinę pirtį: atskirk garinę erdvę nuo darbuotojo vedamo ritualo; pateik tikrą SPA Vilnius rendered meniu2026-10-10LT garinė30min20EUR, Kesešveitimas+sutepimas40min60EUR, vardinisritualas60min90EUR, aiškiai konkretus skirtingosapimtiesmeniu neLTvidurkis. Pašalink tyrimo trūkumo/scaffolding kad šaltinis tik įžanga. NVSC2023 teisiniai priminimai nėra dabartinės normos detalių patikra: nepateik nepatikrintų galiojančių teisiniųpareigų, palik naudojimosi taisyklių/pasiūlymo sudėties pasirinkimo naudą. Be universalių sveikatingumo rezultatų, temperatūros/dozės/protokolų.'};
await fs.writeFile(planFile,JSON.stringify(plan,null,2)+'\n');
const notesFile=new URL('SOURCE-NOTES.json',here),notes=JSON.parse(await fs.readFile(notesFile,'utf8'));
for(const s of notes)if(['S101','S102'].includes(s.id)){s.dateCorrection={recordedAt:new Date().toISOString(),reason:'Retrieved after21:00UTC is next local calendar day in Europe/Vilnius; raw timestamps preserved'};s.note=s.note.replaceAll('2026-10-09','2026-10-10');}
await fs.writeFile(notesFile,JSON.stringify(notes,null,2)+'\n');
