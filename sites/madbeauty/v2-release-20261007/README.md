# V2 reviewed release priėmimas

2026-10-07 savininko autorizuotas siauras Madbeauty turinio publikavimo kelias. Dabartinė saugi rollback versija `3ef780b8-bfde-436d-ae01-f2cb1f842e80`, source d345668 / PR21. Platesnis upgrade PAUSED.

Turinio sesija perdavė pilną V2 reviewed paketą: home, gidų indeksas, redakcija, organizacijos autoriaus puslapis, trys retained gidai ir du ateities gidai. Exact SHA256 `b208596faea613be548c15423ec691c3d1cc01b2f0b1dcdcfb80f7411ea8fdd5`; release ID `64d13589-96c9-40cc-872d-0b91252b9ecc`. Devyni puslapiai turi tikrus bendro workflow review/approval įrašus; V1 approvals nebuvo konvertuoti. Rašančios sesijos portable source c77d6f3 / PR10. Paketo, approvals ir publishAt nekeičiau.

Kandidato priėmimas: immutable export / common schema / domain-contact / production admission / shadow import PASS; 92/92 nišos regresijos testai PASS; intended production config dry-run PASS. Tikras desktop 1280×720 ir mobile 390×844: indeksas, straipsnis, autoriaus nuoroda ir patvirtintas home fragmentas; horizontalus overflow pataisytas `.prose img`, desktop client/scroll1265, mobile375. Gidų indeksas anksčiau praleido approved body; platformos home klientas praleido approved home turinį. Renderer integracija pataisyta išlaikant esamą paiešką ir brand.

Actual-time shadow: 7 due / 2 future puslapiai, 25 media200 / 5 unshared future404, discovery private404. `accept-reviewed-candidate.mjs` tikrina tą patį tikrą paketą izoliuotame compiled Workers runtime ties realiu laiku, T−1ms ir T=2026-10-13T07:00:00Z: atitinkamai 7/7/9 puslapiai, 25/25/30 media, paskutiniu laiku 14 tikrų typed catalogue commerce href. Tai nėra viešo hosto ateities datos įrodymas.

Ankstyvos patikros rado realius trūkumus: synthetic test fixture trūko nuosavų asset allowlist, o `/gidai` renderer nerodė approved paragraphs. Taip pat naujas featuredimage netilpo į prose plotį; CSS pataisytas. Galutinės patikros PASS. Įrodymai `evidence/` yra vietiniai ir ignoruojami Git.

**Gyvas release:** Worker versija `edf429e9-2409-49bb-bf2b-88b5d53628f8`, runtime source `897ba831f27d42c88cf723e0b6c0abd22ac57d48`, PR24. [RECEIPT.json](RECEIPT.json) saugo sanitized actualhost priėmimą:17pages/134assets/7boundaries,7due/2futurepages,25eligible/5hiddenmedia ir exact byte hashes,257national routes/noindex/103cityoptions,48extensionsplanned/0localready. Ta pati DO / secrets tapatybė išlaikyta; rollback `3ef780b8-bfde-436d-ae01-f2cb1f842e80`. Nėra DB/mail/DNS migracijos.

Actualhost desktop1280×720/mobile390×844 indeksas, retained straipsnis, autoriaus nuoroda ir approved home turinys PASS. Current gidas turi tikrą `https://madbeauty.lt/paslaugos/manikiuras` commerce href; ateities 14 nacionalinių href patikrinti tik izoliuotame exact-clock candidate, kol jų straipsnis neviešas. Būsimo viešo hosto patikra po tikros publishAt datos lieka atskiras neįrodytas etapas. Generatorius/review/approved export yra writer PR10 atsakomybė.

Priėmimo eiga po faktinio paketo perdavimo:

1. Common `verifyContentRelease` / immutable hash / domain/contact / V2 schema ir nišos production media/link admission. Apžvelgti review receipt bei all-page approval identity; pačiam approvals / datos nekeisti.
2. Existing `content-foundation-20261006/preview-release.mjs <directory> --expected-sha256 <SHA> --port 8834` naudoja bendrą shadow importerį izoliuotame sandbox. Private preview negali suteikti public href readiness.
3. `cloudflare/verify-release-timing.mjs http://127.0.0.1:8834 --package <directory/content-package.json> --expected-sha256 <SHA>` tikrina actual-time due/future body/JSON/mediją ir private discovery404. Actual media shared su due home teisėtai200; unshared future media404.
4. Existing `cloudflare/build.mjs --content-package <directory/content-package.json> --expected-sha256 <SHA>`, pilni keturi Madbeauty testų glob, intended config dryrun ir exact source safety.
5. Hosted desktop/mobile prospective edition prieš activation per isolated Workers, then owner-authorized scoped production release į tą patį DO / origin, be duomenų/secrets/mail/DNS migracijos.
6. `MADBEAUTY_REVIEWED_RELEASE_ASSETS` nurodo exact release assets katalogą. `cloudflare/verify.mjs https://madbeauty.lt` ir `verify-release-timing.mjs https://madbeauty.lt --package <directory/content-package.json> --expected-sha256 <SHA>` tikrina eligible public HTML / canonical / schema / image bytes / sitemap / LLM / future exclusion. Registry actualfresh257nationalready / currentapprovedlocal vartai lieka.

Sitemap ir llms index membership neįtraukia funkcionalių noindex katalogo puslapių. `llms-full.txt` gali teisėtai atkartoti current-ready typed commerce href matomame due straipsnio tekste; tai nėra naujas indeksuojamo catalogue puslapio įrašas.

Nediegti synthetic fixture vietoje realaus review paketo. Būsimo straipsnio viešas tekstas/media iki publishAt neviešinamas. Iki tikros datos actualhost post-date elgesys neįrodytas; compiled exact-clock testas žymimas atskirai. Naujo paketo priėmimas bus įrašytas atskiru sanitized receipt.
