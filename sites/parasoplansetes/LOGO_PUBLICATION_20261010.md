# Pasirinkto logotipo įkėlimas — 2026-10-10

Savininkas pasirinko 4-ą variantą su dviem kairėje sulygiuotomis eilutėmis „parašo“ / „planšetės.lt“. Planšetės ženklo apačia lygiuojama su apatinės eilutės „p“ apačia. Papildomas užrašas „StepOver sprendimai“ pašalinamas iš bendro antraštės ir poraštės Brand komponento.

## Patikros planas

- [x] Išsaugoti pasirinktą PNG projekte; SVG peržiūros langas apima tik logotipą ir jo apsauginį tarpą, neperkuria jo piešinio.
- [x] Pašalinti seną ženklo ir papildomo teksto stilių kaskadą. Desktop logotipas 240 px, mobile 200 px, siaurame 320 px ekrane 180 px; nuoroda turi aiškų prieinamą pavadinimą.
- [x] Patikrinti homepage, gidą, poraštę bei mobilų meniu tikroje naršyklėje. Kitų nišų, patvirtinto turinio, datos, SEO ir runtime funkcijų nekeisti.
- [x] TypeScript, scoped lint, build, preview adapterio turto izoliavimo regresija ir Wrangler dry-run.
- [x] Įdiegti į esamą parasoplansetes-preview Worker; patikrinti tikrą PNG, HTML ir hosted vaizdą, dokumentuoti faktinius rezultatus.

Freshness: core main 7af6b9641012a30c5f95eac38a66daeff8f8cb39, companion main ec8a9c032fe926d1d9722802d8eb26fa8bd02937; abiejų bazė PASS.

## Faktinis rezultatas

Viešai įdiegta Worker versija `489965ee-0f06-4b56-b1fa-8d260049246e`. Pasirinktas 1774 × 887 px PNG saugomas public `public/branding/parasoplansetes-logo-20261010.png`; SHA256 `5e031963f159dbaf6b256ecddcf5a5ba0171037a5a72f05f3ec960262a3edbdf`. Jo piešinys nepergeneruotas ir nepakeistas; SVG `viewBox` išima didelius skaidrius paraščius iš antraštės išdėstymo. Bendras Brand turi aiškų nuorodos pavadinimą, o senas šūkis ir jo stiliai pašalinti.

TypeScript ir pakeistų TSX/proxy failų ESLint PASS. Public 66 core testai ir 6 preview adapterio testai PASS. Galutinis build ir Wrangler dry-run PASS; įprasti ankstesni vinext chunk/route klasifikavimo įspėjimai išlieka. Pirmo build metu pakeitus PNG dimensijas jis turėjo seną metaduomenį; final build atliktas jau po dimensijų ir mobilios antraštės pataisų.

Tikra vietinė naršyklė: homepage 1280 ir 320 px, gidas 320 px, mobilus meniu ir poraštė. Aptiktas 320 px gido meniu persikėlimas į antrą eilę pataisytas bendrame siauro ekrano meniu stiliuje. Galutinėje peržiūroje horizontalios slinkties nėra. Tikra hosted naršyklė: homepage 1280 px ir gidas 320 px; 2 bendro Brand nuorodos, seno papildomo teksto nėra, logo matomas ir neapkerpamas. Ekrano nuotraukos `output/parasoplansetes-logo-publication-20261010/`.

Nuotolinė HTTP patikra: visi 24 dabar matomi puslapiai grąžina 200, kiekviename yra 2 nauji Brand su teisingu PNG URL ir be seno papildomo užrašo. Tikras PNG 200, image/png, SHA ir visi baitai sutampa su source. Nepatvirtintas kitas branding failas 404. Preview noindex/nofollow išlaikytas. Pirmas laikinas checker klaidingai rinko `page.status`, todėl pasirinko 0 puslapių; kvitas išsaugotas kaip `remote-check-initial-no-pages.json`. Pataisyta į tikrą `page.approval.status`, pridėta tuščios atrankos klaida ir galutinis 24 puslapių rezultatas PASS. Tai nėra ankstesnių ar tuščių patikrų perkėlimas į final PASS.

Patvirtintas paketas liko SHA256 `9d94e82ae07be3a28406373e6b4f0c9808549e26a057e9b81aad7633f73e2cfa`, ta pati immutable laidacb6be84b. Datos, straipsnių tekstai ir kitų nišų rendereriai nepakeisti. Tas pats D1 UUID, chat/voice/form SMTP OFF; `--keep-vars` ir esamas traces OFF išsaugoti. DNS, domeno prijungimo ar indeksavimo pakeitimų nėra. Tai siauro logotipo pakeitimo priėmimas, ne pilnas svetainės accessibility/SEO/200% zoom sertifikavimas. Atkuriama ankstesnė Worker versija `e25d725d-16c1-4f9e-8770-928c744d3f00`.
