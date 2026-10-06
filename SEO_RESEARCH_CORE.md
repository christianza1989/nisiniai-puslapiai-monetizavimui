# Treg tyrimai bendroje nišų sistemoje

2026-10-07. Versijuotas šaltinis: [niche-seo-geo-core](SKILLS/niche-seo-geo-core/SKILL.md). Modulis papildo esamą builder/planner/audit; viešo variklio SEO, schema, host ir publikavimo filtrai nesikeičia.

## Veikiantis integracijos kelias

1. Naujos nišos arba SEO atnaujinimo agentas per AGENTS / PROJECT_CONTRACT įkelia modulį. Iš BUSINESS ir dabartinio inventoriaus parenka sprendimui reikalingus Treg, GSC/GA4 ar viešus duomenis.
2. Prieš mokamus kvietimus įvertina actual endpointo rinką, kainos modifikatorius ir užduoties biudžetą. `run_plan.py` pagal nutylėjimą tik dry-run, vykdymui būtinas `--execute`. Ankstesnio audito 0,30 USD nėra visų nišų leidimas.
3. Išsaugo raw atsakymus, patikrina transporto ir actual provider/task būseną, normalizuoja reikšmes. Importuoja privatų per-site paketą bendru `content-studio/scripts/seo-research.mjs`.
4. `loadEditorialSkill` plan/draft režimuose tiesiogiai įkelia projekto modulį ir bendrus sutarties priedus. Plan mode papildomai gauna Treg/intent/GEO metodiką. Visa tai įeina į naujo job instrukcijų SHA-256; trūkstamas modulis stabdo generavimą prieš CLI.
5. `buildEditorialPrompt` įdeda tik aktyvios nišos `seoResearch`, nepaisydamas kviečiančio JSON tariamo research status. Tikrina siteId/domain/language/market, raw failų SHA ir stebėjimo aktualumą. Viena niša viename job naudoja vieną duomenų snapshot; naujas job skaito aktualų paketą iš naujo.
6. AI planas/juodraštis remiasi tinkamais stebėjimais arba įvardija tikslią nežinomybę. Semantinę faktų patikrą, savitą naudą ir publikavimo priėmimą toliau atlieka esamas redakcinis workflow. Adapterio hash ir `current` nėra faktų tiesos sertifikatas.

Tyrimų būsena: `missing`, `unverified`, `available`, `refresh_due`. Kiekvienas stebėjimas papildomai gali būti stale, unsupported_market, artifact_mismatch / unavailable ar future_observation. Null, nulis, empty ir nepavykęs matavimas nesujungiami. GEO idempotent replay nėra savarankiškas naujas atsakymas. Pirmo tiekėjo faktų neatitikimas kitam nėra pagrindas automatiškai dauginti URL.

## Agentui ir kitam kompiuteriui

`node content-studio/scripts/seo-research.mjs status <siteId> <canonicalHost> <locale>`

`node content-studio/scripts/seo-research.mjs import <siteId> <canonicalHost> <locale> <bundle.json>`

Formato ir aktualumo sutartis: [studio-integration](SKILLS/niche-seo-geo-core/references/studio-integration.md). FreshUntil nustatomas pagal konkretų duomenų tipą / sprendimą, ne universalų SEO terminą. Naujas turinys, kitas pasiūlymas, netinkama geografija ar pasibaigęs aktualumas sukelia tikslinį tyrimą. Tikra strategijos/rodiklių analizė priklauso nuo iš tiesų prijungtų paskyrų ir duomenų.

Asmeninį Codex skillą sinchronizuoja `node SKILLS/niche-seo-geo-core/scripts/sync-install.mjs`; `--check` lygina visas versijuoto skillo bylas. Studija nepriklauso nuo šio įdiegimo ar Lenovo absolute path. Kitas kompiuteris gauna modulį per Git; prisijungimas prie Treg/GSC/GA4 ir privatūs tyrimo raw failai per Git neperkeliami. Neprisijungęs agentas neįkelia provider raktų kaip sprendimo ir neapsimeta atlikęs tyrimą.

## Aktyvavimas ir ribos

Naujos užduotys naudoja naują instrukcijų versiją. Jau vykdomi job ir patvirtintos revizijos išlaiko savo snapshot. Ilgai veikiantis senos source versijos studijos serveris turi būti perkrautas vienintelio GUI/queue savininko tada, kai nėra running job; jo procesų ar write-lock negalima savavališkai nutraukti. Naujas modulis yra source/automatizavimo integracija, ne visų jau paskelbtų svetainių naujas auditas.

Per kiekvieną planavimo/SEO refresh/review vykdymą aktualumas įvertinamas iš naujo. Naujas mokamas fono crawler / periodinis monitorius neįjungtas: jam reikia konkrečios vykdymo periodikos ir išlaidų ribos. Viešas turinys, paketų schema, istorinis approval ir deployment nesikeičia nuo tyrimo failo importo.

Duomenys lieka `content-studio/data/seo-research/<siteId>/`, raw snapshot nekintamas, vieši paketai/eksportai tyrimų neįtraukia. Kaina ir realūs rezultatai fiksuojami pagal pačius kvietimus; bendro paskyros balanso pokytis nėra vieno darbo išlaidų įrodymas.
