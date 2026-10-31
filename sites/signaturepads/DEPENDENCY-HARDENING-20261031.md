# Signaturepads — galutinis techninio pasiruošimo ir saugumo patikrinimas

2026-10-31. Ši ataskaita pratęsia [pirminį prelaunch etapą](PRELAUNCH-20261031.md).
Nėra leidimo keisti signaturepads.lt domeną ar originalų WordPress. Privatumo
prozos ir fizinių įrenginių ribojimai išlieka; nauja versija
dar nevadinama domain-ready. WordPress backup aiškiai praleistas savininko nurodymu.

## Dabartinė peržiūra ir kilmė

https://signaturepads-preview.pinet-azprekyba.workers.dev/

- Worker signaturepads-preview, versija **2a867b0c-8d9e-4503-98f9-252a0f1b3d01**; noindex, nėra .lt routes.
- Public source **a9b8a6276110d5dfbf23d8c2d7675d799a4d5974**, build checkout **80fa086c3efb6921df8f75609ce4ea912798663d**; tikslus abiejų Git tree
  **6956a2f7ee66024f5afa53ace7655fc700311a29**. Izoliuotas build D:\Core\output\signaturepads-migration-20261029\prelaunch-20261031/security-engine.
- Native94de2ef54c802d69399727aa243918f9e828a44b51013c3a05cf4d01dbc3dd25
  neperrašytas: tie patys tekstai,19produktų,26aktyvūs URL,204WebP ir237alias.
- Pirminė d6ac644e versija / f2344dfc patikros paliktos atskirai; old engine
  išsaugotas. Cf6d37d4 tarpinis build sustabdytas iki upload, kai full audit
  atskleidė RSC runtime, nepatenkantį į omit-dev skaičių. Jis nepaskelbtas.
- Primary source checkout node_modules sąmoningai neliečiami, nes juos naudoja
  ankstesnė vietinė8956peržiūra. Tikros naujų priklausomybių patikros vykdytos
  security-engine su jo atskiru npm run install:ci. Naujas clone / source darbas
  turi diegti naują lock, nenaudoti senų node_modules. Local8956tebeveikia.

## Ką parodė saugumo auditas ir kas pakeista

Pirminis production-lock auditas rado6paketų vardus:1critical,3high,2moderate.
Atnaujinti Next16.4.3,Zod4.6.7,sharp0.35.5,source-map-js,fast-uri ir baseline
mapping; Next ESLint config suderintas su Next versija. Naujas tikro ingest
schema/Zod testas parodė senos bibliotekos klaidą:51elemento kolekcija buvo
traversinama prieš atmetant max50. Patched biblioteka ją atmeta nepaliesdama
elementų; normalus review-only ingest, default ir draudimas publikuoti išliko.

Vien omit-dev0nepakanka. Full audit po pirmos pataisos dar turėjo36paketų
įrašus /9high, įskaitant Worker naudojamą react-server-dom-webpack, nors jis
deklaruotas devDependencies. Pagal [React saugumo pranešimą](https://github.com/advisories/GHSA-wx67-qw84-cm4g)
React/ReactDOM/RSC atnaujinti19.2.8. Naudojamas Vinext1.0.0 su RSC plugin0.5.34,
Vite8.3.5,Cloudflare Vite plugin1.66.0,Wrangler4.156.0 ir jo workers-types5.
Satori fflate tikslus senas pin pakeistas suderinamu0.7.5backport. Nenaudotas
force/legacy-peer ir nesutikta su audit siūlytais senais ESLint4/Drizzle0.18
downgrade. Peer konfliktas išspręstas suderinus Workers types, ne apeinant tikrinimą.

Rezultatas actual įdiegtame medyje:

- Production audit **0** žinomų įspėjimų.
- Full audit **0critical,0high,20moderate**. Tai20priklausomybės grandinės įrašų
  iš2advisory šeimų, ne20atskirų runtime exploitų. Lieka minimatch glob
  amplification ESLint/typescript-eslint grandinėje ir senas esbuild Drizzle CLI
  loader grandinėje. App/lib/components nėra šių įrankių importų; ši svetainė
  nepaleidžia to esbuild serve API ir nepriima viešų lint glob išraiškų.
  Vertinimas dokumentuotas dependency-exposure.json. Tai ribotas operating-mode
  įvertinimas, ne absoliutus viso bundle/future tool naudojimo saugumo įrodymas.
- RSC/OG/fflate ir įdiegtų Cloudflare/Vite įrankių ankstesni high įspėjimai
  iš full audit dingo. Dev etiketė savaime nenaudota kaip išimtis.

Pradiniai [Next](https://github.com/advisories/GHSA-2464-fhr4-w9xw),
[sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) ir
[Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) pranešimai bei npm audit
raw JSON saugomi artefaktų kataloge. Nėra pažado, kad ateityje naujų CVE neatsiras.

## Realios naujos versijos patikros

-328/328Core testai, TypeScript PASS; lint0error /2ankstesni stylesheet warnings.
- Pilnas build, abu RSC manifestai /0trūkstamų resursų; binding types ir dry-run.
  Build turi neblokuojančius plugin sourcemap / webpack-option / future Vite
  native-config įspėjimus; jie neprilyginami UI ar runtime klaidai.
- Actual26URL,204WebP SHA,237media alias,50legacyquery ir25slash PASS;
  dabartinio WP sitemap29įrašų išlaikymo/410 sprendimai patikrinti.
- SEO smoke visiems26URL ir actual CSS/JS, robots/sitemap/llms/JSON-LD,
 404/410,hostisolation. Actual head originalus GSC tag1 / teisingas hero
  preloadhigh /6softwarekorteliųH2. GSC API duomenų prieiga tebėra neprieinama.
- Chrome/WebKit320/390/768/1024/1440px:10scenarijų PASS; overflow0,pageerror0,
  native consent/phone ir quick-view tikrinti nesukeliant POST. Tikros foto ir
  fixed/scroll elgesys išsaugoti; žiūrėti runtime scrolled viewport nuotraukas.
- Native200% papildomai PASS per oficialią Chrome tabs.setZoom/getZoom API
  atskirame Chrome for Testing151 profilyje, viewport:null. Tas pats1440px
  langas:innerWidth1424→712,DPR1→2,browserReportedZoom2,CSSzoom1.
  Homepage/software/policy H1 ir footer geometrija / reflow bei tikri kadrai
  peržiūrėti. Capture daromas native captureVisibleTab po compositor frames:
  Playwright screenshot kirpo mastelio vaizdą, o iškart po scroll capture API
  grąžino ankstesnį kadrą. Pirmi bandymai palikti atskirai. Galutiniai
  native200-full-*.png1424×905 ir native-zoom-api.json patikrinti. Tai automatinis
  native naršyklės zoom, ne rankinis OS valdymas ar fizinio įrenginio testas.
- Tikri link journeys390/1440px: meniu→#kontaktai,footer→katalogas,
  produkto pavadinimas→produkto URL ir galleryEnter/Escape PASS;0POST.
- Invalid-onlyorigin/consent/honeypot/other POST ir429 patikros. Nevykdomas joks
  naujas realaus laiško testas. Ankstesnė konkretaus104777af testinio laiško
  gavimo savininko žinutė lieka transporto kvalifikacija; raw receiver headers /
  aplankas neinspektuoti, API ReplyTo apribojimas išlieka.
- Privatesecret reikšmės nėra source/bundle. Production EU D1 tebėra tuščia;
  preview turi tik ankstesnį pažymėtą testą. Domeno ir originalo nekeista.

## Dabartinis Lighthouse13.6.0 matavimas

| Puslapis | Režimas | Greitis/100 | A11y/100 | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|
| / | mobile | 90 | 100 | 3.45s | 0.0000 | 12ms |
| / | desktop | 100 | 100 | 0.64s | 0.0001 | 0ms |
| /iranga/programine-iranga/ | mobile | 98 | 100 | 2.33s | 0.0262 | 5ms |
| /iranga/programine-iranga/ | desktop | 100 | 100 | 0.60s | 0.0001 | 0ms |
| /musu-slapuku-politika/ | mobile | 100 | 100 | 0.83s | 0.0023 | 0ms |
| /musu-slapuku-politika/ | desktop | 100 | 100 | 0.24s | 0.0009 | 0ms |

Matavimas Windows Chrome / Lighthouse mobile throttling, realus įkeltas build,
be tuo metu paleistų savų kitų sunkių browser/build darbų. PreviewSEO noindex
nekeistas dėl balo. Tai ne fizinis telefonas, ne macOS Safari, ne field CWV ir ne
WCAG sertifikacija. Ankstesnis pirmojo paruošimo mobile90 / desktop100 matavimas
neperrašytas ir nesumaišytas su šios versijos rezultatu.

## Kas lieka už atlikto techninio paruošimo ribos

1. Patvirtinti [valdytojo ir saugojimo faktus](PRIVACY-FACTS-20261031.md).
   Senos prekybos/slapukų pastraipos dar neatnaujintos. START2.4 viešo teksto
   writer/review/owner approval rolės neapeitos. Nežinomi rekvizitai neišgalvoti.
2. Ankstesnį OS200% bandymą blokavo Windows capture/input prieiga; vėliau
   native Chrome API testas sėkmingai atliktas. Fiziniai įrenginiai, tikras
   Safari ir pilnas rankinis prieinamumo auditas dar nepatikrinti; nepareikšta
   WCAG sertifikacija. Šios ribos matomos85kriterijų audite.
3. Atskirai autorizuotas domeno paleidimas: naujos tikslios privatumo revizijos
   production13admission, .lt DNS/TLS/routes, secret su pirmu deploy, aktualus
   formos gavimo patvirtinimas bei GSC/indexavimo ir field stebėjimas.
   [Paruošta eiga](PRODUCTION-PREPARATION.md) nėra įvykdytas perjungimas.

WordPress backup nedarytas pagal savininko išimtį. DNS14įrašų importas neįvykdytas,
production Worker nepaleistas. Originalo HTML/NS/A/AAAA/MX ir vietinė8956
patikrinti atskirai. Nėra main merge / visų PC adoption teiginio.
