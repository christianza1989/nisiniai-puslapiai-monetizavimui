import fs from 'node:fs/promises';
const file=new URL('SOURCE-CANDIDATES.json',import.meta.url),list=JSON.parse(await fs.readFile(file,'utf8'));
const rows=[
['S95','NHS: Pilates formato apibrėžimas','https://www.nhs.uk/live-well/exercise/pilates-and-yoga/pilates-for-beginners/','Sveikatos institucijos vartotojų informacija'],
['S96','PGDENT: higienos sudėtis ir kainynas','https://pgdent.lt/kainos/','LT teikėjo meniu'],
['S97','Dentara: skirtingos higienos apimtys','https://dentara.lt/kainos','LT teikėjo meniu'],
['S98','LSMU: ortodontijos profesijos studijų aprašymas','https://lsmu.lt/medicinos-akademijos-rezidenturos-studiju-programos-nuo-2023/ortodontija-2/','LT universitetas'],
['S99','Great Lengths: tvirtinimo sistemų skirtumas','https://www.greatlengths.com/en-ca/hair-extension-products','Gamintojo produktų aprašymas'],
['S100','Great Lengths: profesionalus sistemų nuėmimas','https://www.greatlengths.com/faq','Gamintojo sistemos DUK'],
['S101','SPA Vilnius: Vilniaus hamamo meniu','https://www.spavilnius.lt/lt/vilnius/proceduros/spa-ritualai-hamame/140','LT teikėjo meniu']
];
for(const[id,title,url,kind]of rows){if(list.some(r=>r.id===id&&r.url!==url))throw Error('ID collision '+id);if(!list.some(r=>r.id===id))list.push({id,title,url,kind,finding:'Actual claim-specific source research; retrieval is not review',limit:'Only actually read scope may support claims; no efficacy guarantees or universal protocol'});}
await fs.writeFile(file,JSON.stringify(list,null,2)+'\n');
console.log(JSON.stringify({added:rows.length,total:list.length}));
