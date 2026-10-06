# Nišinių svetainių įgūdžiai

[niche-seo-geo-core](niche-seo-geo-core/SKILL.md) — 2026-10-07 bendras Treg tyrimų / SEO ir GEO matavimo modulis visoms nišoms. Tai penktas core registro įrašas (iš viso 55 skills), papildantis builder/planner/audit. Projekto Git šaltinis yra autoritetas, asmeninė Codex kopija sinchronizuojama bendru helperiu. Studija įkelia modulį tiesiogiai, su nauju instrukcijų SHA ir privačiu aktualumo / locale / raw įrodymų kontekstu. [Integracija](../SEO_RESEARCH_CORE.md) aprašo veikiančius vykdymo kelius ir aktyvavimo ribas.

[niche-site-audit](niche-site-audit/SKILL.md) — pilnas pirmos fazės A–Z auditas su checkbox katalogu, atskirais vietinės kokybės / paleidimo / veiklos kriterijais ir įrodymų scoreriu. Įdiegtas per junction į tą patį projekto šaltinį. Nurodo realius taisymus, trijų gidų/autorystės/nuorodų/schema/privatumo/užklausų patikrą; negali suteikti 10/10 praleidęs kriterijus ar nepatikrintas prieigas. Pirmas praktinis pilnas bandymas — `sites/traktoriupadangos/PHASE-1-AUDIT.md`.

Vieno sakinio domeno užduoties rezultatas aprašytas [CORE_BUILD_CONTRACT.md](../CORE_BUILD_CONTRACT.md). [Audito initializeris](niche-site-audit/scripts/init-audit.mjs) sukuria visus 85 kriterijus kaip UNVERIFIED ir išsaugo esamą auditą; [didinimo patikra](niche-site-audit/references/accessibility-verification.md) atskiria realų 200% zoom nuo siauro viewport. [AUTONOMY_BENCHMARK.md](../AUTONOMY_BENCHMARK.md) aprašo naujos sesijos pirmo rezultato fiksavimą prieš parent pataisas; bandymas dar nepradėtas.

[niche-content-planner](niche-content-planner/SKILL.md) – 2026-09-30 šiam projektui sukurtas bendras autonominio turinio tyrimo, planavimo, rašymo ir patikros skill. Jis tiesiogiai integruotas į studijos Codex CLI užduotis; jo priedai aprašo nišų skirtumus, JSON sutartį ir kokybės patikrą. Vietinis Codex skill katalogas nukreiptas į tą patį projekto šaltinį.

[niche-site-builder](niche-site-builder/SKILL.md) – 2026-09-30 sukurtas nišų svetainių kūrimo skill: Lietuvos ir užsienio portalų tyrimas, tikrų desktop/mobile puslapių peržiūra, geriausių sprendimų atranka pagal kliento poreikį, savitas dizainas, visa puslapių struktūra ir realios svetainės patikra. Jis papildo turinio planuotoją; abu privalomi atitinkamoms šio projekto užduotims pagal `AGENTS.md`. Įdiegtas į vietinį Codex per junction į šį projekto šaltinį, tad taisymai nesidubliuoja. Pirmas praktinis pritaikymas – `traktoriupadangos.lt`.

2026-09-30 builderis sustiprintas [art-direction](niche-site-builder/references/art-direction.md) procesu: atskiri konkurentų ir profesionalaus dizaino pavyzdžiai, skirtingų kompozicijų palyginimas, agento pasirinkimas, kiekvienos nišos `DESIGN.md`, vizualinė patikra atskirai nuo Lighthouse.

[impeccable](impeccable/SKILL.md) – įdiegtas Paul Bakaus dizaino skill (Apache-2.0), užfiksuotas commit ir vietiniai pakeitimai saugomi `impeccable/UPSTREAM.json`. [Projekto adaptacija](impeccable/PROJECT_ADAPTATION.md) suderina originalų interaktyvų procesą su savininko deleguotais sprendimais ir atskirų domenų core. Įdiegtas Codex per junction; automatiniai redagavimo hooks neįdiegti. Tyrimas, alternatyvos ir patikros: [dizaino įrankių tyrimas](../research/design-tools-2026-09-30/README.md).

## Importuotas rinkinys

2026-10-01 suderinti **visi 52 projekto skills**: 4 pagrindiniai, 20 pirmos fazės pagalbiniai, 11 verslo operacijų ir 17 failų/artefaktų įrankių. Viena [projekto sutartis](PROJECT_CONTRACT.md) apibrėžia kontaktus, autonomiją, fazes, faktų šaltinius, mediją ir publikavimą. [catalog.json](catalog.json) saugo paskirtį, šaltinį, originalo hash ir aktyvaus įrašo hash. Keturi pagrindiniai skills lieka įdiegti per esamus junction; 48 pagalbiniai neįdiegti masiškai ir nekraunami į kiekvieną Codex CLI užduotį.

Patikros komanda iš projekto root: `node SKILLS/scripts/audit-skills.mjs`. Ji tikrina visą registrą, tikrus SKILL/PROMPT/priedų ryšius, originalų nekintamumą, Windows UTF-8 struktūros validatorius ir discovery kopijas. Tai instrukcijų/config patikra, ne naujos svetainės ar modelio elgesio 10/10 testas. Išvados ir vykdymo įrodymai: [skills auditas](../research/skills-audit-2026-10-01/README.md).

Bendras vaizdų kelias: [MEDIA_CORE.md](../MEDIA_CORE.md). [Media workflow ir promptas](niche-content-planner/references/media-workflow.md) įtraukiamas į kiekvieną studijos planavimo ir rašymo Codex CLI užduotį bei jos SHA-256. Builderis ir auditas remiasi tuo pačiu importu/rendereriu; naujai nišai atskiro resize skripto nereikia. GUI/HTTP/agentų importas patikrintas izoliuotais testais ir realiu GUI bandymu.

Šaltinis: https://www.aiagentslibrary.com/skills/chatgpt/
Surinkimo data: 2026-09-26

48 importuotos kilmės skills dabar turi projektui pritaikytus entrypoint ir prompt. Kiekvienas jų aplankas saugo:

- `SKILL.md` — konkrečiam mūsų projekto darbui pritaikyta vykdoma instrukcija.
- `PROMPT.md` — tas pats projekto workflow, ne prieštaraujantis senas interviu promptas.
- `SOURCE_SKILL.md` / `SOURCE_PROMPT.md` — tikslūs 96 originalių failų baitai, išsaugoti kilmei ir palyginimui. 43 originalūs skills buvo viešo SKILL.md kopijos, 5 — vietiniai paketai iš viešo prompto. Archyvų nurodymai savaime netampa vykdymo instrukcijomis.

`index.csv` apima visus 52, įskaitant anksčiau neįrašytą niche-site-audit. Jame atskirti dabartinis project-adapted įrašas, pradinė kilmė, projekto paskirtis ir šaltinio archyvas. Trys originalūs projekto skills yra local-project, Impeccable — pinned-upstream-adapted; licencija ir upstream commit išlaikyti. Pašto/CRM/proposal/presentation helpers nereikalauja tokių sistemų kuriant naują nišą ir neįgalina siuntimo ar mokamų paslaugų.
