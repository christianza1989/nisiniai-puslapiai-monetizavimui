# Demo duomenų sutartis

2026-10-05. Pilnos būsimos platformos privatūs fiktyvūs duomenys. [Galutinis planas](FINAL_PROTOTYPE_PLAN.md). Vienas serverio konfigūruojamas režimas ir adapterio riba; ne skirtingas dummy array kiekviename komponente.

## Įjungimas ir išjungimas

Foundation: `prototype/config.mjs`, `prototype/demo-model.mjs`, `prototype/demo-adapter.mjs`. `demo.enabled` default false. Privatus peržiūros serveris specialiai tiekia demo būseną; client query/hash negali pakeisti production režimo. Serverio `deployment='production'` + demo=true visada klaida. Browser UI „Demo įjungta/išjungta“ yra local peržiūros valdiklis, ne production funkcija.

Režimai: demo su mock adapteriu, off su empty adapteriu, real tik su explicit atskirai įgyvendintu transportu. Real adapteris dar nesukurtas. Nei HTTP klaida, nei nepasiekiamas backend negali įjungti demo fallback. Off išvalo ekrano pasirinkimus; jokie seni mock rezultatai neturi būti liekami užrašai. Prod failų/build vartas privalo pašalinti seed modulį ir private assets. Vien importo riba nėra toks production build testas.

## Seed ir duomenų autoritetas

`generateDemo(clock)` kuria 30 organizations / 42 practitioners / 126 services / 120 clients / 480 bookings / 96 reviews / 24 waitlist / 30 inquiries. Organizations: 24 solo + 6 salonai po tris specialistus. 3 miestai: Vilnius, Kaunas, Klaipėda — geografinės etiketės, ne esama pasiūla. 10 taxonomy families; konkreti teikėjo procedūra atskiras service ID.

Visi IDs `demo-*`, visi kontaktai `example.com`, nėra realių žmonių telefonų, tikslių namų koordinačių ar konkurento klientų importo. Duomenys turi `isDemo=true`. Prices minor EUR, duration/buffers minutėmis. Visi vardai ir kainos yra scenarijaus kūryba, ne rinkos tyrimo įrodymai. UI rodo vieną nuolatinę demo aplinkos juostą, ne ImageGen badge prie kiekvienos foto.

Resource, Schedule, BusyBlock, Hold ir Outbox modeliai pilnos realizacijos papildymas; foundation neskaito fiktyvios rezervacijos kaip autoritetingo serverio sloto. Organization ≠ authUser ≠ Practitioner ≠ Location. Staff membership ir service competence siejamos IDs. Viešai informacinės openingHours atskirai nuo scheduled shifts, resource hours ir closed periods.

## Vienas laikrodis

Boot metu vienas ISO now perduodamas visiems UI paviršiams. Fixed clock tik viename config/test argumente. Šiandien/rytoj, savaitės pradžia, vizitų santykinės dienos ir slotų galiojimas remiasi juo. Įrašai saugo UTC ISO + Europe/Vilnius, ne vien lokalų tekstą. DST local mapping tikrinamas; neegzistuojantis ar dviprasmis laikas turi explicit klaidą/offset, ne tylų JS Date spėjimą. Foundation seed naudoja vienareikšmius dienos laikus.

SSR ir hydration dalijasi tuo pačiu snapshot now ir seedVersion; component mount negeneruoja kito rinkinio. Clock pakeitimas resetina dependent pasirinkimus ir hold. Intervalo reikšmė: kliento vizito pradžia/pabaiga telpa; resursų buferiai atskirai tikrinami grafike. Griežtesnis „įtraukti buferius į intervalą“ turi explicit sutartį ir paaiškinimą, ne tylų rezultato pakeitimą.

## Scenarijai ir būsimas išsaugojimas

Vienas `happy`, `empty`, `no-calendar`, `stale`, `no-slots`, `conflict`, `expired-hold`, `delivery-error`, `pending-profile`, `permission-denied` registras. Foundation įgyvendina katalogo happy/empty/no-calendar/stale filtravimą; booking/permission/delivery scenarijai laukia savo ekranų. UI negali žymėti jų patikrintais vien iš registro egzistavimo.

Pilname prototipe private memory/IndexedDB `madbeauty-demo:<seedVersion>` tik fiktyvioms redagavimo sesijoms, reset button. Seed klientų kontaktai nenaudojami Hostinger. Production auth/session/PII serverinė saugykla atskira; nėra migracijos demo → real clients. Demo reviews/photos ir approved status niekada nėra realus operatoriaus patvirtinimas.

## Adapterio sutartis

UI vartoja `catalog`, `profile`, `appointments` ir vėliau `availability`, `inquiry`, `hold`, `confirm`, `change`, `cancel`, `revisions`, `moderation`, `messages`. Public katalogas negrąžina clients/booking contacts. Private operacijai explicit org/user scope; local rolės pasirinkimas tik UX testas, ne authorization. Real backend viską perskaičiuoja, deduplikuoja ir taiko izoliaciją.

## SEO ir matavimas

Demo serveris bind tik 127.0.0.1 ir `X-Robots-Tag: noindex, nofollow, noarchive`; HTML noindex. Demo URL nėra realus katalogo canonical, nėra sitemap, Article/review/local-business JSON-LD ar realios analitikos. Robots disallow nėra privatumo/auth pakaitalas. Private originaIai ir clients nėra servuojami. Tikras public core turės savo auth/build/runtime/demo-exclusion priėmimą prieš launch.

Priėmimo įrodymai laikomi `prototype/QA.md` ir `research/madbeauty-fresha-2026-10-05/VERIFY.json`; nei vienas foundation testas nėra visos platformos ar public core priėmimas.
