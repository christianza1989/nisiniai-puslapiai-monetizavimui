# Šešių gidų turinio inkrementas

Consumer užduotis perduota 2026-10-12. Exact producer PR107/b948707, paketas135/86c75950. Canonical bazė87e6c536/runtime9dcd67c/core566; producer senas rendereris nėra consumer variklis.

`build.mjs` naudoja esamą common validator/release verifier ir Madbeauty admission. Jis pakartoja dabartinio live Worker artefaktą su identišku SHA, tada pakeičia tik tris virtualius turinio build įėjimus. Iš esamos priimtos assets versijos kopijuoja visus885 failus nekeisdamas baitų ir prideda34 naujus turinio WebP. Senas129 paketas turi deepEqual snapshot,299 publikavimo datos tikrinamos prieš producer atskirą tenant. Public packet/model approval neperrašomi. Naujas output nesugriauna istorinio e20 edition.

Eiga: `build.mjs` → `accept.mjs native` → `platform-native.mjs` → tikras local compiled-runtime browser → `accept.mjs live-before` → `deploy.mjs deploy` → `deploy.mjs after` → `accept.mjs live-after` → actual canonical browser → naujas immutable receipt. Visi įrodymai `cloudflare/output/content-deploy6-20261012`; consumer helpers turi būti commitinti prieš deploy. Build įėjimai ir naujo core nėra diegiami į kitas nišas.

Production artefakte nėra QA laikrodžio. Atskiras `timing-worker.mjs` naudojamas tik izoliuotame native Worker: naujų6 T−1ms/T, index/schema/OG/breadcrumb,10 typed commerce IDs, tekstų/nuorodų/discovery/medijos viena riba ir visi664 actual bytes, kai due. `browser-server.mjs` yra tik loopback read-only proxy į tą patį full compiled native Worker su future clock, įprastu JS ir izoliuota SQLite; ne producer adapteris ir ne hosted edge. Canonical hosted patikra naudoja tikrą laiką, visi būsimi gidai/vaizdai paslėpti. Naujų QA paslaugų ar remote namespaces nekuriame.

Platform native panaudoja esamus booking-channel ir community/media testus su exact nauju production artefaktu. Deploy lease palygina main ir keturis saugomus Workers/domains; visos vars/bindings, observability/query redaction ir suderinamumas išlieka. Pinned Wrangler4.92 naujo redaction lauko neišsaugo, todėl jis atkuriamas kaip esamos būsenos preservation, su readback. Trial/reviewer/protected/calendar QA, SMTP, duomenys ir DNS nerašomi.

Pradinis native schema testas neteisingai tikėjosi JSON-LD objekto, kai incumbent išveda masyvą. Pataisytas testerio flatten, production rendereris nekeistas. Naujo gido schema ir OG patikros po to yra realios, ne ankstesnio b7 trūkumo pervadinimas.

Po actual receipt senas community/release.mjs e20 baseline helperis nebeatitinka naujo canonical version; jo neapeiti ir neperdeployinti seno129 turinio. Būsimas platformos leidimas turi vartoti šio consumer paketo135/86c75950 ir jo priimtą assets919 edition. Ankstesni receipts lieka istorija.

Grąžinimas šiame turinio inkremente yra į ankstesnį87e6c536 su tuo pačiu booking guard ir bindings, be duomenų atkūrimo. Package approval ir kalendoriaus datų nekeičiame. Galutinis receipt papildomas tik po faktinės aktyvacijos ir HTTPS priėmimo.
