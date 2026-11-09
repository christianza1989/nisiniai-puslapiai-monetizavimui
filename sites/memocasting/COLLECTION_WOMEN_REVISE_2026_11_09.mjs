// Complete private drafts and contextual links; no reviews, approvals or releases.
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const pub=`${root}/memo-googlepay-privacy-public-20261105`;
const work=`${root}/memo-collection-draft-data-20261109`;
process.env.STUDIO_DATA_DIR=`${work}/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${work}/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${root}/memo-content-recovery-core-20261105/content-studio/src/model.mjs`));
let site=await model.getSite('memocasting');
const find=s=>{const p=site.pages.find(x=>x.slug===s);assert.ok(p,`Missing ${s}`);return p;};
const collection=find('dovanos/moterims');
assert.equal(collection.approval,null);
const b=[
 {type:'paragraph',text:'Rankų liejimo rinkinys – dovana moteriai, su kuria kartu kursite prisiminimą. Pasirinkite poros arba šeimos rinkinį pagal tai, kas dalyvaus, ir suplanuokite laiką, kurį norėsite praleisti kartu.'},
 {type:'heading',level:2,text:'Kokį rinkinį pasirinkti dovanai?'},
 {type:'paragraph',text:'Poros rinkinį rinkitės, kai liejinį norite kurti dviese: su partnere, mama, drauge ar kitu artimu žmogumi. Jame yra vienas alginato pakelis ir 1 200 g gipso. Šeimos rinkinys skirtas bendrai šeimos kūrybai: jame yra po du alginato ir gipso pakelius.'},
 {type:'paragraph',text:'Abiejuose rinkiniuose yra kibiras, maišymo pagaliukai ir balti dažai. Rankų kompozicijos tinkamumas priklauso nuo jų dydžio ir pasirinktos pozos, todėl nevertinkite jos vien pagal nuotrauką. Jei abejojate, kuris rinkinys tiks jūsų sumanymui, susisiekite ir apibūdinkite norimą kompoziciją.'},
 {type:'heading',level:2,text:'Kam ši dovana tinka, o kada rinktis kitą?'},
 {type:'paragraph',text:'Rinkinys gali tikti, kai gavėjai patinka kūrybinės veiklos ir ji norėtų skirti laiko kurti kartu. Jis gali būti gimtadienio, Kalėdų ar kitos progos dovana. Prieš rinkdamiesi pasitikrinkite jos norus: vien proga ar santykis dar nepasako, kokia veikla žmogui patiktų.'},
 {type:'paragraph',text:'Jei dovanos gavėja nori iškart gauti gatavą skulptūrą arba nenorėtų pati dalyvauti liejime, geriau svarstyti kitą dovaną. Čia perkate medžiagas liejiniui sukurti, o ne jau pagamintą darbą.'},
 {type:'heading',level:2,text:'Trys klausimai prieš pasirenkant'},
 {type:'list',items:['Ar jai patiktų kartu kurti, o ne iškart gauti jau pagamintą daiktą?','Kas dalyvaus: du artimi žmonės ar šeima? Palyginkite rinkinių sudėtį ir apgalvokite rankų pozą.','Ar galite susitarti dėl ramaus laiko ir tinkamos vietos liejimui? Prieš pradėdami perskaitykite pasirinkto rinkinio instrukciją.']},
 {type:'heading',level:2,text:'Ką suplanuoti gavus dovaną?'},
 {type:'paragraph',text:'Liejimui iš anksto pasiruoškite darbo vietą, vandens ir instrukcijoje nurodytus papildomus reikmenis. Dar prieš maišydami medžiagas išbandykite patogią rankų padėtį tuščiame inde. Jei dalyvauja vaikas, veiklą turi prižiūrėti suaugęs žmogus.'},
 {type:'paragraph',text:'Pagal abiejų rinkinių instrukcijas gipsas formoje stingsta vieną valandą; išimtą liejinį prieš dažant reikia džiovinti 5–7 paras. Jei prie gauto rinkinio pridėta instrukcija skiriasi, prieš pradėdami pasitikslinkite. Poros rinkinio instrukcija ir Šeimos rinkinio instrukcija padės susipažinti su konkrečia eiga.'},
 {type:'heading',level:2,text:'Kaip įteikti dovaną asmeniškiau?'},
 {type:'paragraph',text:'Pridėkite trumpą raštelį, kodėl norite šį prisiminimą sukurti kartu. Jei nežinote, kada gavėjai bus patogu, pasiūlykite laiką pasirinkti drauge. Taip ji galės nuspręsti ir su kuo norėtų dalytis šia patirtimi.'},
 {type:'heading',level:2,text:'Jei dar svarstote kitas dovanas'},
 {type:'paragraph',text:'Rankų liejimas yra viena iš galimų dovanų. Jei pirmiausia norite palyginti kitokias veiklas ir dovanas pagal gavėjos pomėgius, skaitykite gidą „dovanos moterims“.'}
];
await model.editPage('memocasting',collection.id,{body:b});
site=await model.getSite('memocasting');
const currentCollection=site.pages.find(p=>p.id===collection.id);
const label='rankų liejimo rinkinius dovanai moteriai';
for(const slug of ['gidai/dovanos-moterims','dovanos']){
 const p=site.pages.find(x=>x.slug===slug);assert.ok(p);
 const body=structuredClone(p.body);const prefix=slug==='dovanos'?'Rankų liejimo rinkinys porai ir rankų liejimo rinkinys šeimai':'Rankų liejimo rinkinys porai už 32 €';
 const targets=body.filter(x=>x.type==='paragraph'&&x.text.startsWith(prefix));assert.equal(targets.length,1,slug);
 targets[0].text+=` Palyginkite ${label} ir jų tinkamumą bendrai veiklai.`;
 const links=[...(p.links||[]),{targetPageId:collection.id,label}];
 await model.editPage('memocasting',p.id,{body,links});
}
site=await model.getSite('memocasting');
const out=['dovanos/moterims','gidai/dovanos-moterims','dovanos'].map(slug=>{const p=site.pages.find(x=>x.slug===slug);assert.equal(p.approval,null);return {slug,id:p.id,revisionHash:model.revisionHash(p),status:p.status,media:p.media.length,links:p.links.length};});
console.log(JSON.stringify({state:'private-drafts-not-reviewed-or-approved',pages:out}));
