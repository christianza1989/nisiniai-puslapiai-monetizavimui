# Galutinis Madbeauty turinio planas

2026-10-06–2027-04-06. Visos 21 katalogo srities, 59 grupių ir 225 procedūrų atsakymai sutikrinti su foundation commit c1f159353620aed66e9c67a95306786646c7137c. 300 naujų individualių gidų ir 3 esamų gidų atnaujinimai; 940 suplanuotų redakcinių nuorodų. Tai pilnas paslaugos supratimo / pasirinkimo planas, ne visų medicinos ir kitų plėtinių problemų enciklopedija.

- [Skaitoma interaktyvi peržiūra](MADBEAUTY-TOPICAL-AUTHORITY-PLANAS.html): visos temos, datos, H2, metaduomenys, nauda, šaltiniai ir konkretūs nuorodų tikslai.
- [PLAN.json](PLAN.json): visas autoritetingas brief; [PROCEDURE_COVERAGE.json](PROCEDURE_COVERAGE.json) — kiekvienos procedūros vardinis atsakymo skyrius.
- [KEYWORD_RESEARCH.md](KEYWORD_RESEARCH.md), [KEYWORD_DATA.json](KEYWORD_DATA.json), [SEO_MAP.json](SEO_MAP.json): realus treg / DataForSEO LT tyrimas, metaduomenys ir užklausų savininkai.
- [RESEARCH.md](RESEARCH.md), [SOURCE_LEDGER.md](SOURCE_LEDGER.md), [WRITING_PLAYBOOK.md](WRITING_PLAYBOOK.md): tyrimas, 84 perskaityti turinio šaltiniai ir nišos rašymo standartas.
- [CONTENT_SEO_HANDOFF.md](CONTENT_SEO_HANDOFF.md), [ARTICLE_CATALOGUE_TARGETS.json](ARTICLE_CATALOGUE_TARGETS.json), [PLATFORM_SCOPE.md](PLATFORM_SCOPE.md): suderinti nacionaliniai / miesto ID ir aktyvavimo ribos.
- [VALIDATION.json](VALIDATION.json): aprėpties, datų, šaltinių, grafų, metaduomenų ir transporto patikra.

Pagrindinė 296 temų aprėptis rengiama iki 2026-11-24; tai parengimo orientyras po kokybės peržiūrų. Parengtas grupes leidžiama išleisti anksčiau. Likęs pusmetis apima 4 sezonines temas ir 12 peržiūrų. Publikavimo savaitinės kvotos nėra; data nepakeičia faktinio patvirtinimo.

batches/ — 13 schema-valid V1 transporto projekcijų, daugiausia 24 įrašai vienoje. 24 yra transporto riba, ne publikavimo ritmas. V1 neperneša viso research / katalogo binding: prieš rengimą įkelti pilną master brief, susieti tikrus studijos UUID ir patikrinti plan→V2 draft→export→shadow import. Patvirtintas pradinis paketas nekeičiamas.

Atkurti: node build-plan.mjs; node write-docs.mjs; node render-plan.mjs; node verify-plan.mjs. Skriptus paleisti šio katalogo kontekste arba nurodyti visą kelią. SEO_RESEARCH_INPUT.json yra atrinkti tyrimo duomenys ir kvitai; atkūrimas nevykdo mokamų API užklausų. Žali tiekėjo atsakymai keyword-research/ lieka vietiniai ir į Git neįtraukiami. Jokie treg prieigos raktai čia nesaugomi.

Planas nesukuria viešų tekstų, originalios medijos, specialisto patvirtinimų, deployed katalogo ar Google reitingų.
