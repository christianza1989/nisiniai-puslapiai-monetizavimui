# Balso sistemos sąnaudos ir eksploatavimas

Data 2026-09-30. Kainos patikrintos viešoje dokumentacijoje; faktinių paskyros sąskaitų ar tikrų šios sistemos pokalbių dar nėra. Skaičiavimai USD, be PVM, valiutos konversijos, infrastruktūros, medijos, pašto ir SMS. Toliau pateikti naudojimo dydžiai yra planavimo prielaidos.

## Patikrinta modelių kainodara

| Modelis ir tipas | USD už 1 mln. tokenų |
| --- | ---: |
| 3.8 Live teksto įvestis | 0.75 |
| 3.8 Live garso įvestis | 3.00 |
| 3.8 Live teksto išvestis | 4.50 |
| 3.8 Live garso išvestis | 12.00 |
| 3.8 Flash įvestis iki 2026-12-31 | 0.75 |
| 3.8 Flash išvestis su thinking iki 2026-12-31 | 3.75 |
| 3.8 Flash įvestis nuo 2027-01-01 | 1.50 |
| 3.8 Flash išvestis nuo 2027-01-01 | 7.50 |

[Google kainodara](https://ai.google.dev/gemini-api/docs/pricing). Šie tarifai yra Developer API; kito produkto tarifai neturi būti perimami automatiškai.

Google Live billing aprašyme nurodoma, kad aktyvios sesijos istorija apmokestinama pakartotinai per turnus. Transkripcijos tekstas turi papildomą teksto išvesties kainą. Proactive audio įvestis apmokestinama modeliui klausantis; tylos negalima laikyti garantuotai nemokama. [Live billing praktika](https://ai.google.dev/gemini-api/docs/live-api/best-practices).

Todėl $/garso minutę perskaičiavimas nėra visa skambučio kaina. Ilgas pradinis promptas ir daug trumpo dialogo turnų gali kainuoti daugiau, nors pokalbio trukmė ta pati. Sąnaudas fiksuojame pagal provider usage, ne vien garso failo trukmę.

## Skaičiavimo sutartis

```text
C_live = 0.75 * billed_text_input / 1e6
       + 3.00 * billed_audio_input / 1e6
       + 4.50 * billed_text_output / 1e6
       + 12.00 * billed_audio_output / 1e6

C_post = 0.75 * post_input / 1e6
       + 3.75 * post_output_including_thinking / 1e6

C_total = C_live + C_post + media + compute + storage + delivery + tools
```

`billed_audio_input` jau apima tiekėjo apmokestinamą pakartotinę istoriją. Kai usage jau sukauptas, prie jo negalima dar kartą pridėti teorinio istorijos koeficiento. Adapterio bandymas turi nustatyti, kurie usage įvykiai yra cumulative, o kurie incremental; reconnect metu įvykius deduplikuoti.

## Penkių minučių pokalbio scenarijai

Visuose trijuose pavyzdžiuose darome prielaidą apie 40 000 apmokestintų Live teksto įvesties tokenų, 1 200 teksto išvesties tokenų, 3 000 naujos garso išvesties tokenų ir bendrą post-call naudojimą 8 000 įvesties bei 1 500 išvesties tokenų. Keičiamas tik apmokestintas garso įvesties kiekis. Tai hipotetinės usage suvestinės, ne benchmarkas ar garantuota tokios trukmės kaina.

| Scenarijus | Apmokestinta garso įvestis | Bendra modelių kaina |
| --- | ---: | ---: |
| Mažesnė aktyvi istorija | 15 000 tokenų | $0.128025 |
| Vidutinė aktyvi istorija | 50 000 tokenų | $0.233025 |
| Didesnė aktyvi istorija | 100 000 tokenų | $0.383025 |

Post-call dalis yra $0.011625. Nuo 2027-01-01 tame pačiame pavyzdyje ji būtų $0.02325 pagal paskelbtus Flash tarifus; Live ateities kainos čia neprognozuojamos.

| Pokalbių per mėnesį | Mažesnis scenarijus | Vidutinis scenarijus | Didesnis scenarijus |
| --- | ---: | ---: | ---: |
| 300 | $38.41 | $69.91 | $114.91 |
| 1 000 | $128.03 | $233.03 | $383.03 |
| 3 000 | $384.08 | $699.08 | $1 149.08 |

Tai tik modelių dalis. 30 nišų nepadaugina sąnaudų savaime: išlaidas didina tikras naudojimas, vienalaikiai skambučiai ir integracijos. Kelias iki komercinio įjungimo turi apimti bent skirtingo ilgio, turnų skaičiaus ir tool scenarijų usage palyginimą su sąskaita.

USD sumos lentelėje apvalintos iki centų pagal ROUND_HALF_UP. Vidiniam naudojimo sutikrinimui saugoma didesnė dešimtainė precizika, kad apvalinimas kiekvieno tokeno ar įvykio lygiu nesukurtų paklaidos.

## Infrastruktūra ir medija

Ankstesnės modelių lentelės yra bazinio Live ir post-call kelio scenarijai. Pasirenkamas Jev, išankstinė paieška, specialistiniai Flash kvietimai, kiekvieno pokalbio QualityReview ir kandidatų audio regresijos prideda sąnaudų. Skaičiuoti visą užduotį: `calls × reviews + routed_requests × router_cost + specialists + candidate_evaluations`, kartu su medija ir workeriais. Jev kainos iš L2 seno provider piloto neperkelti į būsimą TypeSafe sutartį; tikrinti pasirinkto adapterio usage ir sąskaitą prieš aktyvavimą.

Savikalibracijai skirti atskirą per-business/global dienos biudžetą, ribą kandidatų kiekiui ir maksimalų rollout dydį. Jei vertinimo biudžetas išnaudotas, quality job lieka patvarioje eilėje, o nauja versija neaktyvuojama. Tai nestabdo leidžiamo bazinio kliento aptarnavimo, kol jo veikimui pakanka atskiro biudžeto. Fono užduotys neatleidžia nuo realių išlaidų apskaitos.

LiveKit viešoje kainodaroje Ship plano bazė yra $50/mėn., Scale — $500/mėn. Agent hosting, medijos transportas, inference, papildomos minutės ir regionų funkcijos yra atskiros plano dalys; negalima pavadinti bazinės kainos visos sistemos kaina. [LiveKit kainodara](https://livekit.com/pricing).

Pasirinkus savo Python voice workerį ir tiesioginę Gemini API, Gemini neperkamas dar kartą per LiveKit Inference. Tačiau lieka LiveKit transporto ir savo worker infrastruktūros sąnaudos. Jei agentas hostinamas LiveKit Cloud, skaičiuojama jo hosting dalis ir tikras planas. Konkrečių įskaičiuotų kvotų sąmata fiksuojama pasirenkant planą, kad nebūtų dvigubo ar trūkstamo apmokestinimo.

EU regionų pasirinkimas nėra viena universali varnelė. LiveKit dokumentacija skiria projekto duomenų regioną, agentų hosting, inference ir medijos transportą; griežtas transporto pinning turi plano reikalavimus. Išorinė tiesioginė Gemini API lieka už LiveKit regiono kontrolės ribų. [LiveKit EU duomenų valdymas](https://docs.livekit.io/deploy/admin/regions/data-residency/).

Compute ir managed PostgreSQL tiekėjo šiame darbe nepasirenkame pagal išgalvotą $/mėn. Prieš diegimą pateikiama tikra sąmata pasirinktam EU regionui, skambučio pajėgumui, kopijoms ir priežiūros režimui. Vietinis savininko kompiuteris tinkamas kūrimui, bet ne nepertraukiamam aptarnavimui.

## Apkrova ir ribojimas

Pradinės siūlomos pilotų ribos: iki 8 aktyvių pokalbių portfeliui, iki 2 vienai nišai, 15 minučių vienam skambučiui ir iki 2 vienalaikių post-call jobs. Tai konfigūracijos pasiūlymas, kurį reikia tikrinti pagal realias modelio bei medijos kvotas. Paskyros kvotos šiame tyrime nenuskaitytos.

Globalūs limitai, vienos nišos kvotos ir per-session biudžetas vykdomi serverio admission metu. API raktų dauginimas neišsprendžia projekto kvotos. Realios naudojimo ribos tikrinamos paskyroje. [Google rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

Prieš pokalbį rezervuojamas numatomas biudžetas ir saugi marža. Po pokalbio rezervacija suderinama su faktiniu usage. Brangūs įrankiai ir interneto paieška turi atskirą limitą. Užbaigimas ties limitu paaiškinamas klientui ir pateikiama forma; neužbaigti write veiksmai suderinami su išoriniais kvitais.

Provider usage delsa gali neleisti garantuoti tikslios piniginės ribos centų tikslumu. Dėl to derinami modelio konteksto, trukmės, veiksmų ir vienalaikių sesijų limitai. Komercinės portfelio biudžeto reikšmės turi ateiti iš savininko mandato, ne būti aktyvuotos iš šių pavyzdžių.

## Privatumas ir skaidrumas

AI disclosure turi būti matomas ir išsakytas pradžioje. Europos Komisijos gairės nurodo, kad AI Act 50 straipsnio skaidrumo taisyklės taikomos nuo 2026-08-02. [Oficialios skaidrumo gairės](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations).

Pokalbio balsas ir transkriptas gali būti asmens duomenys net prieš pateikiant kontaktą. Prieš mikrofono įjungimą nurodomi operatorius, tikslas, tvarkymo pagrindas, paslaugų teikėjai, terminai ir teisių įgyvendinimas. Atskirai sprendžiami paslaugos suteikimas, garso įrašo saugojimas, kokybės analizė ir rinkodara. Vienas bendras „sutinku su viskuo“ nėra tinkama tikslų schema. Tai projekto privatumo projektavimo kryptis pagal [BDAR](https://eur-lex.europa.eu/legal-content/EN/TXT/?qid=1463250435964&uri=CELEX%3A32016R0679), ne individuali teisinė išvada.

Rekomenduojamas pradinis saugojimo režimas: nepalikti pilno garso įrašo; išsaugoti tik reikalingą transkriptą, patvirtintus laukus ir veiksmų kvitus. Konfigūracijai siūloma transkriptą laikyti iki 30 dienų, o nebaigtą kontakto case iki 180 dienų. Šie terminai nėra teisės nustatyta norma ar jau patvirtinta operatoriaus politika. Prieš tikrą įjungimą jie pagrindžiami ir patvirtinami; be aiškaus termino retention procesas negali būti laikomas paruoštu.

Garso saugojimas QA yra pasirenkamas, aiškiai pagrįstas režimas su trumpu terminu. Vien mikrofono permission nereiškia sutikimo neribotai įrašinėti. Kito STT pakartotiniam auditui galima naudoti tik iš teisėtai saugomo įrašo; jei jo nėra, trūkstamos transkripcijos neatkuriame išgalvojimu.

Paid Gemini sąlygos nurodo nenaudoti kliento turinio produktams tobulinti, tačiau leidžia ribotą saugumo laikymą ir apdorojimą įvairiose šalyse; EEE sąlygos taip pat turi atskirą duomenų naudojimo nuostatą. Todėl nemokamos paskyros negalima automatiškai vadinti mokymo režimu, o paid negalima vadinti garantuotu EU-only ar zero retention. [Gemini sąlygos](https://ai.google.dev/gemini-api/terms), [retention paaiškinimas](https://ai.google.dev/gemini-api/docs/zdr).

Kliento prašytas atsakymas ir reklama yra atskiri produkto tikslai. Sistemos numatytas siuntimas apima vieną prašytą tęsinį; naujienlaiškiui ir nesusijusiems pasiūlymams taikomas atskiras aiškus leidimas. [VDAI rinkodaros aiškinimas](https://vdai.lrv.lt/uploads/vdai/documents/files/03_%20Lankstinukas%20Tiesiogine%20rinkodara%202020-02-20.pdf). Prieš komercinį kanalą patikrinti aktualų teisinį taikymą konkrečiai SMS, callback ar marketing eigai.

Asmens duomenys netenka vietos viešuose content paketuose, šaltinių paieškose, bendroje analitiko atmintyje ar logų tekste. Šalinimo procesas apima DB, objektus, kontaktų projekcijas ir dokumentuotą kopijų ciklą. Atsisakęs rinkodaros žmogus vis tiek gali gauti jo paprašytą paslaugos atsakymą, jei tam yra tinkamas pagrindas.

## Rodikliai ir incidentai

Skydelis rodo kiekvienos nišos pokalbių skaičių, pradėjimo ir užbaigimo dalį, tinkamas užklausas, patvirtintus kontaktus, neatsakytus klausimus, realiai atliktus veiksmus, siuntimo būsenas, sąnaudas ir tikrą sandorio rezultatą. Mygtuko paspaudimas nėra pokalbis; kontaktas nėra pardavimas.

Techniniai rodikliai: first-audio, atsakymo pradžios p50/p95, barge-in garso stabdymas, reconnect dažnis, tool delsa, transkripto coverage ir post-call trukmė. Profilių ar modelio versijas galima palyginti tik su tuo pačiu apibrėžtu scenarijų rinkiniu.

Papildomi kokybės rodikliai: klaidingi/praleisti pertraukimai, pertekliniai klausimai, poreikio korekcijos, teisingų faktinių atsakymų dalis, tikri tool rezultatai ir išspręstos kliento užduotys. Routeriui — abstention, pavojingos klasifikavimo klaidos, papildoma delsa ir visos užduoties kaina. Savikalibracijai — candidate priėmimas/atmetimas, žmogaus ir vertintojo nesutarimas, canary neblogėjimas bei rollback dažnis; nurodomas vardiklis, imties dydis ir versija.

Incidentų klasės: neteisingas tenant, išgalvotas komercinis pažadas, blogai atpažintas kritinis laukas, dubliuotas veiksmas, delivery timeout ir modelio nepasiekiamumas. Kritinė incidento klasė išjungia atitinkamą įrankį ar profilį, palikdama veikiančią įprastą formą. Prompto pataisos išbandytos staging ir gali būti grąžintos; sistema savavališkai nekeičia mandato ar vertinimo slenksčių.

## Gamybinio paleidimo vartai

- Patikrintas tikras domenu valdomas deployment ir nišos operatoriaus faktai.
- Veikiantis Gemini endpointas, kvotos, sutartis, duomenų apdorojimo ir medijos sąlygos.
- Patvarus įvykių ir kontaktų įrašymas, kopijos ir įrodytas atkūrimas.
- Tikslūs privatumo tekstai, retention ir pašalinimo eiga.
- Tikras pasirinkto kanalo e2e gavimas, ne vien autentifikacija.
- Lietuviškos ir izoliacijos scenarijų patikros, kainos bei kritinių veiksmų kontrolė.
- Atskirų nišų matavimas, limitai ir veikiančios fallback formos.

Šių faktų rinkimas reikalingas diegimo etapui; jie netrukdo dabar užbaigti projektavimo. Šiame tyrime gamybiniai vartai nepažymėti kaip atlikti.
