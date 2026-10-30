# Kvapunaikinimas.lt: vietinės migracijos priėmimas

Vėlesnė Roko užsakyta vizualinės atitikties pataisa ir nauji galutinės versijos matavimai: [VISUAL-REPAIR-2026-10-29.md](VISUAL-REPAIR-2026-10-29.md). Žemiau išsaugoti ankstesnio migracijos etapo rezultatai yra istorinis priėmimas, ne galutinės pataisos greičio ar sąveikų rezultatas.

Būsena: parengta vietinei savininko peržiūrai. Gyva svetainė, DNS ir tikras paštas nekeisti. Tikras `kvapunaikinimas.lt` turinys lieka Studio juodraštis be savininko approve/release. Naršyklės bandymams naudojamas atskiras `kvapunaikinimas.example` paketas; jo sintetiniai patvirtinimai nesuteikia teisės publikuoti tikro domeno.

Peržiūra: `http://127.0.0.1:8918/`. Izoliuotas runtime: `D:/Core/output/kvapunaikinimas-preview-20261029`. Šaltinis: šio darbo Core ir public worktree, bazės `25292e20219b735df7f04c5807dd4c100f98addc` ir `c2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da`. Pakeitimai dar nėra visiems PC galiojantis main.

## Kas išsaugota ir pataisyta

- Perkelti visi 12 esamų puslapių, jų originalios nuotraukos, logotipas, debesų dekoras, paslaugų seka, visi keturi telefonai ir `sales@kvapunaikinimas.lt`.
- Naršyklėje patikrintas 261 originalaus turinio fragmentas: trūkstamų nėra. Tai apima ir originalius ozono teiginius; jų taisymas aiškiai neįtrauktas Roko pavedimu (5 punktas). Privatumo puslapis yra savininko atskirai leista išimtis.
- Kiekviename puslapyje vienas H1, aprašymas, savas canonical, bendro Core schema ir SSR turinys. FAQ atsakymai yra HTML, o klausimai pateikti native details/summary elementais.
- Išliko visi senieji slug. Core normalizuoja galinį `/` vienu 308 nukreipimu; vidinės nuorodos ir canonical galutinį formatą nurodo nuosekliai. Senieji Yoast sitemap adresai vienu 301 nukreipiami į `/sitemap.xml`.
- Nėra WordPress, Elementor, NitroPack, jų skriptų ar rasto `JS CODE` sintaksės defekto. Šis rendereris neįtraukia analitikos, reklamų ar lankytojų sekimo skriptų. Šriftai vietiniai, nuotraukos importuotos bendru responsive WebP keliu.
- Išlaikyta Open Sans tapatybė ir spalvos; pagerintas kontrastas, antraščių struktūra, mobilios paslaugų kortelės, matomas skambinimas, 320px antraštės išdėstymas ir teksto laužymas. 390px teksto didinimo 2× patikroje nukirsto teksto nerasta.
- Forma turi aiškius laukų pavadinimus ir pasirinktam atsakymo būdui reikalingą kontaktą. Telefoninė užklausa priimama be el. pašto; adresas neišgalvojamas. Naudojama esama D1 saugykla, o sėkmė rodoma tik po įrašymo.

## Faktinės patikros

Įrodymai saugomi `D:/Core/output/kvapunaikinimas-assessment-20261029/`; tikslūs failų ir paketo SHA pateikti `QA-summary.json`.

| Patikra | Rezultatas |
|---|---|
| Public `npm run test:core` | 298/298 PASS |
| Studio `npm test` su actual companion env | 75/75 PASS |
| Completion / audit-provider regresijos | 10/10 PASS |
| TypeScript ir scoped ESLint | PASS; dokumentuotos native host nuorodų ir jau optimizuotų img išimtys |
| Izoliuotas production build / RSC assets | PASS |
| Bendras `test:seo-smoke` su canonical Host | 12 puslapių, schema, sitemap, robots, LLMS, 404 ir host isolation PASS |
| Vietinis native formos bandymas | 17 patikrų PASS; 3 sintetiniai įrašai patikrinti ir pašalinti; SMTP išjungtas |
| Originalaus turinio palyginimas | 261/261; 12/12 kontaktų ir metadata patikros |
| Lighthouse13.6, Chrome156, mobile simulation | Greitis98, prieinamumas100, best practices100 |
| LCP / TBT / CLS | 2,31s / 21ms / 0,0068; prieš migraciją5,27s / 552,5ms / 0,3192 |
| Perduota duomenų | apie424KB; seno puslapio bandyme apie1MB |
| `npm audit --omit=dev` | 6 pradiniai radiniai →0 |

Tai vieno vietinio laboratorinio bandymo rezultatas, ne gyvos svetainės lauko INP ar garantuotas realaus serverio greitis. Ankstesni bandymai išsaugoti. Matavimas atliktas prieš galutinį vien vidinių nuorodų formato normalizavimą; medija, šriftai, CSS ir publikavimo paketas nepakito. Galutinio Lighthouse SEO69 priežastis yra tyčinis vietinės peržiūros `noindex` ir robots blokavimas; kiti skaičiuojami SEO patikrinimai praėjo. Indeksavimo apsauga nebuvo išjungta balui pagerinti.

Native mobilus meniu atvertas pele ir išmatuotas; pasirenkant atsakymo būdą patikrintos tikros formos required būsenos. FAQ native DOM aktyvacija patikrinta. IAB actionability / klaviatūros bandymas buvo nepatikimas; jo rezultatų nelaikome patvirtintu realaus vartotojo klaviatūros testu. Gyvoje peržiūroje likusią rankinę pointer/keyboard patikrą reikia pakartoti.

Bendras naujos nišos `SITE_COMPLETION.json` sąmoningai liko `NOT_COMPLETE`: vieninteliai likę kodai yra `NO_PUBLIC_ARTICLE_INDEX` ir `NO_PUBLIC_ARTICLE_TO_INSPECT`. Šis pavedimas yra esamų 12 paslaugų puslapių migracija; naujas gidų hub ir straipsniai nebuvo užsakyti. Visos102 HTTP / HTML / media / discovery užklausos atliktos; naujos svetainės pilno priėmimo pažyma neimituojama.

## Aptarti prieš paleidimą

1. Pilnas `npm audit` dar rodo20 kūrimo priklausomybių įrašų:9 high,10 moderate,1 low. Tarp jų senesni Vinext, Vite ir Cloudflare kūrimo įrankiai. Tai atskira platesnio suderinamumo atnaujinimo apimtis; `--omit=dev` rezultatas neįrodo, kad šių paketų kodas niekur nepatenka į Worker. Šio ruošinio nelaikome visapusiškai saugumo sertifikuotu.
2. Roko leistas trumpas privatumo pranešimas aprašo faktinę formą. Neįrašyta išgalvota įmonė, MB Pinet, saugojimo terminas ar visa BDAR atitiktis. Tikro valdytojo tapatybė, teisinis pagrindas, saugojimo kriterijai, teisių informacija ir realūs prieglobos / pašto gavėjai lieka neišspręsti paleidimo faktai.
3. Tikras pristatymas į `sales@kvapunaikinimas.lt`, production DB ir mail binding / SMTP dar nebandyti. Reikia atskiro leisto tikro laiško bandymo ir gavimo įrodymo; vietinis saugojimas nėra inbox rezultatas.
4. Prieš pakeičiant domeno srautą: Hostinger failų ir DB atsarginė kopija, tikro native paketo peržiūra / approve / release, parengtas hostingas, pašto DNS įrašų išsaugojimas ir atstatymo kelias. Patikrinus naują svetainę seną WordPress reikės uždaryti viešai prieigai. Dabar jis neliečiamas.

## Core grįžtamasis ryšys

- `upgrade-875db006-07ec-421a-825a-37dba3e005e5`: V1 Studio sąrašo punktas buvo tyliai kerpamas ties700 ženklų; vienas originalus820 ženklų punktas prarasdavo120. Dabar iki3000 išsaugoma, per ilgas punktas atmetamas. Esami paketai ir ankstesni patvirtinimai neperrašyti.
- `upgrade-5c76b3f6-728d-4dd1-872e-3457265c8bdd`: rendereris ir site-scoped atsakymo būdas naudoja bendrą publikavimo, medijos, SEO, host ir užklausų kelią.
- `upgrade-336aed46-9fec-46cb-940f-be43987a7b92`: Next16.4.3, Zod4.6.7, transitive pataisos ir sharp0.35.5 override; yra tikra ingest suderinamumo regresija.
- `upgrade-6e1edd6c-0090-49bd-9035-2d56b6ab8f26`: current Node fetch ignoravo custom Host ir davė klaidingą canonical sitemap404. Bendras verifier dabar siunčia tikrą HTTP Host, išlaiko TLS origin, manual redirect bei laiko / dydžio ribas. Straipsnių reikalavimai nesusilpninti.

Pilnas skills struktūros tikrinimas šiame own worktree turėjo aplinkos ir nesusijusių pradinių radinių (provider PyYAML, global discovery junctions ir kito skill hash); jo nevadiname PASS. Paveikto verifier10 regresijų PASS, savo audit skill entry SHA atnaujintas, archyvų baitai nepakeisti. Įrodymai ir konkrečių šakų PR perduodami atskirai nuo main merge ir kito PC adoption.

2026-10-30 papildymas: šiame faile aukščiau esantys skaičiai aprašo pradinę migraciją. Aktuali antrojo vizualinio taisymo patikra yra [SECOND-FIDELITY-2026-10-30.md](SECOND-FIDELITY-2026-10-30.md) ir jos QA JSON: šeši radiniai uždaryti,24 vaizdai,261/261 turinio fragmentas,18 išskleistų atsakymų,305 public regresijos. Dabartinis vietinis Lighthouse90/100/100,CLS0; ankstesnio98 ar96 rezultato netaikyti dabartiniam build. Tikro domeno juodraščio ir paleidimo ribos nepasikeitė.

2026-10-30 mail follow-up: the owner authorized the new authenticated sender and one marked test to the existing sales recipient. Actual local Worker auth, native form storage/SMTP acceptance and exact owner-confirmed receipt now PASS. The literal local-secret loader defect was repaired with307 public regressions; the previous multi-submission verifier now refuses by default while preview mail may be enabled. Earlier SMTP-disabled checks remain historical. See [MAIL-CONNECTION-2026-10-30.md](MAIL-CONNECTION-2026-10-30.md). Actual.lt remains draft; production deployment, credentials, DB and deployed-runtime delivery qualification are separate launch work.

2026-10-30 autoplay follow-up: both illustration carousels now start automatically without Play/Pause buttons under the actual reduced-motion preference. Full5/4-image loops at1440/390, manual automatic resume and keyboard pause/blur resume PASS.307 tests, types/lint, build/2RSC and12-route SEO PASS. See [AUTOPLAY-2026-10-30.md](AUTOPLAY-2026-10-30.md). No native content/media or mail change; no form submission or additional mail this task. This later explicit request supersedes only the older frozen carousel policy.

2026-10-30 final slide/contact clarification supersedes the prior interaction policy: original500ms leftward automatic slide with no controls; original in-field contact names and input/photo alignment. Actual187 motion samples at1280/390,5/4-image full loops and invisible resets, zero controls, exact original field heights/placeholders, photo dimensions within1px and conditional required-state checks PASS.307 tests, types/lint, build/2RSC and12-route SEO PASS. See [SLIDE-CONTACT-2026-10-30.md](SLIDE-CONTACT-2026-10-30.md). Associated labels, privacy/honeypot, white plate, private mail and actual.lt draft state are retained; zero form POST/additional mail or production/DNS/release.
