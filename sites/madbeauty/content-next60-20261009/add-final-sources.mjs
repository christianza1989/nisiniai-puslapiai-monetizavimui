import fs from 'node:fs/promises';
const here=new URL('.',import.meta.url),file=new URL('SOURCE-CANDIDATES.json',here),list=JSON.parse(await fs.readFile(file,'utf8'));
const rows=[
['S105','Gatineau: 2026 plaukų priauginimo ir korekcijos kainynas','https://www.groziopaslaugos.lt/user_files/kainininkai/kainorastis%202026-01-07.pdf'],
['S106','The Head Room: juostelinio priauginimo meniu','https://theheadroom.lt/'],
['S107','PhiAcademy: PowderBrows šešėliavimas','https://www.phi-academy.com/en-us/courses/powderbrows'],
['S108','PhiAcademy: PhiBrows ir microblading apibrėžimas','https://www.phi-academy.com/en-us/contact'],
['S109','ARAVIA Professional: šalto kremo-parafino produktas','https://aravia.ru/catalog/krem_parafin_naturalnyy_s_molochnymi_proteinami_i_maslom_khlopka_210_ml/'],
['S110','ARAVIA Professional: šaltas ir šiltas parafinas','https://aravia-prof.ru/products/aravia-professional-paraffin/']
];
for(const[id,title,url]of rows){if(list.some(s=>s.id===id&&s.url!==url))throw Error(id);if(!list.some(s=>s.id===id))list.push({id,title,url,kind:'Primary provider/manufacturer',finding:'Claim-specific actual research',limit:'Only actually read bounded claims; no clinical efficacy or universal protocol'});}
await fs.writeFile(file,JSON.stringify(list,null,2)+'\n');console.log({total:list.length});
