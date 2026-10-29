# signaturepads.lt – esamos svetainės migracija

Savininko pavedimas 2026-10-29: išsaugoti esamą išvaizdą, tekstus, kontaktus ir ypač visas nuorodas; identiškumas iki pikselio nereikalingas. Svetainė priima tik užklausas (tiesioginis atsakymas šiame chate), apmokėjimų nereikia.

Tai esamo verslo techninė migracija. Originalus turinys paimamas iš savininko viešos svetainės. Nauju tiesioginiu 2026-10-29 pavedimu savininkas papildomai užsakė metaduomenų sutvarkymą ir šešių programinės įrangos produktų aprašymus, patvirtino dviejų senų puslapių išėmimą ir atsisakė Paysera bei užsakymų svetainėje. Nauji gidai, kontaktai ir Pinet rekvizitai nepridedami.

## Šaltiniai ir darbo ribos

- Core `25292e20219b735df7f04c5807dd4c100f98addc`, public `c2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da`; sėkminga abiejų repo start/continue freshness patikra.
- Atskiri checkout: `D:/Core/signaturepads-migration-20261029/nisiniai-puslapiai-monetizavimui` ir `../niche-public-core`.
- Viešų atsakymų originalai ir SHA: `D:/Core/output/signaturepads-migration-20261029/capture`.
- Originalus inventorius: 28 URL, 19 produktų, 3 kategorijos. Naujos versijos aktyvūs URL: 26; savininko nurodyti `/sample-page/` ir `/ozonas-geriausia-kvapu-naikinimo-priemone/` grąžina 410. Likę URL nepervadinami, išlaikomi galiniai pasvirieji brūkšniai ir `/#kontaktai`. Istoriniai capture originalai nepakeisti.
- Kontaktai pagal esamą svetainę ir tiesioginį savininko pavedimą: `sales@signaturepads.lt`, `+370 686 88369`.
- Šiame etape nekeičiami gyvas hostingas, DNS, WordPress, bendro Core publikavimo vartai ar kitų svetainių failai. Mokamų tyrimų nėra.

## Peržiūros ir priėmimo eiga

Peržiūra yra tik loopback, noindex, su nepatvirtinto migracijos snapshot turiniu. Joje nėra suklastotų Core approve/hash įrašų. Užklausų bandymai saugomi atskirai vietiniame žurnale, tikras paštas nesiunčiamas. Po savininko turinio/peržiūros priėmimo reikalingas esamo studijos modelio approval/release/import kelias ir tik tada produkcinis domeno pakeitimas.

Privalomos patikros: visi inventorizuoti URL, vidinės nuorodos ir fragmentai; visi tekstai ir kontaktai; desktop/mobile; meniu, galerijos, kategorijų filtrai ir užklausa; 404; vietinės peržiūros noindex ir kilmės izoliacija. Peržiūros patikra neprilyginama produkciniam SEO/GEO priėmimui.

## Patvirtintų papildymų būsena 2026-10-29

Metaduomenys sutvarkyti techninėje peržiūroje: nebėra tuščių description ar pabaigoje paliktų title skirtukų. Trūkstami description sudaryti tik iš to paties esamo turinio sakinių / etikečių; produktų nauja proza nekurta. Metadata vienodai naudojama HTML, Open Graph ir peržiūros WebPage grafuose.

410 taikomas abiem pašalintiems puslapiams, jų WordPress page_id ir nebeaktualiems krepšelio / atsiskaitymo / Paysera adresams. Visi sitemap variantai neberodo pašalintų puslapių. Parodytos kainos lieka kataloge, o nenaudojami sandorio / sandėlio požymiai neperkeliami.

Šešiems aprašymams surinkti ir perskaityti gamintojų dokumentai, išsaugoti raw SHA, šaltinių tekstai ir tikslūs patvirtinto šablono promptai. Gemini `/u/2` meniu patikrintas 4 Argon LOW. Užduoties siuntimas per Playwright neįvyko: redaktorius liko užpildytas, neatsirado user-query/model-response; native click stabdomas visible/enabled/stable laukimu. API ir computer-use nenaudoti, kitu modeliu nesiųsta. Pagal START.md draudimą Codex savarankiškai rašyti viešą prozą aprašymai neparašyti. Visos nuo to nepriklausančios techninės užduotys atliktos. Laukiama Roko sprendimo dėl šios konkrečios rašymo kliūties; tai nėra approve/release ar publikavimo prašymas.
