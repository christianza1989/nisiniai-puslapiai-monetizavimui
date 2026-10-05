# Dovanos123 ir bendro core migracijos sutartis

Data: 2026-10-04. Koordinatorius: root sesija `01a0ec4c-c381-7c53-ac6e-8fc4e2755dc5`. Dovanų portalo savininkas: sesija `01a0b5ba-c024-7343-94c6-8a672170ecb3`.

**Aktualus statusas 2026-10-05: įgyvendintas ir patikrintas ribotas vietinis M1/M2/M3/M5 inkrementas; pilna migracija ir gyvas paleidimas nepriimti.** 11 peržiūrėtų gift revizijų / 15 WebP aktyvios tik izoliuotame local-preview/noindex; main išlieka 9v1/giftOFF. Actual homepage Lighthouse97/100/100/69, trys gidai96/100/100/69. Production, privatumo/inbox, legacyD1 ir v2 runtime/CLI vartai atviri; tikslus priėmimas [FINAL-LOCAL-REVIEW](research/dovanos123-integration-2026-10-04/M5/FINAL-LOCAL-REVIEW.json).

Istorinis planavimo žingsnis 2026-10-04: Dovanos sesija perskaitė visą dokumentą ir patvirtino savininkų lentelę bei M0–M5 vartus, nesutikimų neliko. Priimta schemaVersion2 ir v1 skaitymo/hash suderinamumas. Pirminiai source inventoriaus įrodymai lieka plano momento būsenos kopija; vėlesni kodo ir QA inkrementai aprašyti atskirai žemiau, jų nelaikyti jau pilnai įvykdytais vartais.

Kartu skaityti Dovanos sesijos valdomą `C:/Users/lenovo/Documents/dovanos-memorycasting/docs/DOVANOS123-BENDRO-TINKLO-INTEGRACIJOS-PLANAS-2026-10-04.md`. Šis dokumentas atsako į keturis jos klausimus: dabartinę registrų tiesą, gift rendererį, modelio evoliuciją ir darbų/priėmimo ribas. Planų neatitikimą taiso savo failo savininkas prieš įgyvendinimą.

## 1. Faktinis pagrindas

Patikrintų 19 source/config failų SHA-256 ir ribotas inventorius: `research/dovanos123-integration-2026-10-04/SOURCE-FACTS.json`. Tai lokalaus kodo būsena plano peržiūros metu; ne produkcinės DB, domeno nuosavybės ar gyvo veikimo įrodymas.

| Sritis | Kas veikia kode šiandien | Ko dar negalima laikyti įgyvendinta |
|---|---|---|
| Nišų kontaktai | Viešo repo `config/niche-network.json`: operatorius MB Pinet, default info@pinet.lt, tušti kontaktų/gavėjų override registrai | Patvirtinto paketo matomas email automatiškai neperrašomas pakeitus config. Kontaktų tekstus reikia atnaujinti studijoje ir iš naujo patvirtinti |
| Domenai | Config turi 22 networkDomains ir 0 networkLiveDomains. Compiled turinyje 9 v1 nišų paketai | Dovanos123 nėra networkDomains. Tuščias live registras neįrodo, kad visi domenai neveikia; jų paleidimas šiame registre nepatvirtintas |
| Gift identitetas | `lib/site-config.ts` turi legacy `dovanos123`; vieši ir D1 turinio skaitytuvai naudoja jo ID/site key | Vieno bendro visų sistemų registro kol kas nėra. D1 vidinis `sites.id` ir agentų `business_id` nėra viešo siteId pakaitalai |
| Turinio šaltiniai | Nišoms: studijos approved snapshot → paketas → `publicNichePages`. Gift: statiniai failai ir `lib/content-store.ts` D1 kelias | Gift dar nėra bendroje studijos publikavimo sutartyje. Dabartinė published/scheduled būsena nėra naujos revizijos approval |
| D1 approval | `lib/db-approval.ts` turi versijos, article laukų ir review metadata hash patikrą; D1 reader ją kviečia | Visas produkcinis DB redagavimo/patvirtinimo kelias šiame audite nebandytas. Statinis demo kelias neturi šių approval vartų |
| Forma | Nišų lead route pirmiausia saugo D1, tada bando SMTP arba LEAD_EMAIL; SMTP klaida nepanaikina įrašo | Šis route remiasi `nicheSiteByHost`; legacy gift jo dar negali naudoti be bendro resolverio adapterio |
| Paštas | MAIL_CORE ir 2026-09-30 traktorių self-test įrodo atskirai D1, SMTP priėmimą ir gavimą savininko dėžutėje | Tai ne Dovanos123 produkcinio laiško gavimo įrodymas. SMTP priėmimas savaime nėra inbox gavimas |
| Matavimas | Nišų interest route: pageview, email_click, phone_click; agregacija pagal site/day/path/event, bot/DNT/GPC vartai | product/network outbound ir form_submitted įvykiai dar nėra šio bendro route kontrakte. Paspaudimas nėra užsakymas |
| Agentų core | Atskiras runtime turi per-site/business kontekstą, viešo turinio manifestą ir vietinį D1 source importo kontraktą | Dovanos123 onboarding ir produkcinė D1 sinchronizacija nepatvirtinti. Esamas core/lokalaus mokymosi veikimas automatiškai neįjungia naujo domeno |

Tiksliniai viešo repo failai: `config/niche-network.json`, `lib/site-config.ts`, `lib/niche-sites.ts`, `lib/niche-links.mjs`, `lib/niche-network.ts`, `lib/content.ts`, `lib/content-store.ts`, `lib/db-approval.ts`, `lib/scheduler.ts`, `proxy.ts`, `app/niche/[siteId]/lead/route.ts`, `app/niche/[siteId]/interest/route.ts`.

`lib/scheduled-articles-2026.ts` tikrai turi 20 briefų datų nuo 2026-09-28 iki 2026-10-23; 07:30 +03:00 šioms datoms reiškia 04:30Z. Išsaugoti tą patį laiko momentą, ne sukurti naują publikavimo grafiką. `lib/content.ts` demo datos remiasi `Date.now()`: M0 fiksuoja vieną snapshot ir atskirai tikrina tikras istorines datas. Nežinomos pirmos publikacijos datos neišgalvojamos.

## 2. Vienas modelis, savarankiškas gift dizainas

**Pritariame gift rendererio naudojimui ant bendro patvirtinto turinio modelio.** Bendras core nėra bendras homepage šablonas. Dovanos123 išlaiko dovanų paieškos/hub patirtį, straipsnių dizainą ir esamus URL; kitų nišų kompozicijos neperdaromos.

Tikslinė grandinė: studijos privatus redakcinis registras → v1 arba v2 nepakitęs patvirtintas eksportas → version-aware validatorius → bendra vieša projekcija → pasirinktas site rendereris. Vienam perkeltam site/page nėra dviejų aktyvių rašytojų. Legacy statiniai failai/D1 tampa inventoriaus ir grįžimo šaltiniu, o ne nematomu viešo turinio fallback.

Stabilus identitetas `siteId=dovanos123`, `locale=lt-LT`, `canonicalHost=dovanos123.lt`, `timezone=Europe/Vilnius`. Registruoti aiškų atitikmenį legacy `sites.key` / patikrintam D1 vidiniam ID / agentų `business_id` ir aplinkai. Nekopijuoti kito site klientų ar žinių. Išjungtos legacy kalbos savaime neįjungiamos; jos nesukuria hreflang.

M0 inventorizuoja visą dabartinį URL kelią: `/`, `/straipsniai`, `/straipsniai/<slug>`, autorių ir tikrus informacinius/politikų puslapius, query filtrus, canonical bei alias. Straipsnio ID ir jo adresas yra skirtingi laukai; importas jų nenormalizuoja į prarandantį atitikmenį. `?tema=...` gali likti filtro funkcija, tačiau nėra automatiškai atskiras indeksuojamas puslapis.

### Kritinis host perjungimo vartas

`proxy.ts` šiandien tikrina `nicheSiteByHost` prieš legacyHosts. Importuotas dovanos123.lt paketas iškart perimtų visus jo URL į niche catchall. **Negalima tiesiog importuoti į aktyvų compiled registrą ir tikėtis, kad gift rendereris liks.**

M1 eksportas laikomas privačioje staging vietoje, kuri nedalyvauja aktyviame host resolverio sąraše. M2 parengia aiškų rendererio/routing pasirinkimą ir vieną site registry skaitytuvą abiem keliams. Tik priėmus M5 per-site cutover kartu aktyvuojamas paketas ir gift dispatch. Domain registry, owned status, live status bei turinio aktyvavimas yra atskiros reikšmės. Iki cutover dabartinis gift route veikia savo keliu; po jo atšaukto turinio legacy fallback nėra.

Visos išvestys remiasi tuo pačiu site/locale/time viešu inventoriu: gift HTML ir indeksai, autorių sąrašai, related/inline nuorodos, canonical, sitemap, robots politika, JSON-LD, LLM indeksai ir agentų knowledge projekcija. Schema aprašo matomą gift turinį; Service schema nepridedama dėl bendro seno page type.

## 3. Version 2, importas ir approval

**Sprendimas: schemaVersion 2, su tiksliai išsaugotu v1 readeriu ir pageRevisionHash.** V1 additionalProperties:false ir ribotas body modelis netinka nuostolių neturinčiai migracijai. Naujos semantikos nepriklijuojame nehashinamu sidecar ar nepastebimai keisdami v1 reikšmę. Senų paketų approval, byte/hash ir istoriniai auditai dėl migracijos neperrašomi.

M1 savininkai prieš kodą parengia bendras v2 fixtures/schema lauko sutartis:

- Tipizuotas straipsnio/redakcinių puslapių turinys; teksto, nuorodų ir sąrašų seka, vaizdo vieta. Inline `[[tekstas|article:ID]]` parsinti į escape-safe struktūrą, išlaikant kiekvieną tikslią vietą ir pasikartojimą. Dabartinis nišų `contextualParts` pagal pirmą label sutapimą nėra tinkamas šio importo pakaitalas.
- Author/source refs su site/locale, tikra person/organization tapatybe, šaltinio URL, accessedAt ir public/private žyma; kategorija/klasteris, productRecommendation ir konkretus CTA target. Neperkelti nepatikrintų demo ekspertų biografijų kaip tikrų faktų.
- Aiški editorial pirmos publikacijos ir reikšmingo atnaujinimo data. publishAt yra atidengimo laikas; approvedAt nėra savaime editorial dateModified. Visos planavimo datos normalizuojamos į griežtą UTC ISO, išsaugant momentą.
- Featured/inline media paskirtis, asset šeimos ID, alt, matmenys, teisės ir būtina autorystė. Privačius metodologinius šaltinius bei originalus laikyti privačiai. Matomo ImageGen ženklelio savininkas nereikalauja; kilmė išlieka medijos žurnale.

V2 approval hash apima visą viešai reikšmingą versiją: turinį/seką, URL/ketinimą, datas, ryšius, media, editorial metadata ir konkrečias author/source/CTA nuorodų versijas. Redakcinio registro atskiras įrašas negali po approval tyliai pakeisti article autorystės, šaltinio ar CTA. Eksportuojami tame approval užfiksuoti entity snapshotai/dependency hash; mutable root registras nėra bypass. Tiksli serializacija ir v2 payload iš anksto fiksuojami fixture, vienodi abiejose repo realizacijose.

Legacy adapteris yra idempotentinis staging importas pagal stable site/article ID. Pranešti apie ID/slug kolizijas, atskirti D1 ir statinį šaltinį, išsaugoti tombstone/hidden būsenas ir neperrašyti naujesnės studijos revizijos. Būsimas ar pasenęs scheduled laikas neatstoja redakcinio approval. Pirmas importas nėra automatinis visų demo įrašų publikavimas.

Laikas tikrinamas užklausos metu. Until deadline turinys/jo tikslo nuorodos ir privati medija neatskleidžiami; atėjus terminui nauja užklausa mato patvirtintą versiją be publikavimo cron. Cache politika privalo apimti artimiausią terminą ir revocation invalidaciją, įskaitant sitemap/LLM/JSON-LD. Atvertas naršyklės langas savaime nepersikrauna.

## 4. Redakciniai ir komerciniai tikslai

Esama `projectPublicPages` nuosavą domeną tikrina tik per nišinio paketo due page exact URL. Jei MemoryCasting būtų įtrauktas į owned registrą be adapterio, jo parduotuvės/UTM nuorodos būtų pašalintos. Jei nuosavas legacy domenas visai neregistruotas, jo nuoroda šiandien gali pereiti kaip įprasta išorinė. Abu atvejai turi būti išspręsti prieš kuriant naujus tinklo ryšius.

Vienas aiškus target resolveris skiria:

1. Redakcinį target: siteId + pageId, patvirtinta versija, publishAt, canonical ir atskiras realaus diegimo įrodymas. Nepasirengus target inline vietoje lieka paprastas label; all-to-all nuorodų nėra.
2. Commerce target: stabilus targetId, patikrintas operatorius/domenas/produktas/pasiūlymas, tikras destination ir komercinio ryšio atskleidimas, patikros laikas/būsena. Tai nėra fiktyvus niche article page ar bendro owned filtro išjungimas.

Commerce sutartyje leisti tik konkretų HTTPS origin/path ir išvardytus attribution parametrus; jų vertes koduoti ir riboti. Canonical normalizavimas nepraleidžia kito produkto, redirect URL, kredencialų, portų ar savavališkų query/fragment. Patikrinta MemoryCasting landing prieiga neatstoja veikiančio checkout. Shopify/MemoryCasting pardavėjas, užsakymai ir produktų faktai lieka atskiro adapterio atsakomybė; MB Pinet dovanų portalo operatorius jų automatiškai nepakeičia.

Viešas title/link/CTA, visų jo pasirodymų vieta ir registry target reference yra approval dalis. Resolveris gali paslėpti nebeprieinamą tikslą, tačiau negali be naujos revizijos pakeisti jo į kitą produktą. Pardavimo išvadoms būtinas faktinis parduotuvės užsakymo signalas, ne outbound click.

## 5. Kontaktai, atvejai ir agentų integracija

Dovanos123 naudoja numatytus MB Pinet / info@pinet.lt tik su peržiūrėtu jo matomu paketu ir aktualia privatumo/kontaktų informacija. Nenaudoti kitos nišos telefono, adreso ar fiktyvaus paslaugos pajėgumo. Patvirtinti tikrus reikalingus rekvizitus prieš paleidimą.

Shared formos ir events handleriai gauna vieną patikrintą host→site resolverį, o ne pasitiki browser paslėptu siteId. Patvari D1 forma nepriklauso nuo privataus agentų core prieinamumo. Kliento įrašo, SMTP priėmimo, inbox gavimo ir agento išsiųsto atsakymo kvitai yra atskiri; nesėkmingas transportas nevadinamas pristatymu.

Planuojamas events papildymas: `product_outbound_click`, `network_outbound_click`, `form_submitted` su serverio patikrintu site/page/target. Form submission skaičiuojamas po sėkmingo patvaraus įrašo ir deduplikuojamas pagal lead ID; analytikoje nėra vardų, email ar žinutės teksto. Consent į užklausą nėra rinkodaros prenumerata. Sintetiniai testai neįtraukiami į tikros paklausos rodiklius.

Voice/core sesijos savininkas priskiria `dovanos123` prie tikro business_id ir aplinkos, patvirtina kontaktus ir žinių manifestą iš bendros visible projekcijos. Originalus approval hash ir filtered projection hash lieka skirtingi. D1 lead→CaseSource turi source record ID + aplinkos/site deduplikavimą ir replay/cursor sutartį. Dabartinis vietinis eksportuotos SQLite skaitytuvas nevadinamas produkciniu Cloudflare connector.

Voice, automatinis išorinis paštas, FB, Shopify užsakymų vykdymas ir mokamos paslaugos neįjungiami vien onboarding. Naujo site capability/policy default OFF; esamos kitų nišų politikos ir mokymosi revizijos neliečiamos. Atskirai tikrinamas šio site knowledge/contact policy ir įjungimo priėmimas.

### M4 papildymas po core savininko patikros

Core sesija 2026-10-04 nurodė tris konkrečias sutarties ribas; root jas patikrino faktiniame source. Tai M4 priklausomybės, ne dabar taisomas runtime:

- `agent-business-core/runtime/src/pinet_core/contracts.py`: Knowledge.pages ≤30, KnowledgePage.text ≤18000, revocation hash batch ≤30. Prieš onboarding sutarti bounded, version-aware didesnio turinio manifestą ir retrieval/revocation batch strategiją. Negalima tyliai nukirsti į pirmus 30 puslapių ar prarasti teksto. Priėmimas su 31+ puslapiu, ilgu gidu ir visų revocation dalių replay; page limit ir revocation batch limit nėra tas pats apribojimas.
- Vietinis `scripts/network_manifest.mjs` ir viešo repo `lib/niche-voice.ts` tekstą išveda tik iš v1 paragraph/heading/list. V2 inline/editorial/commerce duomenims būtinas vienas normalizuotas, viešą projekciją gerbiantis žinių skaitytuvas; negalima gauti `[object Object]`, žalių legacy tokenų, privataus source ar ateities target. Jo originalus revision hash, filtered projection hash ir manifest/deployment identity turi apimti sutartus matomus faktus bei target/URL versijas. Testuoti to paties straipsnio gift HTML ir žinių teksto semantinį atitikimą.
- `src/pinet_core/lead_import.py` priima tik website_d1, UUID įrašo ID, tinkamą site, ordered (created_at,id) ir consent_at=created_at; būsenos tik new/notified, batch ≤30. Naują gift formą galima iškart kurti šiuo shared kontraktu. Seni ar kitokio formato įrašai/parduotuvės užsakymai negali būti įmesti prasimanius UUID, consent ar laiko faktą. Jiems būtinas atskiras patvirtintas source adapteris arba versioned import evoliucija su provenance, dedup ir notification-owner testais. Replay nepakartoja seno operatoriaus SMTP.

M4 neturi išvesti pardavimo iš užklausos ar publikavimo iš žinių indekso. Pilnas šių ribų projektas ir testų fixtures priklauso core savininkui; root su Dovanos sesija derina tik jų viešo modelio sąsają.

## 6. Darbų savininkai ir priklausomybės

| Etapas | Savininkas ir ribos | Kada galima tęsti |
|---|---|---|
| M0 | Dovanos sesija: legacy source/URL/D1 inventorius, snapshot, date provenance, prieš migraciją gift screenshots. Produkciniai duomenys tik tinkamoje privačioje aplinkoje | Tiesos šaltiniai, kolizijos ir nepatvirtinti faktai pažymėti; nėra klientų/secrets kopijų repo |
| M1 | Root koordinuoja schema/studijos modelį, export/hash ir abu validatorius. Dovanos sesija: atskiras legacy import adapteris ir loss report/fixtures | V2 field/hash fixtures sutarti; v1 išsaugojimas ir idempotentinis shadow importas patikrinti |
| M2 | Dovanos sesija: gift skaitymo/rendererio adapteris, esamos routes ir metadata. Root viename shared lange: host registry/resolver/proxy, projection/SEO sąsajos | M1 PASS; senų URL ir visų nišų dispatch regresijos PASS; paketas dar neaktyvuotas viešam host |
| M3 | Root: editorial/commerce target ir media kontraktas. Dovanos sesija: tikri produktų ryšiai, URL/media atitikmenys ir atskleidimas | M2 projekcija; tikri commerce tikslai, jokio sugalvoto checkout |
| M4 | Root: bendras contact/form/events sutarties papildymas. Voice/core sesija: tik savo runtime/profile/CaseSource/knowledge integracija | Host/projection sutartys priimtos; tik šio site apibrėžtos capabilities ir išlaidų ribos |
| M5 | Dovanos sesija tikrina gift turinio/vizualų/URL visumą; root tikrina studiją/shared regresijas; core savininkas tikrina agentų izoliaciją | Vietinio priėmimo įrodymai, per-site cutover/rollback. Produkcinis paleidimas turi atskirus faktinius vartus |

Tai būsimi failų savininkai, ne šiuo metu rezervuotas kodo langas. Prieš kiekvieną shared pakeitimą `WORKSTREAMS.md` fiksuoti konkretų vieną rašytoją, failus, fixtures/testus ir build izoliaciją; kitai sesijai pranešti. Viešo build/import/compiler veiksmai negali vykti lygiagrečiai su kito build naudojamu dist. Kitų nišų rendereriai/paketai ir kitų legacy site scheduler darbai neperdaromi.

Dovanos sesija pati redaguoja savo migracijos dokumentą. Root pats redaguoja šį dokumentą ir savo review katalogą. Voice/core savininkas pats keičia savo sutartį ir runtime dokumentus. Nė vienas planas savaime nereikalauja DB ar DNS pakeitimo.

## 7. Priėmimo vartai

Šis sąrašas yra būsimo įgyvendinimo kriterijai; žemiau esantys checkbox nėra šiame dokumentų ture atliktų testų deklaracija.

- [ ] Visi 9 esami v1 paketai byte/hash/approval nepakitę; v1 export/import regresijos PASS. V2 round-trip, abiejų schema validatorių ir hash fixtures sutampa.
- [ ] Importas nepraranda ID/teksto/datos/inline vietos/source visibility/autorystės/media/CTA; kolizijos matomos, pakartotinis importas nekuria dublių ir neperrašo naujos revizijos. Revoked/hidden URL negrįžta iš statinio fallback.
- [ ] Kiekvieno v2 viešai reikšmingo lauko ar entity snapshot pakeitimas panaikina approval; private source duomenys neatsiranda viešame pakete/HTML/LLM.
- [ ] T−1/T/T+1 ir UTC/DST fixtures: future/draft/revoked tiesioginis URL, home/index/author/related, sitemap, JSON-LD/LLM bei medija suderinti. Testuoti ir prieš terminą jau užkešuotą atsakymą; fake clock testas nėra produkcinio serverio datos keitimas.
- [ ] Gift routing/canonical/alias ir visas prieš/po URL inventorius teisingi. Nežinomas host ir svetimas site ID neprieinami. Aktyvavimo jungiklis nepriverčia gift naudoti generic niche catchall; kitos 9 nišos ir likę legacy hosts veikia kaip iki migracijos.
- [ ] Inline pasikartojimai ir skirtingi target su vienodu label išsaugoti; missing/future target plain text, malformed/JS URL escaped/rejected. Editorial live vartai ir commerce URL/UTM allowlist testuojami atskirai; target pakeitimas be approval neįmanomas.
- [ ] Tikri responsive WebP failai, tinkami sizes/crop/alt, Article image, teisės ir homepage/index/guide vizualai; skirtingų site assets izoliacija. Gift actual desktop/mobile, klaviatūra ir padidinimas patikrinti.
- [ ] Native/no-JS forma ir klaidos: durable D1, origin/site/consent ribos, transporto gedimas, tikras operatoriaus self-test su inbox ir pašalintu sintetiniu įrašu. QA aiškiai išjungti SMTP ir LEAD_EMAIL, o ne tik vieną flag.
- [ ] Events target/page/site tikrinimas, DNT/GPC/bot vartai, form ID deduplikavimas; click≠sale, analytics be klientų teksto. D1→CaseSource replay/site/env izoliacija; knowledge tik iš patvirtinto matomo turinio; default OFF.
- [ ] M4 papildomi vartai: 31+ puslapio ir >18000 simbolių turinio sutartis be tylaus praradimo; v2 HTML↔knowledge semantika; revocation per kelis batch; legacy ID/consent/source adapterio negative/replay testai. Esamų batch/limit reikšmių nepakanka būsimo didelio gift registro integracijos įrodymui.
- [ ] Studijos approval/export/public import e2e, viešo repo `npm run test:core`, `npm run test:seo-smoke`, gift aktualūs build/route/SEO testai; išmatuotas gift production-build Lighthouse ir A–Z/craft su savo įrodymais. Kitos svetainės balas nepernaudojamas.
- [ ] Cutover inventorizuoja pending legacy publish jobs ir outbox/event IDs. Nenaikinti DB/jobs iš plano; perkeltam site tik vienas publikavimo writeris. Rollback išsaugo naujus leads/revizijas ir revocation/tombstone; senas snapshot neatkuria po migracijos atšaukto straipsnio.
- [ ] Atskirai launch: tikri operatoriaus/politikų faktai, domeno nuosavybė, DNS/HTTPS/hostingas, produkcinė D1/mail prieiga ir tinkamas produkto kelias. networkLive įrašas tik po tikro diegimo patikros; vietinis PASS nevadinamas gyvu paleidimu ar paklausa.

Rollback persijungia tik Dovanos123 rendererio/turinio registracija, ne visas tinklas. Po cutover grįžimo snapshot privalo taikyti nuo M0 atsiradusius revocation/tombstone ir išsaugoti naujų kontaktų įrašus; jei to negalima užtikrinti, probleminį turinį uždaryti, o ne atkurti neatnaujintą demo fallback.

## 8. Šio plano patikros ribos

Patikrintas lokalaus source/config inventorius, schema/hash ir route prielaidos; 20 suplanuotų briefų datų ir 9 paketai suskaičiuoti automatiniu read-only skriptu. Priimta v2 ir gift rendererio kryptis. Gyvas D1 inventorius, tikros pirmos publikacijos datos, Dovanos123 production DNS/mail/analytics, visi juridiniai rekvizitai ir MemoryCasting checkout lieka UNVERIFIED šiame root ture.

Nebuvo keista schema, paketas, kontaktų config, rendereris, runtime, DB, build, DNS ar diegimas. Įgyvendinimo tests neruninti dokumentacijos pakeitimui; source fingerprint nėra veikimo testo pakaitalas. Toliau M0 inventorius, po jo atskirai rezervuotas M1 langas pagal abu suderintus planus.

## Įgyvendinimo būsena 2026-10-05

M1 lossless schema/hash/editor ir shadow import priimti vietoje, nepakitus devyniems V1 paketams. M2 version-aware host/renderer/SEO/LLM/shared forms/interest ir media originalų vartai įgyvendinti. M3 information-only target su expiry ir exact canonical/query guard įgyvendintas; nėra checkout. Root M5 synthetic `.example` build: HTTP/SQL/host/futureasset/LLM patikros ir visų9v1 SEO smoke PASS. Actual vizualiniai320px/kontrasto radiniai perduoti gift savininkui; galutinis after patvirtinimas [M5 QA](research/dovanos123-integration-2026-10-04/M5/QA.md).

[M4 runtime patikra](voice-agent-plan/M4_RUNTIME_VALIDATION_2026-10-04.md) yra core savininko realus transporto/readiness inkrementas su275PASS+2delta, ne visos18M4 sąlygos. V2 source emitter naudoja actual root projekciją; root M5/KNOWLEDGE-QA patvirtina9fixture puslapių atitikimą HTML, bet runtime source/learning/profile ON neįjungta. Gift typed legacy D1 mapping/backfill/retention, protected V2 learning/session adapteris ir deployed public HMAC pagination tebėra neįgyvendinti. Nesumaišyti to su veikiančia nuo runtime nepriklausoma svetainei skirtos D1 formos sutartimi.

Actual41gift juodraščiai nėra automatiškai peržiūrėti; turinio priėmimas priklauso gift sesijai. Skeletai/fiktyvios bylines/placeholder privacy nėra tvirtinami. Root suderino autonominį bent3naudingų pradinių gidų, home ir faktinių support tekstų review/shadow kandidatą. V2 plan/draft/autopilot generatorius kol kas disabled/fail-closed. Actual gift paketas, DNS/production/mail/privacy/legacy sources/admission/corpus dar nepriimti; neskelbiama M0–M5 viso cutover complete ar10/10.

Aktyviam importui `--acceptance <receipt>`: schemaVersion1 receipt su exact raw package SHA256, siteId/host/renderer, reviewer/acceptedAt ir visų local+launch production vartų PASS įrodymų hashes. Local-fixture receipt tik .example/testOnly ir visada noindex; jo checks nėra production PASS. Compiler v2 be receipt atmeta. Dabartinis gift admission tik lt-LT; kitų kalbų turinys/UI ir v2 niche rendereris reikalauja atskiro įgyvendinimo. Pasikeitęs paketo byte reikalauja naujo receipt; revocation/rollback niekada negali atkurti seno nepatvirtinto legacy fallback.

Vėlesnis local-preview scope leidžia actual canonical kandidato HTML tik loopback ir izoliuoto output checkout viduje, niekada main/realhost. Šios scope receipt nėra launch PASS; actual HTTP įrodymas fiksuojamas atskirai. M1 private-only assetmetadata API saugo originalų/hash/rights kilmę ir nekintamas publishedRev; 23studijos testaiPASS. Actual11draft pradinis nepriklausomas review ir konkretūs taisymo reikalavimai saugomi `research/dovanos123-integration-2026-10-04/EDITORIAL/`, root actualDATA neredaguoja. M4 operatorio per-site matching papildymas core savininko17targettestaiPASS, visos M4 liekanos dėl to nepanaikintos.

### 2026-10-05 actual shadow peržiūros inkrementas

Nepriklausomai peržiūrėtos ir gift savininko įprastu API patvirtintos 11 konkrečių revizijų, 3 naujos vaizdų šeimos / 15 WebP; likę 30 juodraščių nepatvirtinti. Exact shadow SHA `f9a14e3a5772781afe1233fbd3ccc6041ea2bf73aef2d7a12d40924ca6b4febd` įjungtas tik izoliuotame r2 localhost8930 local-preview/noindex. Actual HTTP/schema/media/SEO/LLM ir11 emitter fragmentų tekstų/hash patikros PASS,44core ir23studio PASS; 9v1/96URL smoke PASS, main9v1 bytes unchanged. Forma ir analytics actual pakete OFF, nes privatumo tekstai dar nepriimti. Paštas/inbox, production/DNS/HTTPS/hosting, kito legacyhost D1 suderinamumas, versioned Start/learning/protected corpus/edgepull/typedD1 nėra PASS. V2 CLI generation OFF. Actual browser320 kategorijų overflow ir LH kategorijų kontrasto klaidos taisytos rendererio savininko, originalūs įrodymai išsaugoti. Matavimai ir ribos: [root M5 QA](research/dovanos123-integration-2026-10-04/M5/QA.md). Šis inkrementas nėra M0–M5 viso priėmimo, gyvo paleidimo ar10/10 deklaracija.
