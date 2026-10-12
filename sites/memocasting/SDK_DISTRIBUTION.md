# Bendro prekybos kliento eksportas į savarankišką public build

Tiesioginis browser SDK importas iš gretimo privataus checkout veikia vietinėje poroje, tačiau vien public repo kopijai to katalogo nėra. Pataisa companion PR31: `scripts/sync-commerce-sdk.mjs` ima tik canonical commerce-core viešus `commerce-client.mjs` ir `checkout-ui.mjs` Git blobs iš aiškiai perduoto peržiūrėto40hex source SHA. Tai nekeičiamas browser distribucijos eksportas, ne nauja prižiūrima prekybos logika.

Pradinė source versija `06f428860745059a5a0d848dca3691b8cbb80a95` (commerce0.8). `vendor/commerce-core/source-manifest.json` saugo abi tikslias SHA256 bei source repo/path/revision. Bendros .gitattributes LF taisyklės išlaiko Git-blob baitus ir Windows, ir Linux; esamos kitų failų taisyklės nepakeistos. Sync gali eksportuoti tik2fiksuotusviešusfailus ir tik sourcecommit, esantį canonicalcheckoutHEAD istorijoje. Private runtime, config, operator backend ar credentials neeksportuojami.

`npm run build` pirma vykdo manifest/bytes patikrą. Pakeisti baitai ar netikėtas inventory sustabdo build. Prasmingas izoliuotas Node testas patikrino faktinių eksportuotų failų priėmimą ir tyčia pakeistų bytes/pathinventory atmetimą. Runtime importas naudoja public `@/vendor/commerce-core`, todėl neturi privataus sibling dependency.

Actual standalone patikra: iš `8ee52f9` Git archive išskleista švari publicsource kopija nuosavame ignored `output/standalone-sdk-8ee52f9`. Joje nėra gretimo privatecore checkout. Naudotos jau įdiegtos publicnode_modules per aiškiąworkspacejunction; papildomos bibliotekos ar providers nediegti. Pilnas standalonebuild (10tenants, SDKexactverify, compile, client/RSC/SSR) praėjo. Pačios sourceporos build ir TypeScript taip pat praėjo. Prieš sourcegavimo0.9 bus tas pats officialsync, peržiūrėtas manifestdiff ir buyerintegration; nativeSDKfailų rankomis netaisyti.

Tai vietinis build/SDK perdavimas; ne registry publication, main adoption, domeno deploy ar prekybos aktyvacija. Frontend ir prekybos serverio sutartys turi būti priimtos kartu. Originalios turinio approval/dates nekeičiamos vien dėl SDK pakavimo.
