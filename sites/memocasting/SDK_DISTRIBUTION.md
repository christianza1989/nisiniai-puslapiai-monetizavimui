# Bendro prekybos kliento eksportas į savarankišką public build

## Shopo 0.11 checkpoint · 2026-10-12

Aktuali patikrinta PUBLIC kopija `220233ea5f45c23109758c977c2dd7e69b183876`, canonical browser source `703d9dcd19083cfe6cb73e4f2add935f09986f21`. Exact Git archive išskleistas į atskirą `output/standalone-shop-220233e`; gretimo privataus core nėra. Pilnas `npm run build` PASS, visi 10 turinio paketų sukompiliuoti, SDK manifest ir abiejų failų baitai patikrinti. Naudotos jau įdiegtos PUBLIC priklausomybės per junction; tai nėra clean `npm ci` bandymas.

Paketo SHA256 archyve ir darbo kopijoje: `e69b16f2c764ad51d075f6700af9ad97ad9f1a7fb2248c30552f68efb9afa9c6`. Client SHA256 `7c5f07e33eacc8c9b42b55060d9014a3497f7ddd8d916abe4bc992298b7c557e`, UI SHA256 `55feb69f3eebae47f9558fe646b31e92a130e7f894a533c1cabd475396c6810c`. Privatus kvitas `output/audits/standalone-shop-220233e-proof.json`; build log tame pačiame audit kataloge. Tai vietinis source/build priėmimas; tolesnė canonical sandėlio pataisa ir gyvi tiekėjai vertinami atskirai.

Žemiau išlaikyta ankstesnių SDK etapų istorija.

Tiesioginis browser SDK importas iš gretimo privataus checkout veikia vietinėje poroje, tačiau vien public repo kopijai to katalogo nėra. Pataisa companion PR31: `scripts/sync-commerce-sdk.mjs` ima tik canonical commerce-core viešus `commerce-client.mjs` ir `checkout-ui.mjs` Git blobs iš aiškiai perduoto peržiūrėto40hex source SHA. Tai nekeičiamas browser distribucijos eksportas, ne nauja prižiūrima prekybos logika.

Pradinė source versija `06f428860745059a5a0d848dca3691b8cbb80a95` (commerce0.8). `vendor/commerce-core/source-manifest.json` saugo abi tikslias SHA256 bei source repo/path/revision. Bendros .gitattributes LF taisyklės išlaiko Git-blob baitus ir Windows, ir Linux; esamos kitų failų taisyklės nepakeistos. Sync gali eksportuoti tik2fiksuotusviešusfailus ir tik sourcecommit, esantį canonicalcheckoutHEAD istorijoje. Private runtime, config, operator backend ar credentials neeksportuojami.

`npm run build` pirma vykdo manifest/bytes patikrą. Pakeisti baitai ar netikėtas inventory sustabdo build. Prasmingas izoliuotas Node testas patikrino faktinių eksportuotų failų priėmimą ir tyčia pakeistų bytes/pathinventory atmetimą. Runtime importas naudoja public `@/vendor/commerce-core`, todėl neturi privataus sibling dependency.

Actual standalone patikra: iš `8ee52f9` Git archive išskleista švari publicsource kopija nuosavame ignored `output/standalone-sdk-8ee52f9`. Joje nėra gretimo privatecore checkout. Naudotos jau įdiegtos publicnode_modules per aiškiąworkspacejunction; papildomos bibliotekos ar providers nediegti. Pilnas standalonebuild (10tenants, SDKexactverify, compile, client/RSC/SSR) praėjo. Pačios sourceporos build ir TypeScript taip pat praėjo. Prieš sourcegavimo0.9 bus tas pats officialsync, peržiūrėtas manifestdiff ir buyerintegration; nativeSDKfailų rankomis netaisyti.

Tai vietinis build/SDK perdavimas; ne registry publication, main adoption, domeno deploy ar prekybos aktyvacija. Frontend ir prekybos serverio sutartys turi būti priimtos kartu. Originalios turinio approval/dates nekeičiamos vien dėl SDK pakavimo.


## Ankstesnis 0.10.3 atkuriamas leidinys · 2026-10-12

Canonical source0.10.3:17880fdcacbeff0fe16f2999be79c8ba188a1e04. Public source8a148fdd58b549da35d2e2a177f1ee828dcdf909. Iš pastarojo exact Git archive į atskirą output/standalone-native-8a148fd sudarytas švarus projekto medis. Gretimo privataus core nėra; tik Node priklausomybių junction į own public node_modules. npm run build PASS; exact2SDK verifikacija ir visų10paketų compilacija PASS. Tai nepriklausomo source/build, ne clean npm ci ar production/runtime binding bandymas.

Working ir archyvo turinio paketo SHA vienodas:e69b16f2c764ad51d075f6700af9ad97ad9f1a7fb2248c30552f68efb9afa9c6. Client SHA7c5f07e33eacc8c9b42b55060d9014a3497f7ddd8d916abe4bc992298b7c557e; UI SHA65d4668157f91177c86575e38a0adb1fd3d6f5c2b2046a2d3c7bf0d9082475b2. Nėra kopijuoto / forkinto backend ar sesijos tokenų.
