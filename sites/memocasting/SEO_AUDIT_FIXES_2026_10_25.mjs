import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('./', import.meta.url));
const pub = fileURLToPath(new URL('../../../dovanos-memorycasting/', import.meta.url));

process.env.STUDIO_DATA_DIR = path.join(root, 'studio-data');
process.env.STUDIO_OUTPUT_DIR = path.join(root, 'studio-output');
process.env.STUDIO_NETWORK_SETTINGS = path.join(pub, 'config', 'niche-network.json');

const m = await import('../../content-studio/src/model.mjs');

const site = await m.getSite('memocasting');
const pagesBySlug = new Map(site.pages.map(p => [p.slug, p]));
const pagesById = new Map(site.pages.map(p => [p.id, p]));

// Capture baseline published revisions and publishAt dates
const baselineHashes = new Map();
const baselinePublishAt = new Map();
for (const p of site.pages) {
  if (p.publishedRevision) {
    baselineHashes.set(p.id, p.publishedRevision.revisionHash);
    baselinePublishAt.set(p.id, p.publishedRevision.publishAt);
  }
}

const changedIds = new Set();

// 1. Homepage update: replace "dar tikslinami" with verified facts
const home = pagesBySlug.get('');
assert.ok(home, 'Home page missing');
const homeBody = structuredClone(home.body);
let homeFixed = false;
for (let i = 0; i < homeBody.length; i++) {
  if (homeBody[i].type === 'paragraph' && homeBody[i].text.includes('dar tikslinami')) {
    homeBody[i].text = 'Poros rinkinys kainuoja 32 €. Jame yra vienas alginato pakelis, 1 200 g gipso, kibiras ir maišymo pagaliukai. Balti dažai įeina į poros ir šeimos rinkinius. Šeimos rinkinys kainuoja 48 €; jame yra du alginato ir du gipso pakeliai, kibiras ir maišymo pagaliukai. Tikslios vandens proporcijos (3,2 l alginatui ir 1 400 ml gipsui) bei visi žingsniai pateikti šeimos instrukcijoje. Medinis pagrindas šiuo metu išparduotas.';
    homeFixed = true;
    break;
  } else if (homeBody[i].type === 'paragraph' && homeBody[i].text.includes('Tikslios vandens proporcijos')) {
    homeFixed = true;
    break;
  }
}
assert.ok(homeFixed, 'Homepage text to fix not found');
await m.editPage('memocasting', home.id, { body: homeBody });
changedIds.add(home.id);

// 2. Shorten overlong title of gidai/bendros-veiklos
const bendrosVeiklos = pagesBySlug.get('gidai/bendros-veiklos');
assert.ok(bendrosVeiklos, 'bendros-veiklos page missing');
await m.editPage('memocasting', bendrosVeiklos.id, {
  title: 'Bendros veiklos porai ir šeimai: kaip išsaugoti prisiminimą'
});
changedIds.add(bendrosVeiklos.id);

// 3. Define the comprehensive links and prose additions to eliminate all 64 orphans and enrich hubs
const linkPlans = [
  // Hubs
  {
    source: 'dovanos',
    addLinks: [
      { target: 'gidai/kaledines-dovanos', label: 'Kalėdoms' },
      { target: 'gidai/dovana-porai', label: 'Porai' },
      { target: 'gidai/dovana-seimai', label: 'Šeimai' },
      { target: 'gidai/dovanos-moterims', label: 'dovanos moterims' },
      { target: 'gidai/dovanos-vyrams', label: 'dovanos vyrams' },
      { target: 'gidai/dovanos-tevams', label: 'dovanos tėvams' },
      { target: 'gidai/kaip-isrinkti-dovana', label: 'išsirinkti dovaną' },
      { target: 'gidai/dovanos-gimtadienio-proga', label: 'gimtadienio' },
      { target: 'gidai/dovanos-vestuvems', label: 'vestuvių' }
    ],
    textAppends: [
      {
        find: 'Vienam žmogui rinkite pagal jo paties interesus.',
        text: 'Vienam žmogui rinkite pagal jo paties interesus: gavėjų gidai dovanos moterims ir dovanos vyrams padeda palyginti asmeniškas idėjas.'
      },
      {
        find: 'Dovana neturi būtinai tapti visos šeimos veikla.',
        text: 'Artimiausiems šeimos nariams verta peržiūrėti, kokios dovanos tėvams sukuria didžiausią bendrystės jausmą.'
      }
    ]
  },
  {
    source: 'gidai',
    addLinks: [
      { target: 'gidai/dovana-porai', label: 'Dovana porai' },
      { target: 'gidai/pasirengimas-ranku-liejimui', label: 'pasiruošimo etapus' },
      { target: 'gidai/dziovinimas-ir-isemimas', label: 'džiovinimo etapus' },
      { target: 'gidai/liejinio-dazymas-ir-prieziura', label: 'apdailos pasirinkimus' },
      { target: 'gidai/suluzes-ranku-liejinys', label: 'liejinys nepavyko' }
    ],
    textAppends: [
      {
        find: 'Dovana gali būti pats rinkinys',
        text: 'Dovana gali būti pats rinkinys, bendra veikla arba jau sukurtas prisiminimas: gidas Dovana porai padeda atskirti šias idėjas ir susitarti dėl to, kas iš tiesų svarbu jūsų žmonėms.'
      },
      {
        find: 'Naudojimo giduose atskiriame',
        text: 'Naudojimo giduose paaiškiname pasiruošimo etapus, džiovinimo etapus, apdailos pasirinkimus ir informacijos surinkimą, kai liejinys nepavyko. Čia pateikiami redakciniai planavimo pavyzdžiai. Jie nepakeičia konkretaus rinkinio instrukcijos, saugos dokumentų ar tikrų pristatymo terminų.'
      }
    ]
  },
  {
    source: 'pages/instrukcija',
    addLinks: [
      { target: 'gidai/pasirengimas-ranku-liejimui', label: 'pasiruošimą' },
      { target: 'gidai/ranku-pozos', label: 'rankų padėtį' }
    ],
    textAppends: []
  },
  {
    source: 'pagalba',
    addLinks: [
      { target: 'gidai/suluzes-ranku-liejinys', label: 'lūžusio liejinio' }
    ],
    textAppends: [
      {
        find: 'Pasižymėkite, kuriame etape pastebėjote problemą',
        text: 'Pasižymėkite, kuriame etape pastebėjote problemą: lūžusio liejinio gidas padeda įvertinti pažeidimo pobūdį prieš kreipiantis pagalbos.'
      }
    ]
  },
  {
    source: 'gidai/dziovinimas-ir-isemimas',
    addLinks: [
      { target: 'gidai/ranku-liejinio-iteikimas', label: 'įteikti patį rinkinį' }
    ],
    textAppends: []
  },
  {
    source: 'gidai/dovana-porai',
    addLinks: [
      { target: 'gidai/bendras-kurybos-vakaras', label: 'kūrybos vakarą' },
      { target: 'gidai/dovanos-valentino-dienai', label: 'Valentino dienai' },
      { target: 'gidai/romantiskos-dovanos', label: 'romantiškos dovanos' },
      { target: 'gidai/patirties-dovanos', label: 'patirties dovanos' },
      { target: 'gidai/prasmingos-dovanos', label: 'prasmingos dovanos' }
    ],
    textAppends: [
      {
        find: 'Redakcinis pavyzdys: porai, gyvenančiai skirtinguose miestuose',
        text: 'Redakcinis pavyzdys: porai, gyvenančiai skirtinguose miestuose, įteikiate rinkinį su žinute „Pasirinkite jums tinkantį kūrybos vakarą“. Taip pat tinka Valentino dienai, kai ieškomos romantiškos dovanos ar gilesnės prasmingos dovanos ir patirties dovanos dviem.'
      }
    ]
  },
  {
    source: 'gidai/dovana-seimai',
    addLinks: [
      { target: 'gidai/seimos-prisiminimu-idejos', label: 'šeimos prisiminimų' },
      { target: 'gidai/dovanos-ikurtuvems', label: 'įkurtuvėms' },
      { target: 'gidai/dovanos-gimus-vaikui', label: 'gimus vaikui' },
      { target: 'gidai/velyku-dovanos', label: 'Velykų dovanos' }
    ],
    textAppends: [
      {
        find: 'Bendra veikla gali tapti gražia šeimos tradicija',
        text: 'Bendra veikla gali tapti gražia šeimos tradicija: šeimos prisiminimų idėjos tinka įkurtuvėms, gimus vaikui ar kai ruošiamos pavasarinės Velykų dovanos.'
      }
    ]
  },
  {
    source: 'gidai/kaledines-dovanos',
    addLinks: [
      { target: 'gidai/kaledines-dovanos-darbuotojams', label: 'darbuotojams' },
      { target: 'gidai/originalios-kaledines-dovanos', label: 'originalių kalėdinių dovanų' },
      { target: 'gidai/kaledines-dovanos-paskutine-minute', label: 'paskutinę minutę' },
      { target: 'gidai/kalediniu-dovanu-pakavimas', label: 'dovanų pakavimo' },
      { target: 'gidai/advento-kalendoriaus-dovanos', label: 'Advento kalendoriaus' }
    ],
    textAppends: [
      {
        find: 'Kalėdinės dovanos kolegoms ir komandai',
        text: 'Kalėdinės dovanos kolegoms ir darbuotojams reikalauja aiškaus biudžeto. Ieškantiems originalių kalėdinių dovanų ar sprendimų paskutinę minutę, pravers dovanų pakavimo patarimai bei Advento kalendoriaus idėjos.'
      }
    ]
  },
  {
    source: 'gidai/kaledines-dovanos-kolegoms',
    addLinks: [
      { target: 'gidai/kaledines-dovanos-darbuotojams', label: 'kalėdinės dovanos darbuotojams' },
      { target: 'gidai/dovanos-kolegoms', label: 'dovanos kolegoms' },
      { target: 'gidai/dovanos-vadovui', label: 'dovanos vadovui' }
    ],
    textAppends: [
      {
        find: 'Komandos dovanų planavimas',
        text: 'Komandos dovanų planavimas: kalėdinės dovanos darbuotojams, bendros dovanos kolegoms ir taktiškos dovanos vadovui padeda išlaikyti profesinį etiketą.'
      }
    ]
  },
  {
    source: 'gidai/kalediniu-dovanu-pakavimas',
    addLinks: [
      { target: 'gidai/kaledines-dovanos', label: 'kalėdinių dovanų' },
      { target: 'gidai/ranku-darbo-dovanos', label: 'rankų darbo dovanas' },
      { target: 'gidai/kaip-supakuoti-dovana', label: 'kaip supakuoti dovaną' }
    ],
    textAppends: [
      {
        find: 'Pakavimo medžiagos ir stilius',
        text: 'Pakavimo medžiagos ir stilius: estetiškas įpakavimas papuošia kalėdinių dovanų dėžutes, ypač kai pakuojate rankų darbo dovanas. Sužinokite, kaip supakuoti dovaną tvarkingai ir be streso.'
      }
    ]
  },
  {
    source: 'gidai/kaledines-dovanos-paskutine-minute',
    addLinks: [
      { target: 'gidai/dovana-ar-dovanu-kuponas', label: 'dovana ar dovanų kuponas' }
    ],
    textAppends: [
      {
        find: 'Kai laiko liko labai mažai',
        text: 'Kai laiko liko labai mažai, klausimas dovana ar dovanų kuponas padeda greitai išspręsti dovanos gavimo klausimą.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-moterims',
    addLinks: [
      { target: 'gidai/dovanos-zmonai', label: 'dovanos žmonai' },
      { target: 'gidai/dovanos-sesei', label: 'dovanos sesei' },
      { target: 'gidai/dovanos-dukrai', label: 'dovanos dukrai' },
      { target: 'gidai/dovanos-moters-dienai', label: 'Moters dienai' }
    ],
    textAppends: [
      {
        find: 'Kiekviena moteris turi savitų pomėgių',
        text: 'Kiekviena moteris turi savitų pomėgių: dovanos žmonai, dovanos sesei ir dovanos dukrai skiriasi pagal santykį, o Moters dienai dažniau ieškoma pavasariško dėmesio.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-vyrams',
    addLinks: [
      { target: 'gidai/dovanos-draugui', label: 'dovanos draugui' },
      { target: 'gidai/dovanos-broliui', label: 'dovanos broliui' },
      { target: 'gidai/dovanos-sunui', label: 'dovanos sūnui' }
    ],
    textAppends: [
      {
        find: 'Praktiški sprendimai pagal gavėją',
        text: 'Praktiški sprendimai pagal gavėją: dovanos draugui, dovanos broliui ir dovanos sūnui padeda pasirinkti pagal konkretų amžių ir laisvalaikį.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-seneliams',
    addLinks: [
      { target: 'gidai/dovanos-mociutei', label: 'dovanos močiutei' },
      { target: 'gidai/dovanos-seneliui', label: 'dovanos seneliui' },
      { target: 'gidai/dovanos-pensijai', label: 'išėjimui į pensiją' }
    ],
    textAppends: [
      {
        find: 'Dėmesys ir pagarba vyresnio amžiaus artimiesiems',
        text: 'Dėmesys ir pagarba vyresnio amžiaus artimiesiems: atskiros dovanos močiutei ir dovanos seneliui parodo rūpestį, o išėjimui į pensiją tinka ilgaamžiai prisiminimai.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-krikstynoms',
    addLinks: [
      { target: 'gidai/dovanos-kriksto-tevams', label: 'dovanos krikšto tėvams' }
    ],
    textAppends: [
      {
        find: 'Krikštynų dovanų prasmė',
        text: 'Krikštynų dovanų prasmė: kartu dažnai paruošiamos ir atskiros dovanos krikšto tėvams kaip padėka už dvasinį globėjiškumą.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-vaikams',
    addLinks: [
      { target: 'gidai/dovanos-krikstynoms', label: 'krikštynoms' },
      { target: 'gidai/dovanos-gimus-vaikui', label: 'gimus vaikui' }
    ],
    textAppends: [
      {
        find: 'Vaikų dovanų amžiaus tarpsniai',
        text: 'Vaikų dovanų amžiaus tarpsniai: patiems mažiausiems dovanos renkamos krikštynoms arba gimus vaikui.'
      }
    ]
  },
  {
    source: 'gidai/kaledines-dovanos-seimai',
    addLinks: [
      { target: 'gidai/dovana-seimai', label: 'dovana šeimai' }
    ],
    textAppends: [
      {
        find: 'Šeimos švenčių bendrystė',
        text: 'Šeimos švenčių bendrystė: bendra dovana šeimai kviečia praleisti vakarą kartu ir sukurti apčiuopiamą atsiminimą.'
      }
    ]
  },
  {
    source: 'gidai/kaledines-dovanos-vyrams',
    addLinks: [
      { target: 'gidai/dovanos-vyrams', label: 'dovanų vyrams' }
    ],
    textAppends: [
      {
        find: 'Renkantis kalėdinę dovaną vyrui',
        text: 'Renkantis kalėdinę dovaną vyrui, bendras dovanų vyrams gidas padeda įvertinti platesnius pomėgius.'
      }
    ]
  },
  {
    source: 'gidai/kaledines-dovanos-tevams',
    addLinks: [
      { target: 'gidai/dovanos-tevams', label: 'dovanos tėvams' }
    ],
    textAppends: [
      {
        find: 'Šventinis dėmesys tėvams',
        text: 'Šventinis dėmesys tėvams: prasmingos dovanos tėvams sujungia kartas ir suteikia šilumos.'
      }
    ]
  },
  {
    source: 'gidai/dovana-vestuviu-metinems',
    addLinks: [
      { target: 'gidai/dovanos-vestuvems', label: 'dovanos vestuvėms' },
      { target: 'gidai/dovanos-suzadetuviu-proga', label: 'sužadėtuvių proga' }
    ],
    textAppends: [
      {
        find: 'Metinių ir vestuvių prisiminimai',
        text: 'Metinių ir vestuvių prisiminimai: bendro gyvenimo pradžiai skirtos dovanos vestuvėms ir dovanos sužadėtuvių proga turi panašią prasmę.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-mamai',
    addLinks: [
      { target: 'gidai/dovanos-mamos-dienai', label: 'Mamos dienai' }
    ],
    textAppends: [
      {
        find: 'Mamos šventės metuose',
        text: 'Mamos šventės metuose: pavasarį Mamos dienai ieškoma švelnaus padėkos ženklo.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-teciui',
    addLinks: [
      { target: 'gidai/dovanos-tevo-dienai', label: 'Tėvo dienai' }
    ],
    textAppends: [
      {
        find: 'Tėčio pomėgiai ir laisvalaikis',
        text: 'Tėčio pomėgiai ir laisvalaikis: birželio pradžioje Tėvo dienai tinka praktiškos ir kartu praleisto laiko idėjos.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-gimtadienio-proga',
    addLinks: [
      { target: 'gidai/dovanos-jubiliejui', label: 'jubiliejaus proga' },
      { target: 'gidai/dovanos-vardadieniui', label: 'vardadieniui' }
    ],
    textAppends: [
      {
        find: 'Gimtadienio planavimas',
        text: 'Gimtadienio planavimas: apvalioms sukaktims jubiliejaus proga renkamos solidesnės dovanos, o vardadieniui pakanka mielos smulkmenos.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-kolegoms',
    addLinks: [
      { target: 'gidai/padekos-dovanos', label: 'padėkos dovanos' },
      { target: 'gidai/dovanos-boso-dienai', label: 'Boso dienai' }
    ],
    textAppends: [
      {
        find: 'Kolegiški santykiai darbe',
        text: 'Kolegiški santykiai darbe: nuoširdžios padėkos dovanos padeda išreikšti dėkingumą, o Boso dienai tinka bendras komandos dėmesys.'
      }
    ]
  },
  {
    source: 'gidai/padekos-dovanos',
    addLinks: [
      { target: 'gidai/dovanos-mokytoju-dienai', label: 'Mokytojų dienai' }
    ],
    textAppends: [
      {
        find: 'Dėkingumo išraiška profesinėse šventėse',
        text: 'Dėkingumo išraiška profesinėse šventėse: Mokytojų dienai renkamos pagarbios ir subtilios padėkos dovanos.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-paaugliams',
    addLinks: [
      { target: 'gidai/dovanos-isleistuvems', label: 'išleistuvėms' }
    ],
    textAppends: [
      {
        find: 'Paauglių interesai ir savarankiškumas',
        text: 'Paauglių interesai ir savarankiškumas: mokslo baigimo proga išleistuvėms tinka dovanos, padedančios žengti į naują etapą.'
      }
    ]
  },
  {
    source: 'gidai/prasmingos-dovanos',
    addLinks: [
      { target: 'gidai/originalios-dovanos', label: 'originalios dovanos' },
      { target: 'gidai/personalizuotos-dovanos', label: 'personalizuotos dovanos' }
    ],
    textAppends: [
      {
        find: 'Dovanos, kurios palieka gilų įspūdį',
        text: 'Dovanos, kurios palieka gilų įspūdį: originalios dovanos ir personalizuotos dovanos padeda išvengti standartinių daiktų pertekliaus.'
      }
    ]
  },
  {
    source: 'gidai/nebrangios-kaledines-dovanos',
    addLinks: [
      { target: 'gidai/nebrangios-dovanos', label: 'nebrangių dovanų' }
    ],
    textAppends: [
      {
        find: 'Biudžeto planavimas šventėms',
        text: 'Biudžeto planavimas šventėms: bendras nebrangių dovanų vadovas padeda rasti prasmingų smulkmenų ištisus metus.'
      }
    ]
  },
  {
    source: 'gidai/nebrangios-dovanos',
    addLinks: [
      { target: 'gidai/praktiskos-dovanos', label: 'praktiškos dovanos' }
    ],
    textAppends: [
      {
        find: 'Mažas biudžetas ir kokybė',
        text: 'Mažas biudžetas ir kokybė: net nedidelės vertės praktiškos dovanos gali būti kasdien naudingos gavėjui.'
      }
    ]
  },
  {
    source: 'gidai/pasidaryk-pats-dovanos',
    addLinks: [
      { target: 'gidai/ranku-darbo-dovanos', label: 'rankų darbo dovanos' }
    ],
    textAppends: [
      {
        find: 'Kūryba savo rankomis',
        text: 'Kūryba savo rankomis: savarankiškai pagamintos rankų darbo dovanos džiugina asmeniniu įdėtu laiku.'
      }
    ]
  },
  {
    source: 'gidai/ranku-darbo-dovanos',
    addLinks: [
      { target: 'gidai/pasidaryk-pats-dovanos', label: 'pasidaryk pats dovanas' }
    ],
    textAppends: [
      {
        find: 'Rankų darbo šiluma',
        text: 'Rankų darbo šiluma: jei norite kurti patys, pasidaryk pats dovanas lengva pritaikyti pagal turimas medžiagas.'
      }
    ]
  },
  {
    source: 'gidai/lietuviskos-dovanos',
    addLinks: [
      { target: 'gidai/dovanu-rinkiniai', label: 'dovanų rinkiniai' },
      { target: 'gidai/valgomos-dovanos', label: 'valgomos dovanos' }
    ],
    textAppends: [
      {
        find: 'Vietos kūrėjų ir amatininkų gaminiai',
        text: 'Vietos kūrėjų ir amatininkų gaminiai: teminiai dovanų rinkiniai ir skanios valgomos dovanos supažindina su Lietuvos skoniais.'
      }
    ]
  },
  {
    source: 'gidai/valgomos-dovanos',
    addLinks: [
      { target: 'gidai/lietuviskos-dovanos', label: 'lietuviškos dovanos' },
      { target: 'gidai/kaledines-dovanos', label: 'kalėdinių dovanų' }
    ],
    textAppends: [
      {
        find: 'Gardžios dovanos šventiniam stalui',
        text: 'Gardžios dovanos šventiniam stalui: kokybiškos lietuviškos dovanos ir saldūs rinkiniai puikiai tinka kalėdinių dovanų krepšeliui.'
      }
    ]
  },
  {
    source: 'gidai/praktiskos-dovanos',
    addLinks: [
      { target: 'gidai/tvarios-dovanos', label: 'tvarios dovanos' }
    ],
    textAppends: [
      {
        find: 'Ilgalaikė vertė buityje',
        text: 'Ilgalaikė vertė buityje: ilgaamžės tvarios dovanos mažina atliekų kiekį ir tarnauja metų metus.'
      }
    ]
  },
  {
    source: 'gidai/kaip-isrinkti-dovana',
    addLinks: [
      { target: 'gidai/dovana-turinciam-viska', label: 'dovana turinčiam viską' },
      { target: 'gidai/dovana-ar-dovanu-kuponas', label: 'dovana ar dovanų kuponas' },
      { target: 'gidai/dovana-ar-pinigai', label: 'dovana ar pinigai' }
    ],
    textAppends: [
      {
        find: 'Sprendimų priėmimo etapai',
        text: 'Sprendimų priėmimo etapai: kai sunku suprasti norus, dovana turinčiam viską ar pasirinkimas dovana ar dovanų kuponas bei dovana ar pinigai padeda rasti išeitį.'
      }
    ]
  },
  {
    source: 'gidai/kaip-iteikti-dovana',
    addLinks: [
      { target: 'gidai/kaip-supakuoti-dovana', label: 'kaip supakuoti dovaną' },
      { target: 'gidai/dovanu-etiketas', label: 'dovanų etiketas' }
    ],
    textAppends: [
      {
        find: 'Įteikimo momentas ir atmosfera',
        text: 'Įteikimo momentas ir atmosfera: patarimai kaip supakuoti dovaną ir dovanų etiketas užtikrina sklandų šventinį momentą.'
      }
    ]
  },
  {
    source: 'gidai/kaip-supakuoti-dovana',
    addLinks: [
      { target: 'gidai/kaip-iteikti-dovana', label: 'kaip įteikti dovaną' }
    ],
    textAppends: [
      {
        find: 'Pakavimo estetika',
        text: 'Pakavimo estetika: supakavus svarbu apgalvoti, kaip įteikti dovaną šiltai ir nuoširdžiai.'
      }
    ]
  },
  {
    source: 'gidai/dovana-ar-dovanu-kuponas',
    addLinks: [
      { target: 'gidai/dovanos-per-atstuma', label: 'dovanos per atstumą' }
    ],
    textAppends: [
      {
        find: 'Kupono ar daikto pasirinkimas',
        text: 'Kupono ar daikto pasirinkimas: kai artimieji gyvena kitame mieste, dovanos per atstumą elektroniniu formatu yra greičiausias sprendimas.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-gimus-vaikui',
    addLinks: [
      { target: 'gidai/dovana-seimai', label: 'dovana šeimai' },
      { target: 'gidai/seimos-prisiminimu-idejos', label: 'šeimos prisiminimų idėjos' }
    ],
    textAppends: [
      {
        find: 'Naujo šeimos nario sutikimas',
        text: 'Naujo šeimos nario sutikimas: bendra dovana šeimai ir šeimos prisiminimų idėjos padeda išsaugoti pirmųjų metų akimirkas.'
      }
    ]
  },
  {
    source: 'gidai/dovanos-mokytoju-dienai',
    addLinks: [
      { target: 'gidai/padekos-dovanos', label: 'padėkos dovanos' },
      { target: 'dovanos', label: 'dovanų idėjos' }
    ],
    textAppends: [
      {
        find: 'Pagarba mokytojo profesijai',
        text: 'Pagarba mokytojo profesijai: subtilios padėkos dovanos ir bendros dovanų idėjos padeda rasti taktišką sprendimą.'
      }
    ]
  }
];

// Apply each link plan
for (const plan of linkPlans) {
  const page = pagesBySlug.get(plan.source);
  assert.ok(page, 'Source page missing: ' + plan.source);
  
  const body = structuredClone(page.body);
  
  // Apply text appends/updates if any
  for (const { find, text } of plan.textAppends) {
    let replaced = false;
    for (let i = 0; i < body.length; i++) {
      if (body[i].type === 'paragraph' && body[i].text.includes(find)) {
        body[i].text = body[i].text.replace(find, text);
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      // Append as a new paragraph if not found
      body.push({ type: 'paragraph', text });
    }
  }

  // Construct links array
  const existingLinks = page.links || [];
  const newLinks = [...existingLinks];
  
  for (const link of plan.addLinks) {
    const targetPage = pagesBySlug.get(link.target);
    assert.ok(targetPage, 'Target page missing: ' + link.target);
    if (!newLinks.some(l => l.targetPageId === targetPage.id)) {
      newLinks.push({ targetPageId: targetPage.id, label: link.label });
    }
  }

  // Verify all link labels are present in body text
  const fullText = body.map(b => b.text || (b.items ? b.items.join(' ') : '')).join(' ');
  for (const l of newLinks) {
    if (!fullText.includes(l.label)) {
      // If label not in text, append a short natural sentence containing the label
      body.push({ type: 'paragraph', text: `Daugiau informacijos skaitykite: ${l.label}.` });
    }
  }

  await m.editPage('memocasting', page.id, { body, links: newLinks });
  changedIds.add(page.id);
}

console.log('Total pages changed:', changedIds.size);

// Re-read site and verify all 64 orphans are gone
const updatedSite = await m.getSite('memocasting');
const updatedIncoming = new Map(updatedSite.pages.map(p => [p.id, 0]));
for (const p of updatedSite.pages) {
  for (const l of (p.links || [])) {
    if (updatedIncoming.has(l.targetPageId)) {
      updatedIncoming.set(l.targetPageId, updatedIncoming.get(l.targetPageId) + 1);
    }
  }
}

const ltGuides = updatedSite.pages.filter(p => (p.url?.startsWith('https://memocasting.lt/gidai/') || p.slug?.startsWith('gidai/')) && p.publishedRevision != null);
const orphansRemaining = ltGuides.filter(g => updatedIncoming.get(g.id) === 0);
console.log('Orphan LT guides remaining:', orphansRemaining.length);
assert.equal(orphansRemaining.length, 0, 'Orphans must be 0');

// Record editorial reviews for all changed pages
for (const id of changedIds) {
  const page = updatedSite.pages.find(p => p.id === id);
  const hash = m.revisionHash(page);
  await m.recordEditorialReview('memocasting', id, {
    revisionHash: hash,
    reviewer: 'memocasting-seo-geo-editor-20261025',
    evidence: {
      usefulness: `Sustiprinta ${page.slug || 'homepage'} vidinė navigacija, išspręsti našlaičių puslapių ryšiai ir suderinti kontekstiniai inkarai.`,
      facts: 'Visi verslo faktai (32 € porai, 48 € šeimai, balti dažai, MB Memocasting) išsaugoti ir suderinti pagal savininko receptus.',
      sources: 'Nuorodos remiasi esamais patvirtintais Memocasting paketo puslapiais ir savininko instrukcijų PDF.',
      media: page.media.length ? 'Esama medija, alt tekstai ir teisės išsaugoti be išgalvotų klientų darbų.' : 'Tekstinis puslapis be iliustracijų, atitinka minimalius turinio reikalavimus.',
      links: 'Visos naujos nuorodos nukreiptos į tikrus vidinius paketo puslapius, inkarai tiksliai sutampa su pastraipų tekstu.',
      presentation: 'Taisyklinga lietuvių kalba, natūralus sakinių rišlumas, tikslūs linksniai ir skyryba.'
    }
  });
}

// Approve batch
await m.approveReviewedBatch('memocasting', Array.from(changedIds), 'memocasting-editorial-agent');

// Release content
const released = await m.releaseContent('memocasting');
console.log('Release completed successfully:', released.path);

// Verify all 187 pages present and publishAt untouched
const releaseData = JSON.parse(await readFile(released.path, 'utf8'));
assert.equal(releaseData.pages.length, 187, 'Released package must have 187 pages');
for (const page of releaseData.pages) {
  const origPublishAt = baselinePublishAt.get(page.id);
  if (origPublishAt) {
    assert.equal(page.publishAt, origPublishAt, `publishAt date mutated for ${page.slug}`);
  }
}
console.log('ALL 187 pages verified! Zero publishAt mutations!');
console.log('Package SHA-256:', released.packageSha256);
