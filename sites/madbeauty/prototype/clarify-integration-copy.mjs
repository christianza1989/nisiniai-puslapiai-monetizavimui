import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('./public/workspace-ui.mjs',import.meta.url);let s=await readFile(file,'utf8');
const edits=[
 ["'užklausos būsena'","'Užklausos būsena'"],
 ["Pasiūlyta reiškia tik vietinę būseną. Tikras pranešimas ir automatinis booking nesukuriami.","Įrašyta pasiūlymo būsena vizito nesukuria. Susisiek su klientu, aptark laiką ir paprašyk jo patvirtinti registraciją."],
 ["Peržiūrėti prijungimo sutartį","Kaip prijungiama sistema"],
 ["Būsimos integracijos sutartis","Registracijos sistemos prijungimas"],
 ["Tikras teikėjas turi patvirtinti išorinę registracijos nuorodą, duomenų autoritetą, laiko zoną ir atnaujinimo būdą. Neprisijungęs ar pasenęs kalendorius nepateikia fiktyvaus sloto.","Prieš prijungiant tavo naudojamą registracijos sistemą suderiname profilio nuorodą, kuri sistema valdo laikus, laiko zoną ir atnaujinimo dažnį. Neprijungtas ar pasenęs kalendorius nerodo nepatikrintų laisvų laikų."],
 ["Auth, API raktai, authoritative kalendorius, conflict ir delivery priėmimas yra vėlesnis backend darbas.","Prijungimo apimtis ir kaina aptariamos atskirai. Prieš pradėdami patikriname laikų atnaujinimą, persidengiančius vizitus ir pranešimų pristatymą."],
];for(const [a,b] of edits){if(!s.includes(a))throw Error('Expected copy missing: '+a);s=s.replaceAll(a,b);}await writeFile(file,s);
console.log('Integration and waitlist copy now explains user decisions.');
