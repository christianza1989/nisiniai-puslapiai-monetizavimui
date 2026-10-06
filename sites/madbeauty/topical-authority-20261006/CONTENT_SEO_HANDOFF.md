# Straipsnis → procedūra / kategorija → miestas

2026-10-06. Savininkas nurodė visą katalogą `http://127.0.0.1:8811/` ir autorizavo konsultaciją su sesija `01a11268-7ab2-7a23-973c-598322dba15a` („Rask madbeauty.lt agentą“). Šis dokumentas išsaugo abiejų sesijų suderinimą. Platformos įgyvendinimo pauzė toje sesijoje neatšaukta; jos failai nekeisti.

## Autoritetingi duomenys

Platformos sesijos `sites/madbeauty/upgrade-plan-20261006/data.mjs` yra planavimo šaltinis; `TAXONOMY_PROPOSAL.json` — sugeneruotas ID kontraktas. 14 pagrindinių sričių / 194 procedūros ir 7 plėtiniai / 31 procedūra: iš viso 21 sritis, 59 grupės, 225 procedūros. `prototype/taxonomy-data.mjs` yra pradėtas runtime registras, dar neprijungtas. `prototype/cities.mjs` eksportuoja 103 poras `[cityId, pavadinimas]`.

Straipsnių teminis klasteris nėra platformos kategorijos ID. Katalogo procedūra nėra teikėjo pasiūlymo variantas. Kainą, trukmę ir variantus patvirtina tikras teikėjas. Nepriskirti hipotetinių variantų nacionalinei taksonomijai.

Iki šio katalogo pateikimo parengtas 19 redakcinių krypčių / 226 naujų straipsnių planas apima ankstesnę septynių ekrano pavyzdžių apimtį. Jis **nėra viso naujo 225 procedūrų katalogo pilnumo įrodymas**. Jį reikia sutikrinti ir išplėsti pagal naują registrą, o ne vien pakeisti bendrą temų skaičių.

## Suderintas būsimas nuorodų kontraktas

```json
{
  "taxonomyNodeId": "kirpimai-moteru-kirpimas",
  "cityId": "vilnius",
  "canonicalPath": "/paslaugos/kirpimai-moteru-kirpimas/vilnius",
  "routeRegistryId": null,
  "deployed": false,
  "indexEligible": false,
  "status": "planned"
}
```

`taxonomyNodeId` gali reikšti kategoriją, grupę arba konkrečią procedūrą. Būsima adresų forma: `/paslaugos/{taxonomyNodeId}` ir `/paslaugos/{taxonomyNodeId}/{cityId}`. Tikrą `routeRegistryId` ir aktyvią būseną pateiks platformos registras. Šioje būsenoje negeneruoti viešo href į dar neveikiantį maršrutą.

| Skaitytojo kelias | Plano tikslas | Taikymas |
| --- | --- | --- |
| Bendras kirpimo gidas | `kirpimai` + miesto pasirinkimas | Straipsnis neapsimeta Vilniaus pasiūlos apžvalga. |
| Moterų kirpimas pasirinktame Vilniuje | `kirpimai-moteru-kirpimas` + `vilnius` | Būsimas tikslas `/paslaugos/kirpimai-moteru-kirpimas/vilnius`. |
| Nagų paslaugos Vilniuje | `nagai` + `vilnius` | Plati kategorija `/paslaugos/nagai/vilnius`. |
| Gelinis lakavimas pasirinktame mieste | `lakavimas-gelinis-lakavimas` + tikras cityId | Konkretus padengimas; nereikia rodyti visų nagų procedūrų. |
| Tikras teikėjo pasiūlymo variantas | Teikėjo service / variant ID | Užsakymo kelias; ne naujas nacionalinis SEO puslapis. |

Bendras straipsnis turi statinę tikrą nuorodą į atitinkamą nacionalinį procedūros / grupės puslapį ir miesto parinkiklį. Po aiškaus miesto pasirinkimo klientas siunčiamas į tos pačios procedūros ir miesto rezultatus. Pasirinkimą galima išlaikyti kliento sesijoje, tačiau Google matomas bendras straipsnio HTML netampa individualiai parinkto miesto tekstu. Miestui skirtame straipsnyje miesto CTA gali būti statinis, kai yra originalių vietinių duomenų ir veikiantis tikslas.

Neprikabinti 103 miestų nuorodų prie kiekvieno straipsnio ir nedauginti straipsnių „procedūra × miestas“. Informacinė užklausa priklauso gidui, procedūros pirkimo užklausa mieste — tikram vietiniam rezultatų puslapiui. Sąrašai gali atgal susieti paaiškinamąjį gidą, kai jis padeda pasirinkti procedūrą.

## Google užklausos ir indeksavimas

Suderintas tikslas: užklausa „moterų kirpimas Vilnius“ turi atitinkamą viešą Vilniaus moterų kirpimo rezultatų puslapį; „nagų meistrai Vilniuje“ — platesnę nagų kategoriją Vilniuje. Galimybė būti indeksuotam ir rodomam yra techninis bei turinio tikslas. Google sprendimas rodyti konkretų rezultatą ir jo pozicija negarantuojami.

Pradinės konsultacijos metu platformos sesija patvirtino, kad naujų procedūros–miesto puslapių SSR, title/H1, canonical, indeksavimo sutartis ir sitemap **dar nebuvo įgyvendinti**. Vėlesnio vietinio pagrindo būseną fiksuoja atnaujinimas dokumento gale; indeksuojamų miesto SEO puslapių priėmimas tebėra atskiras. Esama gyva validacija remiasi ankstesniais 10 tipų. Vietinė planavimo peržiūra 8811 yra privatus dokumentas, ne viešos SEO funkcijos bandymas.

Reikalingas priėmimas prieš CTA aktyvavimą:

1. Stabilūs katalogo ir miesto ID; vienas centralizuotas maršruto resolveris, jokio URL spėliojimo straipsnių generatoriuje.
2. HTTP 200 prasmingam viešam deriniui; HTML be JavaScript jau pateikia procedūrą, miestą ir patvirtintos realios pasiūlos sąrašą. Teikėjo, adresų, kainų ir laisvumo faktai iš tos pačios viešos projekcijos.
3. Konkretūs title, H1, description ir self-canonical; matomi breadcrumbs ir įskaitomos href nuorodos. Vietiniame tekste tik patikrintos, skaitytojui reikalingos sąlygos, be automatinio miestų pavadinimų keitimo.
4. `indexEligible` tik kai turinys ir pasiūla prasmingi; į sitemap patenka tik galiojantys indeksuojami canonical URL. Vien katalogo eilutė ar 103 miesto ID nėra indeksavimo leidimas.
5. Datos, valandos, kainos, rikiavimo ir teikėjo varianto filtrai nesukuria neriboto indeksuojamų derinių tinklo. Fragmentas `#...` yra kliento filtro būsena, ne savarankiško indeksuojamo miesto puslapio pakaitalas.
6. Tuščiam **rezultatų filtrui** — HTTP 404 tame pačiame URL; nežinoma procedūra / miestas ir nelogiškas derinys taip pat 404. Naudingas savarankiškas redakcinis vietinis puslapis yra atskiras turinio objektas, o ne tuščio filtro pateisinimas. Ankstesnį noindex tuščiam filtrui siūlymą platformos sesija po konsultacijos patikslino į 404.
7. Tikras deployed resolverio įrašas, HTTP ir rendered patikra, paieškos filtro tikslumo bandymas, sitemap / robots kontrolė. GSC URL inspection po paleidimo; rezultatai vertinami query→page, o ne „schema yra, vadinasi Google rodys“.

Pirminė atrama, perskaityta 2026-10-06: [Google filtrų navigacijos gairės](https://developers.google.com/crawling/docs/faceted-navigation), [canonical taisyklės](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [naudingo turinio gairės](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Šis dokumentas yra suderinimo ir priėmimo sutartis, ne atlikto diegimo ar indeksavimo įrodymas.

## Darbų ribos

Platformos sesija valdo taksonomijos runtime, meistro procedūrų pasirinkimą, variantus, viešus rezultatų maršrutus ir jų SEO priėmimą. Ši turinio sesija valdo tyrimą, temų bei šaltinių žemėlapį, straipsnių struktūras, datas, vidines nuorodas, katalogo ID susiejimą ir bendras rašymo taisykles. Kiekvienas pending CTA lieka neaktyvus iki platformos įgyvendinimo priėmimo. Katalogo pasikeitimas inicijuoja aprėpties sutikrinimą; esamų patvirtintų tekstų, UUID ar publikavimo datų automatiškai nekeičia.

## Vėlesnis pagrindo darbų suderinimas

Platformos sesija vėliau perdavė savininko leidimą joje įgyvendinti siaurą straipsnių / katalogo nuorodų pagrindą; platesnis platformos upgrade lieka pauzėje. Šiai sesijai pateikė klausimą dėl konkrečių esamos studijos laukų. Atsakymas perduotas jos pokalbiui:

- `plan-result.schema.json` yra strict 24 puslapių transporto schema; taxonomy / city laukų šiuo metu neturi. `makePage` / `mergePlan` jų neperneša. `ARTICLE_CATALOGUE_TARGETS.json` kol kas yra master plano sidecar, ne runtime išsaugotas studijos laukas. Esamas CLI draft generuoja V1 blocks; jo negalima vadinti pilnu V2 CTA-aware autopilotu.
- V2 paketas jau palaiko inline `{kind:"commerce",targetId}` ir `editorial.commerceTargets` objektus `{id,url,label,relationship,verified,checkedAt}`. Straipsnių ryšiams naudoti tikrus `pageId` / `relatedPageIds`. Ateities katalogo URL neturi būti užmaskuotas kaip išorinis šaltinis.
- Esamas viešo core `lib/content-projection-v2.mjs` tikrina `commerceDestination(snapshot,registry,now)`. Registry formatas: `targets` masyvas su `id,status,canonicalUrl,allowedQueryParams,verifiedAt,expiresAt,purpose`. Parengtam tikslui reikia `status:"ready"`, galiojančių patikrų ir exact HTTPS origin/path; hash ir neleistini query atmetami. Neparengta inline nuoroda projektuojama kaip tekstas. Viešo registry ready nėra sukuriamas vien įrašius planned ID.
- Platformos pusei perduotas poreikis: versioned taxonomy ir miestai, tikri stabilių maršrutų ID, resolveris, šio bendro registry formato nišos adapteris, tikras national → city selector → results kelias ir izoliuotas fixture su vienu priimtinu teikėju bei kito miesto tuščio filtro 404. `indexEligible` atskiras nuo funkcinio CTA-ready. Juodraščiams pakanka stabilių planned ID; veikiančios viešos nuorodos laukia actual maršrutų priėmimo.
- Turinio sesijai lieka master brief / studijos ID / taxonomy / registry ID sutikrinimas bei V2 įrašymo ir importo kelias. Platformos sesijai neleista keisti šios sesijos `content-studio`, schemas ar SKILLS failų. Viešo bendro core `lib/content-*` / `config/commerce-targets.json` langas dar nesuderintas; nišos adapteris turi remtis esamu kontraktu.

Tai įgyvendinimo poreikių perdavimas. Šis ankstesnis įgyvendinimo poreikių perdavimas pats nesuteikia foundation ar studijos integracijos PASS. Vėlesnį konkretų source perdavimą fiksuoja kitas skyrius.


## Galutinis vietinio pagrindo source perdavimas — 2026-10-06

Platformos sesija perdavė commit `c1f159353620aed66e9c67a95306786646c7137c`, branch `ai/madbeauty-content-foundation-20261006`, [draft PR14](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/14). Read-only patikrintas tikslus HEAD ir švarus checkout; perskaityti `sites/madbeauty/content-foundation-20261006/{CONTRACT.md,README.md,VALIDATION.md,preview-release.mjs}`. Autoritetingi exports `taxonomy.json`, `cities.json`, `registry.planned.json`; node.kind = category/group/treatment. Read-only JSON/planTarget patikra PASS: 305 unikalūs mazgai, 225 treatment, 103 miestai, teisingi tėvų ID, V2 snapshot ID/label ribos; planned registras neturi aktyvių targets ir neaktyvuoja Vilniaus CTA.

`planTarget({taxonomyNodeId,cityId})` grąžina stabilų `mb:catalog:{node}[:{city}]` ID ir `/paslaugos/{node}[/{city}]`. Runtime `/content-targets.json` remiasi approved-public-only pasiūla ir 1 valandos TTL; national browse noindex, emptycity404, indexEligiblefalse. Eksportų ir nišos adapterio sutarties pakanka pilno tyrimo sidecar bei struktūrizuotiems V2 draftams. V2 snapshot `verified:false,checkedAt:null` iki realios patikros; planned URL neapeina resolverio kaip external.

Platformos sesijos `VALIDATION.md` pateikia 89/89 regresijos ir izoliuoto synthetic V2 shadow import / Node / Workers / desktop / mobile įrodymus. Tai tos sesijos lokalaus pagrindo acceptance, ne šios sesijos savarankiškai pakartoti testai ar tikro redakcinio straipsnio priėmimas. Galutinis private preview įėjimas yra `content-foundation-20261006/preview-release.mjs`, reikalauja exact reviewed release SHA, bendro verifyContentRelease ir shadow importer į atskirą sandbox. Gyvas deployment nepakeistas.

Šio source perdavimo metu turinio sesijai dar buvo likęs viso 225 katalogo klausimų sutikrinimas ir private studio plan→ID→V2 draft/import roundtrip. Vėlesnę plano būseną fiksuoja tolesnis skyrius. V1 plan schema/CLI nepalaiko pilno binding perdavimo ir V2 generator išjungtas. Vienos tikros peržiūrėtos revizijos tekstas, faktai, media, immutable export ir actual intake turi būti priimti prieš masinį vykdymą. GSC / indeksuojamų miesto puslapių / production PASS šiuo handoff nepriskiriamas. Bendras turinio core atnaujintas atskiru commit `da611ab` / PR10, main dar nesujungtas.

## Galutinis turinio planas ir realus raktažodžių tyrimas

Visos 225 treatment procedūros, 59 grupės ir 21 sritis sutikrintos su konkretaus straipsnio ID bei vardiniu skyriumi: PROCEDURE_COVERAGE.json. PLAN.json apima 300 naujų gidų, 3 esamų gidų atnaujinimus ir 940 suplanuotų redakcinių ryšių. Straipsniai turi planned catalogue target ID iš exact foundation registry; pasirinktas miestas nėra automatiškai Vilnius. Papildomai atlikta 730 frazių Google Ads apimčių, 33 susijusių užklausų grupių ir 60 Google organic imčių per treg / DataForSEO LT rinkai. SEO_MAP.json atskiria informacinį straipsnį nuo local komercinio filtro.

Šis planavimo priėmimas nepatvirtina tekstų, media, ekspertų review, studijos ID roundtrip ar gyvų href. Prieš vykdymą lieka konkreti private studio/V2 įrašymo ir importo patikra. Būsimus planuojamus URL nepradėti rodyti kaip veikiančių ar indeksuojamų rezultatų.
