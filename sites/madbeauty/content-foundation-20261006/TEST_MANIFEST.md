# Pagrindo priėmimo rinkinių manifestas

Užfiksuota prieš bendrą galutinę regresiją, 2026-10-06.

1. `node sites/madbeauty/cloudflare/build.mjs` – immutable V1 suderinamumas ir Workers candidate assets/bendro V2 schema helperio bundle.
2. `node sites/madbeauty/content-foundation-20261006/export-registry.mjs --check` – tikslūs versijuoti planavimo eksportai.
3. `node --test sites/madbeauty/backend/*.test.mjs sites/madbeauty/prototype/*.test.mjs sites/madbeauty/acceptance/*.test.mjs sites/madbeauty/cloudflare/*.test.mjs` – visi keturi esami moduliai, jų testai nešalinami. Nauji: penki content-foundation kontrakto/medijos testai ir vienas Workers V2 pilno kelio testas. Manifesto papildymas prieš galutinį medijos retest: exact release source medija, future/unknown404 ir private shadow importer.
4. Actual naršyklė – katalogo kategorija → procedūra → miestas → patvirtintas fixture profilis, kito miesto empty ir V2 straipsnis. Fizinio mobile bandymo neįrodžius jis lieka UNVERIFIED.
5. `git diff --check` ir `node scripts/repository-safety.mjs . --staged` – tikslūs pasirinktų source failų blob.

V1 contact admission pirmas bandymas FAIL: V1 neturi site.operatorName; bendras kontaktas ateina iš tinklo config. Pataisyta operatoriaus lauką tikrinti V2, V1 operatorių išlaikyti kaip anksčiau. Pakartotinė regresija turi įrodyti abu adapterius.

Pirmas bendras paleidimas 87/88 PASS: senas private server testas be API/pasiūlos tikėjosi200 `/paslaugos/manikiuras/vilnius`. Nauja sutarta tuščio vietinio filtro404 taisyklė pakeičia šį lūkestį. Tas pats testas išlieka, jo scenarijus perkeliamas į404 sąrašą; naujas kontrakto/Workers testas atskirai įrodo tikros approved pasiūlos200 ir išnykimo404.

Priėmimas lokalus, ne gyvų teikėjų ar production release įrodymas. Synthetic article/profiles tik izoliuotiems bandymams, production seed neturi jų importų.
