# Vietinis prekybos kliento prijungimas

Aktualus 2026-10-12 tęsinys: 0.11 exact SDK `703d9dcd19083cfe6cb73e4f2add935f09986f21`; PUBLIC `220233ea5f45c23109758c977c2dd7e69b183876`. Kiekių išsaugojimas, pašalinimas, sėkmingo create krepšelio išvalymas, naujas pasirinkimas prie seno užsakymo, tikras katalogo/markets envelope ir native retry patikrinti pagal [SHOP_ACCEPTANCE.md](SHOP_ACCEPTANCE.md). 80 PUBLIC testų, TypeScript ir build PASS. Žemiau palikta 0.8 etapų istorija; jos SDK, paketas, puslapių ir testų skaičiai nėra dabartinis inventorius.

2026-10-12: svetainės sesija savo checkout įprastu merge prijungė shopo 0.8 source `06f428860745059a5a0d848dca3691b8cbb80a95`. Bendro prekybos modulio failai neperrašomi. Pirkimo klientas naudojamas tiesiogiai; bendras source valdo sumas, užsakymo raktą, prieigos žetoną, atkūrimą, dokumentus ir atsisakymo registravimą.

Paveikti teksto vaidmenys: krepšelio H1, produktų kiekiai, laukai, sutikimas, veiksmų mygtukai, būsenos ir klaidos. Esami svetainės šriftai bei tipografikos taisyklės išlaikomi. Patikros planas: vienas H1 serverio ir kliento HTML; faktinis pradinių kiekių perdavimas; 320 px bei desktop laukų ir mygtukų reflow; klaviatūros eiga; serverio suma; užsakymo atkūrimas po reload; atsisakymas ir neprijungto mokėjimo būsena. Vien TypeScript/build nėra šių sąlygų įrodymas.

Svetainės UI navigacija, poros/šeimos kortelės, pagalbiniai mygtukai, formos ir footer turi atskiras LT/PL/LV/ET frazes bei tos pačios rinkos maršrutus. Tai nepatvirtina nebaigtų 66 turinio vertimų. Vis dar vieši tik patvirtinti LT puslapiai. Produktų pavadinimų vertimas nekeičia serverio SKU, kainos ar pasiūlymo.

Nuosavas Node fixture yra `local-commerce-07.mjs`, prievadas 8827, atskira `runtime/commerce-07-8827/store.sqlite` bazė. Istorinis failo vardas išlaikytas; po source merge proceso paleidimas turi naudoti 0.8 source. Visi tiekėjai išjungti, 4.50 EUR siuntimas yra tik testinis. Kitų sesijų procesai ir duomenų bazės neliečiami.

Naujas pirkimo klientas vieną valandą saugo dar neatkurto užsakymo užklausos duomenis skirtuko saugykloje; gavęs užsakymo atsakymą juos pašalina ir saugo tik atkūrimo informaciją iki 30 dienų. Tai nėra serverio duomenų saugojimo politikos įrodymas. Viešas privatumo tekstas perėjo naujos revizijos peržiūrą ir official release `ad1d63d7-777e-4e8d-a3fc-48e2c0ac4a59`, SHA256 `fcf6203bf299bfb3252c1f0d9c38d1f9d43fcb48679a50357437ba5f320196c4`. Pakeistas tik privatumo tekstas; kitų21puslapių revizijos išlaikytos.

Faktinis browser testas: produkto Add→initialLines pair1→PLcountry→serverquote36.50EUR→persistedorder/reload waitingpayment→withdrawalrequestsaved, paymentdisabled. Tik sintetiniai kontaktai ir savas fixture. H1=1, DOM320px/documentwidth320; išsaugoto CUA screenshot realus capture buvo1280px, todėl juo siauro vaizdo neapsimetame. Actual desktop order snapshot peržiūrėtas. NaujasHTTPgateway13negativeguardsPASS; officialrender72requests/0issues; SEO109requests/22pages/21discovery; all10tenantSEOsmoke; public66tests; commerce0.8fullverify76Node/nativeD1/R2/dryrun. Aktualus homepage Lighthouse92/100/100/100, LCP3200ms/CLS0/TBT0; ankstesnis89 išlaikytas istorijoje, ne paskelbtas stabilus fieldperformancepagerėjimas.

Galutinis dizainas atidėtas savininko pavedimu. Gyvi mokėjimai, siuntimas, laiškai ir domeno publikavimas šiame bandyme neįjungiami.
