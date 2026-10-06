# Madbeauty turinio priėmimas

2026-10-05 · trys pradiniai gidai priimti per bendrą workflow, 7 puslapių paketas importuotas ir patikrintas vietoje; production UNVERIFIED. V1 bendras studio modelis ir savitas Madbeauty HTML. Review atliko tas pats įgyvendinimo agentas.

Aktualus release: `c231ee43-4fd6-43ac-9dcf-8ce1d7407c54`, SHA `dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579`, 7 puslapiai / 20 responsive WebP. `content/INITIAL_RELEASE_RECEIPT.json`, `research/madbeauty-implementation/content-initial-release-import.json`. Ankstesni penki page objektai išliko identiški; du nauji gidai turi savo revision-bound review. Release būsena exported-not-deployed.

Trys pilni gidai: `gidai/kas-ieina-i-manikiuro-kaina`, `gidai/kaip-pasirinkti-nagu-spalva`, `gidai/kaip-vertinti-meistro-darbu-galerija`. Actual private draft bei galutiniai desktop/mobile ekranai: `content-initial-guides-draft-browser.json`, `content-initial-guides-final-browser.json`. Galerijos gidas remiasi nurodytu NVSC pirminiu šaltiniu; spalvų pasirinkimo rekomendacijos nėra sezoninio populiarumo statistika.

| Vartai | Actual būsena | Įrodymai |
|---|---|---|
| Bendras siteId / operatorius / faktai | PASS — madbeauty, MB Pinet / info@pinet.lt, nepatvirtinti pajėgumai pažymėti privačiame brief | `content/register-first-guide.mjs`, actual studio tenant |
| 6 mėn. politika | PASS — weekly, 3 articlesPerWeek, 10:00 Europe/Vilnius; 76 langai nėra straipsnių ar deploy įrodymas | `content/policy-weekly.json`, common workflow policy |
| Pirmo gido draft / assets | PASS — originali apimties / kainos / laiko analizė, vienas peržiūrėtas workspace originalas, 5 WebP, saveResponsiveAsset | `content-first-guide-draft-desktop.png`, `content-first-guide-draft-mobile.png`, `content-draft-browser.json` |
| Faktai / nuorodos / review | PASS — pažymėtas 35 € / 75 min. aritmetinis pavyzdys; target tikras page ID; common finalize; exact revision-bound review | `content/record-first-reviews.mjs`, common private release manifest |
| Atomic approve / release / verify | PASS — 5 puslapiai, 5 asset failai; package SHA 42ad4384d497594849dc4b7953e01d80a3b2a76a3318b3bd4e8e38b4efb52ae1 | `content/FIRST_RELEASE_RECEIPT.json`; common verify-content-release |
| Bendras import / compile | PASS — tiksli common skriptų kopija su SHA, viena Madbeauty versija own isolated runtime | `content/CORE_SANDBOX_PROVENANCE.json`, `content/CORE_SOURCE_VERSION.json`, `content/adapter.mjs` |
| Draft nepublikavimas | PASS — prieš approval guide 404, index be jo, DTO 0 public puslapių, sitemap / LLMs preview 404 | `research/madbeauty-implementation/content-draft-http.json` |
| PublishAt visi paviršiai | PASS — to paties HTTP serverio kontroliuojamas clock replay 11:59:59.999 → 12:00:00, ta pati exact package versija. Gidas / index / CTA / Article / canonical / sitemap / LLMs / WebP | `content-release-http.json`, before/after HTTP snapshots |
| Common SEO smoke | PASS — aktualūs 7 projected puslapiai, schema / canonical / robots / sitemap / LLMs / favicon / missing / unknown host | `content-common-seo-smoke.txt`; pirmų 5 HTTP įrodymai išliko atskiruose JSON |
| Private / demo nuotėkio negatives | PASS šio release ribose — review manifest 404, demo org / client / emails / isDemo / revisionHash nėra DTO / discovery | `content-release-http.json` |
| Atšaukimo negative | PASS — tik isolated tenant clone; common revoke + dangling-link release block + common repair/review/import; 7 actual HTTP paviršiai be gido. Originalus tenant nepakeistas | `content-revocation-http.json`, `content/check-revocation-http.mjs` |
| Galutinis gido HTML desktop/mobile | PASS — actual 1280 ir pakartotas actual 390 px, loaded media, overflow 0; CTA atidarė veikiančią kategoriją | `v3-content-first-guide-desktop.png`, `v3-content-first-guide-mobile-pass.png`; pirmas „mobile“ capture buvo 1280 ir nėra mobile PASS |
| SPA schemos / mobile contents pataisos | PASS naršyklėje — keičiant gidą pakeičiamas Article headline; indekse Article pašalinamas; 390 px turinys sutraukiamas ir telpa. Native serveris atnaujintas ir perkrautas; actual route ir patvarus naujas vizitas patikrinti bendroje QA | `content-initial-guides-final-browser.json`, `v3-content-colors-mobile-polished.png` |
| Kiti du pradiniai gidai | PASS — actual common draft / private preview / media / review / approve / release / verify / import / compile; esami publishAt nekeisti | `content/register-initial-guides.mjs`, `content/release-initial-guides.mjs`, `content/INITIAL_GUIDES_BATCH.json` |
| Viso viešo katalogo SSR / SEO | UNVERIFIED — common paketo SEO taikomas tik registruotiems public turinio puslapiams; likęs katalogas dar atskiras gate | `prototype/app-server.mjs` |
| Tikras domenas / mail / DNS / hosting / GSC / paklausa | UNVERIFIED — preview loopback, noindex; SMTP auth nėra INBOX; exported-not-deployed | `IMPLEMENTATION_STATUS.md`, `CORE_FEEDBACK.md` |

Neslepiami taisyti bandymai: pirmas approve/release atmestas dėl trumpo home teksto; pirmas import dėl praleistos V2 schemos priklausomybės; pirmas Host negative neteisingai naudojo fetch override. `content-first-approval-attempt.json`, `content-first-import-attempt.json`, `content-release-http-first-attempt.json`. Istorinių fail rezultatų neperrašome.

Papildoma actual pataisa: naujo spalvų gido inline vaizdai pirmoje 390 px patikroje išplėtė grid. Pirmas FAIL išliko `content-colors-final-first-attempt.json`; pataisyti min-width, 100 % vaizdų plotis ir sizes. Pakartotoje patikroje visi trys vaizdai pakrauti, overflow nėra. Pirmą draft fullpage screenshot lazy vaizdas dar nebuvo pakrautas; pilnas po tikro scroll išliko atskiru loaded failu.

Kontroliuojamo laikrodžio testas nėra istorinis publikavimas ar tikro domeno paleidimas. Produkcinės discovery išvestys šiame preview išjungtos; izoliuotas testas naudoja common generatorių, loopback ir noindex.
