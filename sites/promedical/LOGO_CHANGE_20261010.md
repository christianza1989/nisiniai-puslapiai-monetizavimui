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

## 6-ojo varianto įkėlimas

Savininkas pasirinko galutinį 6-ąjį variantą: raudona medicininė P yra pirmoji žodžio „Promedical“ raidė, likusios raidės mažosios. Jo nurodymu panaikinamas tekstas „Įranga medicinos įstaigoms“ po logotipu. Autoritetingas originalas: `C:/Core/promedical-logo-lowercase-20261010/promedical-06.png`, SHA256 `6fc67d369d5264c6e5d383b22ce8d4afb2c82c96c22c32438ac7d630ff619317`. Kūrybinis vaizdas nekeičiamas.

- [x] Importuoti originalą bendru responsive WebP keliu; pridėti atskirus v2 failus.
- [x] Bendrame Brand pakeisti logotipą antraštei ir poraštei, panaikinti small ir jo CSS; Promedical favicon P nuspalvinti raudonai.
- [x] Išlaikyti esamus 244/205 px pločius, nuorodą į pradžią ir alt. Patikrinti skaidrumą, apkarpymą, antraštės/paieškos lygiavimą bei poraštę 1440/768/390/320 px ir mobilųjį meniu.
- [x] Patikrinti build, TypeScript, tikslinį lint, vieną mechaninį detector ir saugų diegimo paketą. Turinio paketas ir visi kiti tipografikos vaidmenys nekeičiami.
- [x] Diegti į esamą Worker, patikrinti gyvą desktop/mobile, tikrus asset SHA ir pašalinto prierašo nebuvimą; įrašyti naują v2 kvitą, išsaugant v1 istoriją.

Revizija įkelta ir patikrinta: source `83817beaea4b4d5e18993cac28da7abdf7d27264`, active version `6596546c-7f5d-49b1-b68e-92b4f7666cd3`, deployment `0081fe34-8d16-4e82-9031-3537b74edb53`, 100 %. Įrodymai: [logo-change-v2.json](verification-20261010/logo-change-v2.json). Tikras live desktop 1280 px ir mobile 390 px; vietinis 1440/768/390/320 px, mobilusis meniu ir poraštė. CLI versions upload/deploy abu exit0; esami domeno routes neliečiami.
