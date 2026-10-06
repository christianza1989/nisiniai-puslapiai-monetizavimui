# Turinio core faktinė patikra — 2026-10-05

Savininko klausimo patikra, ne pavedimas dabar generuoti pusmečio turinį. Skaitytas bendras niche-content-planner ir faktinis generatoriaus, modelio, GUI, public projekcijos bei Madbeauty kodas. Svetainių duomenys, patvirtinimai, eksportai, procesai ir deployment nekeisti.

## Įgyvendinta

- V1 studija: per-site planai, klasteriai, datos, privatus kalendorius ir juodraščio atidarymas. Codex CLI gauna dabartinę skill/contract versiją ir jos fingerprint. Faktų ir šaltinių patikra lieka redakcinis darbas, ne automatinė naudingumo garantija.
- `generator.mjs` pusmečio planui prašo 8–12 naujų URL; planavimo importas riboja iki 24, vienas draft-batch iki 24 tuščių puslapių. Autopilot stabdo planavimą turėdamas bent 8 būsimus įrašus ir homepage. Tai nėra individualiai nustatomos publikavimo kadencijos realizacija.
- `model.mjs` planavimo datoms numato 08:00 UTC; konkrečią ISO datą ir laiką galima redaguoti. Pastovus vietinis laikas ir vasaros/žiemos laiko kaita dar nėra savarankiškas kalendoriaus režimas.
- Patvirtinimas išsaugo nekintamą reviziją. Juodraščio pakeitimas savaime nepakeičia jau patvirtinto viešo turinio. Export apima patvirtintus, įskaitant būsimus, puslapius ir realius media failus.
- Bendro core nišos puslapio route yra dynamic/revalidate=0. Jau importuota ir įdiegta patvirtinta revizija po `publishAt` tampa prieinama užklausos metu be cron. Vietinės studijos įrašas savaime nepasiekia serverio. Google indeksavimo laikas nėra šis mechanizmas.
- `lib/niche-links.mjs` filtruoja vidines nuorodas pagal viešai tinkamus puslapių ID; paruošta nuoroda į būsimą patvirtintą tikslą atsiveria jam tapus tinkamam. Ta pati vieša projekcija naudojama puslapiams ir SEO išvestims. Ši patikra nebuvo visų svetainių HTTP/craft auditas.
- Patikrinti trečiųjų šalių HTTPS šaltiniai patvirtinami redakciškai. Tinklo tikslai papildomai reikalauja realaus deploy ir patikros; actual `networkLiveDomains` tuščias. All-to-all nėra.
- Medijos importas bendras, WebP variantai automatiniai. Built-in ImageGen generavimas ir vaizdo peržiūra yra atskiras agento veiksmas; tekstinis autopilot savaime jų nevykdo. GUI ImageGen CLI reikalauja atskiro OPENAI_API_KEY.

## Neužbaigti kelio segmentai

1. Generatorius `draftPage` į `links` įtraukia tik tuo metu patvirtintus tikslus. Kiti lieka `linkSuggestions`. Vien vėlesnis tikslo patvirtinimas jų neperkelia į šaltinio patvirtintą reviziją. Reikia redakcinio ryšių užbaigimo prieš paketo patvirtinimą arba naujos peržiūrėtos šaltinio revizijos; runtime neturi savavališkai perrašyti patvirtinto teksto.
2. Autopilot baigiasi juodraščiu. Šaltinių/teiginių peržiūra, actual vaizdai, link graph užbaigimas, approval, export/import/build/deploy nėra vieno pilnai autonominio workflow dalis. Redakcinę peržiūrą gali atlikti agentas; savininkui nereikia planuoti ar rankomis tikrinti kiekvieno straipsnio.
3. V2 plan/draft/autopilot generatorius aiškiai išjungtas iki priimto generavimo kontrakto. V2 redagavimo/importo ir projekcijos testų PASS nėra veikiančio V2 generatoriaus įrodymas.
4. Madbeauty neturi `content-studio/data/sites/madbeauty.json`. Trys dabartiniai gidai yra `sites/madbeauty/prototype/public/content.mjs`; jie neturi bendro planavimo/publikavimo adapterio. Service/city CTA resolver, studijos papildomi paslaugų laukai ir shared SSR/SEO integracija dokumentuoti planuose, tačiau šis kelias nepriimtas. Vietinis preview noindex, ne production SEO.
5. CLI skill perdavimo testai neįrodo live Codex tyrimo prieigos, šaltinių tikrumo ar tekstų kokybės. Prieš pusmečio užduoties priėmimą būtinas realus vieno straipsnio viso kelio bandymas, tada paketo patikra.

## Patikros įrodymai

- `node --test content-studio/test/core.test.mjs content-studio/test/network-links.test.mjs content-studio/test/editorial-skill.test.mjs`: 11/11 PASS, 953.7594 ms. Izoliuotos testų būsenos; realių studijos įrašų nekeičia.
- Viešame core `node --test tests/content-package.test.mjs tests/niche-links.test.mjs tests/content-projection-v2.test.mjs`: 14/14 PASS, 192.0092 ms. Patvirtintos revizijos, laiko/nuorodų/tinklo vartų sintetinės patikros; ne live deployment ar visas Madbeauty kelias.

## Siūlomas Madbeauty priėmimo bandymas

Registruotas siteId → vieno gido brief su realiais service/catalog ID → draft ir realūs responsive assets → šaltinių/faktų/CTA/link graph agento peržiūra → approved revision → private import/admission → prieš/po `publishAt` HTML + guide index + contextual/related links + Article/schema + sitemap + LLM išvesčių sutapimas. Future/revoked/missing target ir išjungti demo duomenys tikrinami neigiamais atvejais. Pusmečio turinys generuojamas tik priėmus šį adapterį ir pasirinktą kadenciją; plano išsamumas nėra veikimo įrodymas.

## Vėlesnis tos pačios dienos įgyvendinimas

Šis dokumentas išsaugo pradinio klausimo auditą. Bendros jo aptiktos scheduling/link-finalization/review/release spragos vėliau taisytos [CONTENT_CORE](../CONTENT_CORE.md) inkrementu; actual priėmimas [QA](../research/content-core-2026-10-05/ACCEPTANCE.md). V2 generatoriaus OFF, tikros media peržiūros ir Madbeauty adapterio/deployment ribos lieka. Pradinis audit snapshot atgaline data nepagražintas.
