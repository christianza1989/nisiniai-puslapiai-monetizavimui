# Core gerinimas kuriant svetaines

2026-10-05. Savininkas autorizavo svetaines ir platformas kuriančius agentus savarankiškai gerinti bendras taisykles, skills, promptus ir core realizaciją, kai praktinis darbas parodo pagrįstą trūkumą. Tai taikoma visoms nišoms, ne tik Madbeauty. Agentas neturi apsiriboti problemos pasiūlymu root ar savininkui, jei gali pats atlikti nedidelį, patikrintą pataisymą savo užduoties ribose.

## Nuo radinio iki pataisymo

1. `sites/<siteId>/CORE_FEEDBACK.md` trumpai užrašyti problemą, ją parodantį source / bandymą / ekraną ir jos poveikį. Atskirk patirtą defektą nuo būsimos idėjos. Įvertink, ar trūkumas bendras, ar tik konkrečios nišos adapterio / dizaino / faktų problema.
2. Perskaityk actual shared realizaciją ir jos vykdymo instrukcijas. Rask vieną prižiūrimą taisyklės ar helperio šaltinį; imported SOURCE_SKILL / SOURCE_PROMPT ir istoriniai instrukcijų fingerprint yra archyvai, jų nekeisk. Vienos nišos spalvos, pasiūlymas ar asmeniniai duomenys netampa viso tinklo default.
3. Prieš bendrų failų pakeitimą patikrink WORKSTREAMS ir Git / kelių kompiuterių būseną pagal [MULTI_MACHINE](docs/MULTI_MACHINE.md). Laisvam failų langui užregistruok savo ribas ir įgyvendink pats. Jei failą valdo kitas aktyvus agentas, suderink langą esamoje autorizuotoje koordinacijoje arba palik konkrečią priklausomybę ir tęsk kitus darbus; neredaguok lygiagrečiai jo pakeitimų. Kai nėra teisės susisiekti su kita sesija, nesugalvok jos iš šios taisyklės.
4. Pataisyk nedidelę priežastį, atnaujink susijusias instrukcijas / nuorodas / esamą skill katalogo SHA, jei reikalinga. Nekurk atskiro kiekvienos nišos schedulerio, SEO ar media variklio. Didelę schemos, architektūros ar migracijos idėją palik kaip atskirą siūlomą darbą, kol suderinta priklausomybių ir failų apimtis; vien gerinimo taisyklė nėra pavedimas perrašyti sistemą.
5. Patikrink pagal pakeitimo riziką. Instrukcijoms – konfliktai su savininko tikslu, nuorodos ir skills struktūra; kodui – radinio atkūrimas / regresija bei taikomi esami testai. Keičiant viešą core – test:core ir test:seo-smoke; keičiant schemą – abu validatoriai ir e2e. Dokumentų pataisai nekartok nesusijusių runtime ar Lighthouse bandymų.
6. Feedback įraše užfiksuok pakeistus failus, source versiją / commit / PR, patikrą ir būseną: radinys / taisoma / patikrinta vietiškai / PR / sujungta / pritaikyta. Saugiai perduok shared pakeitimą per Git / scoped PR, uždaryk savo WORKSTREAMS rezervaciją. Kiti agentai ima aktualią versiją pagal bendrą sinchronizavimo tvarką; privatus pasiūlymas ar nesujungtas PR automatiškai nepakeičia jų bazės.

## Bendros ribos

Rutininė pagrįsta taisyklių ar kodo pataisa šiose ribose nereikalauja pakartotinio savininko patvirtinimo ar privalomo root vykdymo. Root gali peržiūrėti ir koordinuoti bendras priklausomybes, bet nėra kiekvienos pataisos vienintelis rašytojas. Neradęs prasmingo bendro pakeitimo, agentas taip ir pažymi – nereikia kurti dirbtinio patobulinimo kiekvienam domenui.

Pataisos nekeičia savininko verslo krypties, naujų nišų F1 ribų, autorizuotų modulių, sekretų ar klientų duomenų. Gyvos operacijos / išlaidos / deployment vertinami pagal esamą užduoties autorizaciją, ne suteikiami šio failo. Neišjungti patikrų ir nesumažinti audito / vertintuvo vartų vien tam, kad esamas rezultatas praeitų. Klaidingą patikrą galima taisyti su konkrečiu klaidos įrodymu ir nauju versijuotu bandymu; originalus FAIL ir slenksčiai lieka istorijoje.

Naujų taisyklių tekstas nėra įrodymas, kad senos svetainės jau jas atitinka. Jei reikia senų projektų migracijos ar pakartotinio priėmimo, įrašyk konkrečius paveiktus projektus ir likusį darbą, nekeisdamas istorinių PASS ar deklaruotų rezultatų. Ši darbo taisyklė nėra agent-business-core vykdančių agentų automatinio mokymosi / release promotion pakeitimas.
