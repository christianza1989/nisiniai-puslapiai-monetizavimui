# Poraštės užbaigimas — 2026-10-10

Savininko pavedimas: sutvarkyti poraštę pagal core, su tikromis nuorodomis ir reikalinga informacija. Pasiteiravus apie trūkstamus rekvizitus savininkas atsakė „kol kas palik pinet“. Rodomi core patvirtinti MB Pinet ir paketo info@pinet.lt; įmonės kodas / adresas / PVM kodas neišgalvoti. Tai nėra pilno teisinio produkcinio paleidimo priėmimas.

## Įgyvendinimas

Vienas StepOver Footer komponentas visuose puslapiuose. Logotipas, operatorius ir el. paštas; atskiros sprendimų, praktinių gidų ir informacijos / kontaktų navigacijos; apačioje © metai / operatorius, privatumas, naudojimo sąlygos ir privaloma verslomatika.lt žyma. Metai imami serverio metu svetainės laiko juostoje. Telefonas rodomas tik jei jis yra patvirtintame pakete; dabartiniame pakete jo nėra. Nepridėta socialinių profilių, svetimų domenų tinklo, sertifikatų ar atstovavimo teisių pažadų.

Nuorodos atrenkamos tik iš core pateiktų `livePages`, tikslūs URL gaunami per `nichePagePath`; nerodomi suplanuoti / neegzistuojantys puslapiai. Pagrindinės skiltys ir visi svarbūs pagalbiniai puslapiai pasiekiami, produktų bei likusių gidų sąrašai pasiekiami per jų katalogus. Poraštė netampa visų 46 tekstų sąrašu.

Autorius atskirai perskaitė visus galutinius poraštės tekstus ir patikrino jų reikšmę pagal nuorodų tikslus. Trumpi lietuviški navigacijos pavadinimai, tiesioginis operatoriaus sakinys, be naujų faktinių pažadų. Patvirtintų puslapių body/title/SEO/URL/datos ir paketo bytes nekeisti; tai rendererio UI pakeitimas.

Šviesus paper fonas, viena skiriamoji linija ir esama Manrope tipografija. Poraštės tekstas 14px / 1,6; grupių antraštės 15px / 600 / 1,5, el. paštas naudoja 17px body vaidmenį (16px mobile). Pašalintos senos dviejų stulpelių navigacijos ir papildomo smulkaus attribution stiliaus taisyklės. Desktop keturi stulpeliai, iki 1000px du, iki 600px vienas; visi nuorodų taikiniai bent 44px aukščio. Pradžios puslapio vidinis plotis iki 1600px sutampa su header/hero, vidinių puslapių iki 1248px.

## Patikros ir diegimas

- Freshness continue / handoff abiem repo pagal canonical gate. Aktualūs main: private `7af6b9641012a30c5f95eac38a66daeff8f8cb39`, public `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`.
- Tikra vietinė naršyklė: homepage 1904/1280/768/320px, mobilios poraštės pradžia ir pabaiga, PDF gidas 1280/320px. 19 nuorodų, min taikinys 44px, horizontalios slinkties nėra. Tekstai neliečia gretimų stulpelių, operatorius ir legal/attribution matomi siaurame ekrane.
- TypeScript noEmit ir scoped ESLint PASS; 66 core testai PASS. Impeccable layout detector 0 findings, `npm run build` ir Wrangler dry-run PASS. Esami bendro build vinext / kitų nišų įspėjimai lieka baziniai.
- Tikras Worker `parasoplansetes-preview` deploy PASS: `282d45ab-e7e0-4c2a-b529-093e991f5c7c`. Hosted homepage 1904 ir 320px PASS; mobilus 0 overflow / 19 nuorodų.
- HTTP patikra visiems 24 dabar matomiems puslapiams: 200, po vieną naują poraštę, po 19 nuorodų, operatorius / el. paštas / grupės / privatumas / sąlygos / žyma yra. Visos 17 unikalių vidinių nuorodų (įskaitant homepage per logotipą) yra dabartiniai paskelbti 200 puslapiai. verslomatika.lt 200. Preview noindex išlaikytas.
- Įrodymai `output/parasoplansetes-footer-20261010/`: local/public PNG, local-checks / public-checks JSON, check-public.mjs, layout detector ir test/build/dry-run/deploy logs. Tai fokusuota poraštės patikra, ne naujas visos svetainės 200% browser zoom ar teisinės atitikties PASS; ankstesnė nepabaigta zoom patikra neišgalvota.

Patvirtinta immutable laida `cb6be84b-426e-45d2-a117-4bd6c1cf2880`, paketo SHA256 `9d94e82ae07be3a28406373e6b4f0c9808549e26a057e9b81aad7633f73e2cfa` nesikeičia. Prieš diegimą nuskaityti actual Worker nustatymai: tas pats dedicated D1, chat/voice/SMTP/email OFF, esami vars su `--keep-vars`, observability enabled / traces OFF išlaikyti. Jokių DNS, mokamų API ar runtime įjungimo pakeitimų. Ankstesnė atkuriama Worker versija `d6825aab-4426-4572-bd3c-3ec33c4ab6e0`.
