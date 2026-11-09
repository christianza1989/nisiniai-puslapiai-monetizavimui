# 20 „Memory Casting“ kolekcijų leidinys – 2026-11-09

## Apimtis ir šaltiniai

- Savininko pateiktas raktažodžių eksportas išnagrinėtas; jo neapdoroti duomenys į viešą saugyklą neįkelti. Atranka ir metodikos ribos – `KEYWORD_COLLECTION_PLAN_2026_11_09.md`.
- 20 kolekcijų, iš jų 18 naujų ir dvi išplėstos (`/dovanos/moterims`, `/dovanos/kaledoms`). Kiekvienos peržiūrėtas turinys viršija 1 000 žodžių. Aiškiai pateikiami du tikri rankų liejimo rinkiniai, o gidas ir proga neklaidina apie platesnį katalogą.
- 20 redakcinių revizijų ir 805 bazinių medijos failų kontrolinių sumų įrodymai – `KEYWORD_COLLECTION_RELEASE_MANIFEST_2026_11_09.json`. Viešo paketo SHA-256 `138cf5cda5234ff8cfd11a445a700da5a2d69c02390d34b3730bf1985e570bd8`; 207 puslapiai. Būsenos laukas šiame istoriniame manifeste reiškia eksporto, o ne diegimo būseną.
- 187 nepakeisti baziniai puslapiai išsaugoti baitus atitinkančiu turiniu; visų 189 ankstesnių puslapių `publishAt` nepakito. Kontekstinės nuorodos iš kolekcijų į gidus; kolekcijų navigacija esamuose giduose ir dovanų indekse naudoja realią viešų puslapių projekciją, neperrašydama senų straipsnių revizijų.

## Atlikta patikra

- 20 kolekcijų tekstų ir temų naudą redakciškai peržiūrėjo užduotį atlikęs agentas, taip pat patikrino rinkinių sudėtį, instrukcijas, pristatymo sąlygas bei kainas gyvame kataloge. 2026-11-09 poros rinkinio kaina 32 €, šeimos 48 €, abiejuose balti dažai. Kainos gali kisti; prekių kortelės ima aktualius katalogo duomenis.
- Privačioje peržiūroje atidarytos visos 20 kolekcijų, patikrintos antraštės ir abiejų prekių kortelės; pasirinktinai apžiūrėti desktop ir 390 px telefono vaizdai. Kainos privačioje peržiūroje buvo atjungtos; jos atskirai patikrintos gyvoje svetainėje. Esamo gido ir indekso kolekcijų navigacija patikrinta be straipsnio turinio keitimo.
- PUBLIC `npm run test:core`: 304/304 PASS po to, kai į retą darbo kopiją iš Git atkurta trūkusi nesusijusi staging įvestis. Studio ribos ir workflow testai: 5/5 ir 7/7 PASS. Tikslinė TypeScript patikra PASS, neskaitant laikinos Next.js peržiūros senų `.next/dev` generuotų tipų; pirmoji įprasta patikra buvo užblokuota būtent tų ir trūkstamo sparse aplinkos failo.
- Produkcinis build ir RSC asset patikra PASS; `wrangler deploy --dry-run --keep-vars` PASS. Vietinis Wrangler preview du kartus nutrūko su `ECONNRESET`, todėl neatspindi PASS. Atskirai paleistas laikinas Cloudflare testinis Worker be prekybos jungčių ir su `noindex`; visos 20 kolekcijų HTTP 200, canonical ir `CollectionPage` bei abi prekių nuorodos patikrintos, sitemap parodė visus 20 URL. Trys suplanuoti ateities gidai liko HTTP 404. Laikinas Worker po patikros pašalintas.

## Gamybinis priėmimas

- PUBLIC šaka `codex/memocasting-keyword-collections-public-20261109`, source commit `7df7631b93cc2fc5cfd9a14312bdc1d3df1ce9f9`; CORE šaka `codex/memocasting-keyword-collections-20261109`, parengimo commit `a26e5ce9d61e29e9d1cd5f2b3ea7b503838a038f`. Abi šakos nusiųstos į GitHub; tai nėra merge į `main`.
- Nuo Worker `32fe21af-bfc9-44d9-ba11-064bb7875953` paskelbta versija `36b702af-e2dd-4c46-a83e-b61cc197e6ca`; 2026-11-09 Cloudflare rodė 100 % naujos versijos. D1, ASSETS, `MEMO_COMMERCE`, `MEMO_INSTAGRAM` ir abi GA4 vars išsaugotos. Senas Worker lieka kodo rollback atskaita; jis neatšaukia duomenų bazės veiksmų.
- Po diegimo tikru HTTPS domenu 20/20 kolekcijų grąžino HTTP 200, po vieną H1, savo canonical, `CollectionPage` ir nuorodas į abu rinkinius. `sitemap.xml` HTTP 200 ir turi 20/20 URL. Tikros nuorodos patikrintos mamai, kalėdinių dovanų vyrams ir gimtadienio giduose; `/cart` HTTP 200. Būsimieji močiutės, senelio ir Mamos dienos gidai liko 404 iki savo laiko.
- Gyvos kalėdinių dovanų mamai kolekcijos mobilią išvaizdą bei po kliento užkrovimo matomas 32 € ir 48 € kainas patikrinau naršyklėje. Tai nėra tikro mokėjimo arba visų pirkimo scenarijų sandorio įrodymas; šio leidimo metu naujas mokėjimas nebuvo atliktas.

Paieškos indeksavimą ir reitingavimą sprendžia „Google“; 1 000 žodžių savaime neužtikrina pozicijos. Panašias gavėjų / progų temas su tuo pačiu siauru prekių katalogu būtina vėliau stebėti dėl dubliavimo ir tikros paieškos paklausos.
