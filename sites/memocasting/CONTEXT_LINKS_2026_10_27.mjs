// Small, reviewed changes to the existing live Memory Casting pages.
// Source IDs, paths, publication times, media and unrelated copy are preserved.
import assert from 'node:assert/strict';

export function memocastingContextChanges(pkg, observedAt) {
  const pages = pkg.pages, bySlug = slug => {
    const p = pages.find(page => page.slug === slug);
    assert.ok(p, `Missing page: ${slug}`);
    assert.ok(Date.parse(p.publishAt) <= Date.parse(observedAt), `Target not public: ${slug}`);
    return p;
  };
  const defs = [
    {
      slug: 'gidai/kaledines-dovanos-teciui',
      additions: [{ index:33, starts:'Pavyzdžiui, vienas organizatorius', text:' Jei dovaną norite įteikti abiem tėvams, kalėdinių dovanų tėvams gide palyginsite bendrą ir dvi atskiras dovanas. Daugiau idėjų pagal pomėgius rasite gide apie kalėdines dovanas vyrams.' }],
      links: [['gidai/kaledines-dovanos-tevams','kalėdinių dovanų tėvams'],['gidai/kaledines-dovanos-vyrams','kalėdines dovanas vyrams']],
    },
    {
      slug: 'gidai/kaledines-dovanos-vaikams',
      additions: [{ index:11, starts:'Jei svarbus konkretus modelis', text:' Jei dovanos gavėjas jau paauglys, daugiau pasirinkimo klausimų rasite kalėdinių dovanų paaugliams gide.' }],
      links: [['gidai/kaledines-dovanos-paaugliams','kalėdinių dovanų paaugliams']],
    },
    {
      slug: 'gidai/kaledines-dovanos-seneliams',
      additions: [{ index:9, starts:'Iliustracinis pavyzdys:', text:' Jei ieškote bendros veiklos kelioms kartoms, peržiūrėkite kalėdinių dovanų šeimai idėjas.' }],
      links: [['gidai/kaledines-dovanos-seimai','kalėdinių dovanų šeimai']],
      insert: { before:14, heading:'Bendras apsilankymas meno muziejuje', text:'Jei abu mėgsta parodas, galite suplanuoti popietę MO muziejuje Vilniuje. 2026 m. spalio 27 d. standartinis bilietas kainavo 11 € žmogui, tad du standartiniai bilietai – 22 €. Patikrinkite galimas individualias lengvatas ir parodos laikotarpiu taikomas kainas. Prieš įsigydami bilietus suderinkite parodą, datą, kelionę ir tai, ar abu norėtų eiti. Jei jie pageidauja, galite pasiūlyti pasirūpinti nuvykimu.' },
      sources:[{url:'https://mo.lt/bendra-informacija/',label:'MO muziejuje',reason:'2026-10-27 patikrintas oficialus muziejaus kainynas: standartinis bilietas 11 €, lengvatos ir parodos keitimo laikotarpio kainos nurodytos atskirai.',verified:true}],
    },
    {
      slug: 'gidai/pasirengimas-ranku-liejimui',
      additions: [
        { index:3, starts:'Skaitydami pasižymėkite', text:' Pagal turimą rinkinį skaitykite poros rinkinio instrukciją arba šeimos rinkinio instrukciją.' },
        { index:12, starts:'Kalendoriuje atskirkite', text:' Atskirame gide sužinosite, kada išimti ir kaip džiovinti liejinį.' },
      ],
      replacements: [{ index:1, from:'šiame gide jų nespėjame', to:'šiame gide jų nenurodome' }],
      links: [['instrukcijos/poros-rinkiniui','poros rinkinio instrukciją'],['instrukcijos/seimos-rinkiniui','šeimos rinkinio instrukciją'],['gidai/dziovinimas-ir-isemimas','kada išimti ir kaip džiovinti liejinį']],
    },
    {
      slug: 'gidai/dziovinimas-ir-isemimas',
      additions: [{ index:12, starts:'Pasižymėkite, kada', text:' Kitą bandymą suplanuoti padės pasirengimo rankų liejimui gidas.' }],
      links: [['gidai/pasirengimas-ranku-liejimui','pasirengimo rankų liejimui']],
    },
    {
      slug:'pristatymas',
      replacements: [{index:2,from:'Keliems atskirai supakuotiems rinkiniams krepšelyje rinkitės kurjerį.',to:'Keli atskirai supakuoti rinkiniai taip pat gali būti siunčiami į pasirinktą paštomatą. Pristatymo kainą už užsakymą matysite prieš apmokėjimą.'}],
      links:[],
    },
    {
      slug:'gidai/originalios-kaledines-dovanos', links:[],
      insert:{before:13,heading:'Skonių pažinimas dviem',text:'Jei abu mėgsta ragauti naujus skonius, galima dovanoti sūrio „Džiugas“ degustaciją Vilniuje arba Telšiuose. 2026 m. spalio 27 d. pasirinkimas dviem kainavo 46 €, vienam – 23 €. Prieš pirkdami suderinkite datą ir kelionę, patikrinkite sudėtį bei gavėjams svarbius mitybos apribojimus. Jei vienas degustacijos nemėgsta, dvi atskiros mažos dovanos gali būti tinkamesnės. Kainos ir sąlygos gali keistis.'},
      sources:[{url:'https://www.geradovana.lt/surio-dziugas-degustacija-su-vynu-surio-dziugas-namai',label:'sūrio „Džiugas“ degustaciją',reason:'2026-10-27 pardavėjo puslapyje nurodyti Vilnius ir Telšiai bei 23 € vienam arba 46 € dviem; rezervavimo ir mitybos sąlygas tikrinkite prieš pirkdami.',verified:true}],
    },
    {
      slug:'gidai/kaledines-dovanos-vaikinui', links:[],
      replacements:[{index:6,from:'Toliau pateikti variantai yra pasirinkimo pavyzdžiai, o ne konkrečių pardavėjų pasiūlymai.',to:'Toliau pateiktos bendros kryptys yra pasirinkimo pavyzdžiai.'}],
      insert:{before:9,heading:'Automobilių istorija vietoj daikto',text:'Jei jis domisi automobiliais, apsvarstykite Vilniaus Automuziejaus dovanų kuponą. Pirmiausia paklauskite, ar jį domintų apsilankymas, ir įvertinkite nuvykimo kainą. Muziejus nurodo, kad popierinį kuponą galima įsigyti kasoje, o elektroninį – internetu; juo apmokamos muziejaus paslaugos ir suvenyrai. Pagal 2026 m. spalio 27 d. skelbtas kupono galiojimo sąlygas jis galioja 6 mėnesius nuo pardavimo. Prieš mokėdami patikrinkite norimą sumą ir galiojančias sąlygas; kuponas nereiškia, kad vizito laikas jau rezervuotas.'},
      sources:[{url:'https://automuziejus.lt/lankytojams/',label:'Vilniaus Automuziejaus dovanų kuponą',reason:'2026-10-27 oficialiame lankytojų puslapyje nurodytas kupono įsigijimo būdas ir naudojimas muziejaus paslaugoms bei suvenyrams.',verified:true},{url:'https://automuziejus.lt/taisykles-ir-salygos/',label:'kupono galiojimo sąlygas',reason:'2026-10-27 oficialiose taisyklėse nurodyta, kad kuponas galioja 6 mėnesius (180 kalendorinių dienų) nuo pardavimo.',verified:true}],
    },
    {
      slug:'gidai/kaledines-dovanos-paaugliams', links:[],
      insert:{before:14,heading:'Mįslėms ir trumpam vakarui',text:'„Deductio LT“ gali tikti paaugliui, mėgstančiam logines užuominas ir norinčiam žaisti su kitais. Pardavėjas nurodo 2–4 žaidėjus, apie 20 minučių trukmę, lietuviškas taisykles ir amžių nuo 8 metų; 2026 m. spalio 27 d. įprasta kaina buvo 13,99 €. Turint 20 € ribą, pristatymui ir pakavimui lieka 6,01 €. Prieš pirkdami patikrinkite prieinamumą ir įsitikinkite, kad paauglys nori būtent šio žaidimo bei turi su kuo žaisti. Kaina ir sąlygos gali keistis.'},
      sources:[{url:'https://www.brain-games.lt/products/deductio-lt',label:'Deductio LT',reason:'2026-10-27 pardavėjo produkto apraše nurodyti 2–4 žaidėjai, 20 min., amžius nuo 8 m., lietuviškos taisyklės ir įprasta 13,99 € kaina.',verified:true}],
    },
  ];
  return defs.map(def => {
    const original=bySlug(def.slug), body=structuredClone(original.body), links=structuredClone(original.links);
    for (const item of def.additions??[]) { const block=body[item.index]; assert.equal(block?.type,'paragraph'); assert.ok(block.text.startsWith(item.starts),`${def.slug}: paragraph changed`); block.text+=item.text; }
    for (const item of def.replacements??[]) { const block=body[item.index]; assert.equal(block?.type,'paragraph'); assert.ok(block.text.includes(item.from),`${def.slug}: original sentence changed`); block.text=block.text.replace(item.from,item.to); }
    for (const [slug,label] of def.links) { const target=bySlug(slug); assert.notEqual(target.id,original.id); assert.ok(body.some(block=>block.type==='paragraph'&&block.text.includes(label))); assert.ok(!links.some(link=>link.targetPageId===target.id&&link.label===label)); links.push({targetPageId:target.id,label}); }
    if(def.insert){const previous=body[def.insert.before-1];assert.ok(previous,`${def.slug}: insert point missing`);body.splice(def.insert.before,0,{type:'heading',level:2,text:def.insert.heading},{type:'paragraph',text:def.insert.text});}
    if(def.sources)assert.equal((original.externalLinks??[]).length,0,`${def.slug}: existing sources need preservation`);
    const externalLinks=def.sources??[];
    for(const source of def.sources??[])assert.ok(body.some(block=>block.type==='paragraph'&&block.text.includes(source.label)),`${def.slug}: source anchor absent`);
    return {id:original.id,slug:def.slug,expectedRevisionHash:original.revisionHash,publishAt:original.publishAt,input:{body,links,...(def.sources?{externalLinks}: {})}};
  });
}
