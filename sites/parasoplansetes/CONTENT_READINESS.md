# Turinio parengties įrodymai

2026-10-09 saviauditas. siteId `parasoplansetes`, domenas `parasoplansetes.lt`, locale `lt-LT`. Būsena: vietinė turinio realizacija; ne viešo domeno ar viso F1 priėmimas.

Native contentWorkflowVersion1, šešių mėnesių planas ir dviejų publikacijų per mėnesį hipotezė yra studijos įraše. Tai nėra paleisto periodinio generatoriaus ar išmatuotos paklausos įrodymas. 19 puslapių, 4 gidai, 20 optimizuotų medijos failų. Kiekviena pataisa eina editPage → revision-bound recordEditorialReview → approveReviewedBatch → immutable release → kanoninis importas → build. Approval hash ranka nekeistas.

Pradinio privataus juodraščio ir 19 privataus preview URL patikros įrodymas saugomas izoliuotoje studijoje; vieši tekstai, HTML ir ekrano nuotraukos aprašyti VERIFICATION.md. Privati būsena nėra vieša publikacija. Natyvaus gidų indekso, pilno straipsnio, Organization autoriaus, datų, šaltinių ir Article/Breadcrumb projekcija tikrinta pagal realų paketą.

Tikras request-time ribos testas išsaugotas `rendered-before-publication.json` / `rendered-after-publication.json`: nekeičiant pradinio `fae6a474...3429` paketo, prieš 2026-10-08T16:45:49.664Z buvo 18 viešų puslapių / 3 gidai; būsimas terminalinio serverio URL ir išskirtinė medija404. Po tikro laiko — 19 / 4, URL ir medija200; paruoštos nuorodos, HTML, schema, sitemap ir LLM eksportai atsirado kartu. Šis istorinis bandymas nepervadintas naujo paketo bandymu.

Saviaudito paskutinis native release `f6b9db27-c7f2-4545-8fdb-8171ecbff165`, SHA-256 `ed39a2769c2fdd1732696f39076bf827972cc81bb98d385d30d9620149012e7b`. Keturi gidai turi naujai peržiūrėtus kontekstinius anchor, penki modeliai — konkrečius gamintojo šaltinius. Schedule ir asset bytes nepakeisti. 4.3 ekranas aiškiai turi keturias spalvas; NG10 eiga paremta jo paties dokumentacija. Release verifier patvirtino19pages/20assets ir `verified-export-not-deployed`.

Istorinės datos lieka pažodinės. Reali pirmo viešo paskelbimo data ir aktuali operatoriaus informacija turi būti suderintos paleidžiant domeną per studiją, o ne maskuojamos metaduomenų pakeitimu. Galutinio saviaudito HTML/LLM/testų kvitai yra `self-audit/`. Pradinis PHASE auditas išsaugotas `self-audit/initial-PHASE-1-AUDIT.*`. Produkcinis importas, domeno priėmimas ir periodinio generatoriaus operacijos NEPATVIRTINTOS.
