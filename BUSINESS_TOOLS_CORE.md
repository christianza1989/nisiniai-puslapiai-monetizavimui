# Nišos verslo įrankių atranka

2026-10-08. Privaloma kuriant naują verslą ir reikšmingai keičiant jo plėtros strategiją; ne kiekvienam straipsniui. Naudoti [niche-business-tools](SKILLS/niche-business-tools/SKILL.md). Atranka apima pajamas kuriančio verslo kelią, ne vien SEO/GEO. Ši sutartis neįjungia naujų operacinių modulių pirmoje fazėje.

## Vienas nišos planas

Po BUSINESS sprendimo parengti privačios projekto saugyklos `sites/<siteId>/TOOLS.md`. Jis yra Git perduodamas planas be klientų duomenų, raktų, paskyrų identifikatorių ar žalių duomenų kopijų. Viešam turinio paketui nepriskirti. Esamų svetainių migracija atskira: nauja taisyklė nesukuria jų planų atgaline data.

Vertinti pirkėjo poreikio tyrimą, klientų paiešką ir kvalifikavimą, tiekėjų / produktų / kainų patikrą, pokalbį ir tęstinį aptarnavimą, pasiūlymą / vykdymą, analitiką, turinį bei mediją. Kiekvienai sričiai pasirinkti reikalingą priemonę arba paaiškinti „nereikia dabar“. Neužpildyti sąrašo vien dėl įrankių kiekio.

Kiekvienas kandidatas turi:

- Kliento mokamą rezultatą ir konkretų darbą; phase-one arba future ir kodėl dabar / vėliau.
- Tikslų endpoint ID, provider arba esamą core helperį; katalogo / pirminio šaltinio nuorodą, peržiūros datą ir aktualią įvesties / išvesties sutartį. Treg `catalog_search` → `catalog_get`; paieškos santrauka nėra galutinė kaina ar parametrų specifikacija.
- Reikalingas šalis, kalbas, entity/product atitikimo kriterijus ir coverage būseną. Vendor reported HTTP sėkmė, mūsų išmatuota duomenų kokybė ir nežinomas palaikymas atskiri.
- Kainos vienetą, kvotą, limitus, blogiausio bandymo sąnaudų ribą ir leidimo šaltinį; nežinomą kainą palikti nežinomą. Vienas nemokamas kvietimas negarantuoja nemokamo plano. Routed endpoint turi faktinių bandymų / miss kainą ir bendrą waterfall ribą, jei tai numato aktualus katalogas.
- Duomenų paskirtį, minimizavimą / saugojimą, teises ir esamą autorizaciją; alternatyvą be naujos prenumeratos, fallback ir sustabdymo sąlygą.
- Plėtros trigger (tikros kvalifikuotos užklausos / ekonomika / reikalinga prieiga), savininką, mažo bandymo priėmimo kriterijus ir statusą: candidate / deferred / blocked / scoped-test / verified-active. Pastarasis būtinas su tikro vykdymo įrodymais, ne katalogo aprašu.

## Atranka ir vykdymas

Treg naudoti kaip pirmą paieškos vietą išoriniams / aktualiems duomenims, kai jis prijungtas. Perskaityti aktualaus connector skill instrukcijas, bet jų bendras teiginys negali pakeisti patikrintos konkretaus endpoint sutarties. Palyginti pirmos šalies / viešus šaltinius ir esamą core. Jei Treg neprieinamas, dokumentuoti neprieinamumą, pasirinkti realų fallback arba palikti tikslų nepatikrintą kandidatą; neišgalvoti endpoint, coverage ar kainų. Katalogo discovery yra pakankamas būsimos atrankos pradžiai, ne provider bandymo įrodymas.

Prieš faktinį kvietimą atnaujinti parametrus, kainą ir budget. Skaityti konkretaus darbo autorizaciją; įtraukimas į TOOLS nesuteikia teisės išleisti pinigų, kontaktuoti trečiųjų šalių, naudoti asmens duomenų ar aktyvuoti runtime. Kai autorizacija jau yra, nedubliuoti jos klausimais. Įrankio parinkimą sieti su tikra užduotimi ir esamais siteId / tool policy vartais; neperduoti viso katalogo balso agentui.

SEO duomenys keliauja per [SEO_RESEARCH_CORE](SEO_RESEARCH_CORE.md), acquisition per [ACQUISITION_CORE](ACQUISITION_CORE.md), paštas per [MAIL_CORE](MAIL_CORE.md), agentų priėmimas per [kalibravimo skill](SKILLS/business-agent-calibration/SKILL.md). Ši atranka yra planas; automatinio verslo tool provisioner ar naujo router čia nėra.

## Priėmimas ir patirties grąžinimas

Patikrinti, kad planas atitinka BUSINESS ir dabartinę fazę, turi konkrečius šaltinius bei nežinomybės / kaina / fallback / testas / trigger laukus. Jei naujo bendro helperio ar skill reikia dėl praktinio defekto, naudoti [CORE_IMPROVEMENT](CORE_IMPROVEMENT.md) ir bendrą upgrade įrašą; vien kandidato sąrašas nėra autonominio pagerėjimo įrodymas.

Išsaugotas [katalogo pavyzdys](core-improvements/examples/treg-selection-2026-10-08.md) parodo tiekėjo ir duomenų atranką. Jis nėra visoms nišoms privalomas įrankių komplektas.
