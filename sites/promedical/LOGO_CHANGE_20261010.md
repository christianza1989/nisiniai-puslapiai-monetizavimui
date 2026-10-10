# Promedical logotipo pakeitimas

Savininkas 2026-10-10 iš dešimties pateiktų logotipų pasirinko pirmąjį: žalią P su medicinos kryžiumi ir tamsiai žalią „Promedical“ užrašą. Naudojamas pasirinktas originalas, jo dizainas negeneruojamas iš naujo. Visos dešimt koncepcijų ir generavimo užduotys saugomos vietiniame `C:/Core/promedical-logo-concepts-20261010` pristatymo aplanke.

Pakeitimo ir patikros planas:

- [x] Importuoti pasirinktą originalą bendru vaizdų optimizavimo keliu, išlaikant proporcijas ir skaidrumą.
- [x] Antraštėje ir poraštėje pakeisti ankstesnį ženklą, išsaugoti nuorodą į pradžią ir tekstą „Įranga medicinos įstaigoms“.
- [x] Suderinti ženklo dydį su esama Figtree teksto sistema; pašalinti senam žodiniam ženklui skirtas nebetaikomas CSS taisykles.
- [x] Patikrinti tikrą 1440, 768, 390 ir 320 px vaizdą, logotipo įskaitomumą, poraštę ir mobilųjį meniu. Pagrindinis maketas, kontaktai, tekstai ir publikavimo paketas nekeičiami.
- [x] Patikrinti build, TypeScript, paveiktų failų lint, esamą katalogo bandymą bei saugų diegimo paketą.
- [x] Įkelti į tą patį Cloudflare Worker, išlaikant esamas D1, el. pašto ir domeno nuostatas, ir patikrinti gyvą svetainę.

Kodui naudojama atskira viešo repo darbo kopija `C:/Core/promedical-public-logo-20261010`, šaka `codex/promedical-logo-20261010`, nuo dabartinės produkcijos šaltinio `523dcc607cf417f2c47ac2309380d72844bfddd5`. Ankstesnėje viešo repo kopijoje esančios svetimos neįrašytos turinio pataisos išsaugomos ir neįtraukiamos į šį pakeitimą. Core bazė atnaujinta iki main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`; visų kitų darbų istoriniai rezultatai neperrašomi.

Galutinis rezultatas: viešo repo draft PR [#28](https://github.com/christianza1989/niche-public-core/pull/28), source `c43b506b0b3885069ff567405db09338efc6709c`, active version `8d23fcb5-7ae5-473a-bd4e-4bda16736dd3`, deployment `8d9c8bbf-01db-4b43-8947-d3878a62628b`, 100 %. Piktograma atnaujinta į pasirinkto ženklo P ir kryžiaus formą. Įrodymai: [logo-change-v1.json](verification-20261010/logo-change-v1.json), įskaitant tikrus optimizuotų failų SHA ir produkcijos HTTP.
