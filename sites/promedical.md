# Promedical

Savininko atstovaujamo Klaro tiekėjo lietuviškas medicinos įrangos katalogas ligoninėms, poliklinikoms ir slaugos įstaigoms. Užsakymas: visas produktų inventorius ir originalūs lietuviški aprašymai, panašus žalias/baltas medicininio katalogo stilius. Patvirtinti kontaktai `sales@promedical.lt`, `+370 686 88369`; viešas vardas „Promedical“, juridinio pavadinimo nerodyti.

1 408 realūs modeliai, 437 kategorijos, 3 gidai, 1 856 approved puslapiai, 3 598 patvirtinti vaizdų variantai. Kanoninis paketas SHA-256 `32f955d9c35b7590027069ff3a8a43eca6bc8afc35ba83a6d5f4021ecb5c65e6`. [Katalogo importas](promedical/CATALOGUE_IMPORT.md), [turinio ribos](promedical/CONTENT_READINESS.md), [dizainas](promedical/DESIGN.md), [verslo pavedimas](promedical/BUSINESS.md).

Operacinis įrankis – paieška, 59 katalogo puslapiai, kategorijų hierarchija ir bendras modelių / kiekių užklausos sąrašas. Tai konkretaus poreikio užklausa, ne automatinis užsakymas ar rezervacija. Modelio URL yra tapatybė, todėl vienodo SKU skirtingi gamintojo ID nesusilieja.

Darbo vietos `C:/Core/promedical-core-20261009` ir `C:/Core/promedical-public-20261009`, šakos `codex/promedical-20261009`. Koordinavimo issues: core [52](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/52), public [19](https://github.com/christianza1989/niche-public-core/issues/19). Prieš naują darbą ir handoff taikyti naujausią canonical `scripts/git-freshness.mjs` su companion, perskaityti fetched main AGENTS/kontraktus; jokio kito checkout reset/stash.

Local production peržiūra `http://127.0.0.1:8787/`, NICHE_DEV_SITE_ID=promedical, tik vietiniai DB/ASSETS binding. Norint atkurti: public checkout `npm ci`, `npm run build`, tada `npm run start -- --port 8787`. Build ir Wrangler serveris neturi kartu naudoti rašomo `dist` katalogo Windows aplinkoje; prieš rebuild sustabdyti tik savo identifikuotą serverį. Vietinis `.openai/hosting.json` / D1 / runtime / raw šaltiniai nėra publikuojami ar committinami.

Katalogo atkūrimo scriptai core `scripts/import-promedical-catalogue.mjs` ir `scripts/review-promedical-catalogue.mjs` naudoja private užfiksuotą final-v2 šaltinį, tikrus source hash ir Studio API. `prepare-promedical-preview.mjs` yra saugiai apribotas istorinis pirmos šeimos prototipas; ant pilno katalogo jo neleisti. Patvirtintos publikavimo versijos neperrašomos automatiniu seed.

Patikrų eiga: [VERIFICATION.md](promedical/VERIFICATION.md), [TEST_FINDINGS.md](promedical/TEST_FINDINGS.md), [ACCESSIBILITY-VERIFICATION.md](promedical/ACCESSIBILITY-VERIFICATION.md), [A–Z audit](promedical/PHASE-1-AUDIT.json), canonical [SITE_COMPLETION.json](promedical/SITE_COMPLETION.json). `--render-only` nėra priėmimas. `score-audit --require-local` ir strict completion turi rodyti likusius nepatvirtintus vartus, ne rankomis pakeistą PASS.

Live domain / production hosting / DNS / mail nekeičiami šiame darbe. SMTP priėmimas, pažymėto Message-ID tikras INBOX, production duomenų valdytojas / gavėjai / saugojimo terminai ir tikras 200% browser zoom lieka nepatvirtinti. Techninė vietinė peržiūra nėra domain-ready, WCAG sertifikatas, teisinis patvirtinimas ar pamatuota paklausa.

Galutinė faktinė render-only patikra:5 461GET /1 856current public pages /3 598assets,0issues; canonical Host transport8790, realus bundledPython. All10SEOsmokes, catalogue59pages/1408models, local browser/D1 submission irkeyboard PASS. A–Z62/71local (8.73),9UNVERIFIED; `score-audit --require-local` tikrasexit1, strict acceptance atskiras. Draft public PR [20](https://github.com/christianza1989/niche-public-core/pull/20); core PR ir source/handoff proof papildomi galutiniame [HANDOFF.md](promedical/HANDOFF.md). Jokio main merge/adoption/publish teiginio.
