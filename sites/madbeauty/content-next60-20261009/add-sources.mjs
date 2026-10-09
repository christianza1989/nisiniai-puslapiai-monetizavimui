import fs from 'node:fs/promises';
const here=new URL('.',import.meta.url),file=new URL('SOURCE-CANDIDATES.json',here),list=JSON.parse(await fs.readFile(file,'utf8'));
const added=[
 ['S85','Odontologų rūmai: specialistų licencijų priežiūra','https://odontologurumai.lt/del-gaunamu-vaspvt-laisku-apie-licencijamos-veiklos-prieziura/','LT profesinė institucija'],
 ['S86','Odontologų rūmai: įstaigos leidimai ir licencija','https://odontologurumai.lt/bendra-informacija/','LT profesinė institucija'],
 ['S87','Wella: AirTouch ir balayage skirtumas','https://us.wella.professionalstore.com/en-US/blog/hair-color/air-touch-balayage-technique','Gamintojo technikos paaiškinimas'],
 ['S88','The GelBottle: cat-eye ir chrome gamintojo sistemos','https://assets.thegelbottle.com/m/44e5120a36af3fa1/original/TGB_Application-Guide_Apres-Ski-Collection.pdf','Gamintojo dokumentas'],
 ['S89','Jo Mi: vėrimo meniu su įtrauktu papuošalu','https://jomitattoo.lt/auskaru-verimas/','LT teikėjo meniu'],
 ['S90','ODA klinika: vėrimo apimtis, atskiri papuošalai ir laikas','https://odaklinika.lt/auskaru-verimas/','LT teikėjo meniu'],
 ['S91','Era Esthetic: plaukų šalinimo lazeriu kainoraštis','https://lazerineklinika.lt/kainos/','LT teikėjo meniu'],
 ['S92','Amber Esthetic: plaukų šalinimo zonų kainoraštis','https://www.amberesthetic.lt/kainos','LT teikėjo meniu'],
 ['S93','Association of Professional Piercers: initial jewellery','https://safepiercing.org/jewelry-for-initial-piercings/','Profesinės asociacijos vartotojų informacija'],
 ['S94','Association of Professional Piercers: piercing guns','https://safepiercing.org/piercing-guns/','Profesinės asociacijos vartotojų informacija']
];
for(const [id,title,url,kind] of added){if(list.some(s=>s.id===id&&s.url!==url))throw Error('ID collision');if(!list.some(s=>s.id===id))list.push({id,title,url,kind,finding:'Claim-specific research; retrieval is not review',limit:'Read before claims; no credentials, universal protocol or efficacy guarantee'});}
await fs.writeFile(file,JSON.stringify(list,null,2)+'\n');console.log('Sources added: '+added.length);
