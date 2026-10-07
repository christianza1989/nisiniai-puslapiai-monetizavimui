# Namudarbas.lt: bendro turinio core ir GitHub perdavimas

2026-10-07. Savininkas pavedė įkelti dabartinį namudarbas.lt projektą ir jo
prijungimą bendram darbui kitu kompiuteriu. Ankstesnis aiškus pavedimas palikti
mokytojo Next.js/Vercel projektą atskirą galioja: bendras core valdo turinio
planavimą, rengimą, mediją, redakcinę peržiūrą ir release; šeimų, mokinių,
autentifikacijos bei mokytojo runtime čia neperkeliami.

## Viena tapatybė ir atsakomybės

| Dalis | Šaltinis |
|---|---|
| Stabilus turinio ID | `mokytoja-ai` (ne `namudarbas` ir ne naujas ID pagal host) |
| Dabartinis canonical host | `namudarbas.lt` |
| Viešas produkto brand | Superiora |
| Bendras core, studija ir skills | [nisiniai-puslapiai-monetizavimui](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui) |
| Companion turinio schema/projekcija/medijos SDK | [niche-public-core](https://github.com/christianza1989/niche-public-core), vietinis katalogas `dovanos-memorycasting` |
| Mokytojo svetainės kodas ir Vercel adapteris | [mokytoja-ai](https://github.com/christianza1989/mokytoja-ai), vietinis katalogas `AI_teacher` |
| Tolesnė mokytojo apimtis | AI_teacher `AGENTS.md` ir `docs/PRODUCTION_ROADMAP_2026-09-28.md` |
| Vieši faktai naujai studijos registracijai | [registration.json](../sites/namudarbas/registration.json) |

Root nepradeda antro mokytojo projekto `sites/` kataloge. Ten laikomas tik
prijungimo indeksas ir viešas registracijos briefas; aplikacijos kodas turi
vieną savininką ir vieną source repo. Nekurti mokytojo įrašo bendro nišų
rendererio registre vien tam, kad būtų rašomi straipsniai.

## GitHub būsena ir perdavimo vartas

Bendro turinio adapterio [PR9](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/9)
ir aiškios domeno migracijos [PR16](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/16)
jau sujungti į core `main`. 2026-10-07 root prieš šį perdavimą patikrino
GitHub API: mokytojo repo `main` dar buvo senas `0926003`; dabartinė svetainė
Vercel jau veikė iš vėlesnio vietinio source. Šis istorinis skirtumas nėra
naujo source įkėlimo įrodymas.

Dabartinio AI_teacher source įkėlimą originali mokytojo sesija užbaigė:
[Draft source PR1](https://github.com/christianza1989/mokytoja-ai/pull/1),
šaka `codex/namudarbas-source-handoff-20261007`, final GitHub head
`6b93977f906ca27c91dcf7c004ccbe25632471a1`. Root patikrino tikrą remote tree,
turinio paketo baitus ir priklausomybių/diegimo šakos ribas. Source jau GitHub,
jo `main` nesujungtas; Vercel diegimas ir visos platformos priėmimas atskiri.

Originali sesija patikrino faktinį Vercel Git susiejimą: production šaka yra
`main`. Source perdavimo šaka `codex/namudarbas-source-handoff-20261007`
ruošiama su tik jai taikomu `git.deploymentEnabled=false`, kad jos push/PR
nepaleistų preview deployment. Šio source į `main` automatiškai nesujungti:
produkcinis diegimas ir jo QA yra kitas veiksmas. Vercel paskyros nustatymai,
production branch, aplinkos raktai ir DNS šiame perdavime nekeičiami.

## Atkurti kitu kompiuteriu

Klonuoti tris repo greta. Mokytojo final source šaką arba commit rinktis
pagal final kvitą žemiau, kol jis nesujungtas į jo `main`.

```powershell
git clone https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui.git nisiniai_puslapiai_monetizavimui
git clone https://github.com/christianza1989/niche-public-core.git dovanos-memorycasting
git clone --branch codex/namudarbas-source-handoff-20261007 https://github.com/christianza1989/mokytoja-ai.git AI_teacher
cd nisiniai_puslapiai_monetizavimui
. ./scripts/activate-workspace.ps1
npm ci --prefix content-studio
```

Companion diegti pagal [MULTI_MACHINE](MULTI_MACHINE.md). AI_teacher
priklausomybes ir vietinę konfigūraciją ruošti pagal jo GitHub perduotos
versijos `README.md` / [docs/SOURCE_HANDOFF_2026-10-07.md](https://github.com/christianza1989/mokytoja-ai/blob/codex/namudarbas-source-handoff-20261007/docs/SOURCE_HANDOFF_2026-10-07.md).
Mokytojo perduodamai versijai rekomenduojamas Node 24 pagal jo užfiksuotų
kūrimo įrankių reikalavimus; ankstesnė minimali Node 20.9 eilutė nėra
dabartinio dependency-complete atkūrimo priėmimas.
Naudoti naujus vietinius raktus ir izoliuotą testinę saugyklą. Senos DB,
paskyros, slapukai, `.env`, provider raktai, mokinių darbai ir privataus QA
duomenys neperkeliami klonuojant repo.

Nauja studija neturi ankstesnio kompiuterio `content-studio/data/`.
`registration.json` skirtas viešam briefui, o ne patvirtintų revizijų,
privačių peržiūrų ar viso GUI kalendoriaus atkūrimui. Naują įrašą kurti
oficialiu modelio `createSite` / `editSite` API su `siteId=mokytoja-ai`, tik
patikrinus, kad nei ID, nei host dar nenaudojamas. Esamo įrašo neperrašyti;
host neatitikimą spręsti aiškia `migrateSiteDomain` eiga. Pagal registraciją
taikyti `contentPolicy`: 6 mėnesiai, 2 straipsniai per savaitę, 10:00,
Europe/Vilnius. Tai politikos tikslas, ne jau parengtas pusmečio turinys.

Prieš naujo pilno paketo rengimą reikia išlaikyti aktyvių keturių puslapių
ID, originalias datas ir medijos šeimas. Git saugomas public bundle yra
target viešo snapshot šaltinis; jo negalima paskelbti nauja atlikta studijos
review ar tyliai pakeisti keturių senų URL/ID. Privataus studijos darbo
tęstinumą perkelti atskiru aiškiu redakciniu importu. Tokio restore CLI šis
perdavimas nekuria ir neveikiančio atkūrimo nežada. Kol jo nėra, naują
release rengia dabartinė autoritetinga studija, o kitas kompiuteris gali
vykdyti mokytojo aplikacijos darbus ir patikrinto bundle importą.

## Faktinis turinio kelias

1. Studijos sezoninis planas ir juodraščiai pagal bendrą
   [niche-content-planner](../SKILLS/niche-content-planner/SKILL.md).
2. Faktinė teksto, šaltinių, nuorodų ir vaizdų peržiūra; bendras
   [MEDIA_CORE](../MEDIA_CORE.md) responsive importas.
3. Peržiūrėta atominė partija ir immutable release pagal
   [CONTENT_CORE](../CONTENT_CORE.md). Privačios review pastabos lieka studijoje.
4. `node content-studio/scripts/export-external-content.mjs <release-directory> <NEW-bundle-directory> mokytoja-ai namudarbas.lt`.
5. AI_teacher trusted/pinned SDK importeris tikrina pilną bundle ir priima
   snapshot atominiu būdu. Tikslias importo/verify komandas skaityti jo
   `docs/PUBLIC_CONTENT_ADAPTER.md`; naujas bundle nėra jau atliktas deploy.
6. Target QA ir atskiras Vercel įdiegimas. Jau įdiegti approved puslapiai
   tampa vieši po `publishAt` užklausos metu be cron; tuo pačiu filtru
   naudojasi gidų indeksas, nuorodos, sitemap, schema, LLM ir vaizdai.

Periodinio hosted generatoriaus / automatinio naujų release importo ir
deploy šis kelias dar neįjungia. Built-in ImageGen naudojamas aktyvaus Codex
agento; text CLI savaime negeneruoja iliustracijų. V1 adapteris aiškiai
atmeta V2 iki atskiro rich rendererio priėmimo. Dabartinės 100 puslapių /
200 medijos failų ribos su penkiais variantais leidžia iki 40 tokių vaizdų
šeimų; vieno 52 gidų pusmečio snapshot palaikymas dar nepriimtas.

## Patikrintas dabartinis viešas snapshot

Aktyvus bundle ID: `e5f24da0037cd130c458a250212d538ae0da3306a025a65896356cd10a931315`.
Paketo SHA-256: `3123ddf8d24b2e9354606e092eebc36a31361e1d99d86da2c9278d98259f77c9`.
Keturi puslapiai: konteksto home anchor ir trys gidai; 15 responsive WebP.
Originalus gidų `publishAt=2026-10-06T18:30:00Z` išlaikytas.

Root 2026-10-07 dar kartą patikrino aktyvaus target JSON siteId/host ir
tikrą [gidų indeksą](https://namudarbas.lt/mokymosi-gidai): HTTP 200, visi
trys gidų URL pateikti. Ankstesnis nepriklausomas migracijos priėmimas ir jo
ribos: [DOMAIN-MIGRATION](../research/ai-teacher-content-integration-2026-10-06/DOMAIN-MIGRATION.md).
Tai nėra Google indeksavimo, reitingų, vaikų piloto, visų platformos vartų
ar periodinio generatoriaus priėmimas. Originalios istorijos nekeisti.

## Final GitHub kvitas

- Source kodas ir assets: `402b9b493ef751e421edd096011b709537cef0ad`.
- Final dokumentų kvitas ir remote PR head: `6b93977f906ca27c91dcf7c004ccbe25632471a1`;
  paskutinis commit keitė tik `docs/PRODUCTION_ROADMAP_2026-09-28.md` ir
  `docs/SOURCE_HANDOFF_2026-10-07.md`. Runtime kodo QA kontekstas nepasikeitė.
- Source repo privatus; [PR1](https://github.com/christianza1989/mokytoja-ai/pull/1)
  DRAFT, į `main` nesujungtas. Main išlieka `0926003`; pagal source actual
  prieš/po patikrą Vercel production deployment išlieka
  `dpl_5z5pQis285h49SXjM5aEQrGbCpVN`.
- Source sesijos švarios Windows kopijos kvitas: Node 22.18 / npm 10.9.3,
  fresh `npm ci` 522 paketai; 190 Vitest failų / 1424 testai PASS,
  mokytojos offline 22/22, 16 sintetinių calibration tasksets, architecture
  PASS, audit 0 spragų, production build PASS. ESLint 0 klaidų, 2 esami
  navigacijos įspėjimai. Nauji provider API bandymai nevykdyti.
- Source fresh production HTTP 11/11 PASS ir 15 WebP exact bytes; ši
  komanda netikrina visų redakcinių/šeimos role authorization variantų,
  jie turi atskirus unit testus. Linux/macOS atkūrimas netikrintas.
- Source atranka: 878 failai, apie 102 MB; signature/žinomų vietinių
  privačių reikšmių/indekso baitų patikra PASS. Frozen source digest
  `806308cd1a0ea9b68d566f9798beef77832ae3116ddfe435bb031debcda1af0d`
  neapima README/AGENTS/docs. Raw QA ir originalų repo nėra.
- Root nepriklausoma GitHub patikra: recursive tree pilnas, 878 blob;
  privalomi adapteriai, import script, 2 tarball ir roadmap yra; uždraustų
  env/runtime/DB/original/tmp kelių 0, content 24 failai. Remote active
  bundle ID, siteId, canonical ir viso paketo SHA-256 exact, keturi puslapiai.
  Remote SDK/glob pins ir tik perdavimo šakai taikomas Vercel disable
  patikrinti; GitHub workflows run 0. Pilno source QA root nekartojo.
- Bendro repo registracijos briefas sulygintas su autoritetingu studijos
  siteId/host/policy ir keturių aktyvių puslapių ID/slug/type: PASS.
  Relative doc links, scoped whitespace ir exact-staged safety PASS.

GitHub perdavimo pavedimas atliktas pagal šią ribotą source apimtį. Tai
neaktyvina periodinio rengimo/deploy job, tikrų vaikų piloto, mokamų API ar
nepriimtų produkto funkcijų. Tolimesnis AI klonuoja nurodytą source šaką,
perskaito jos aktualų roadmap ir tęsia savo rezervuotoje srityje.
