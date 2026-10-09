# Madbeauty: teikėjų prisijungimo pilotas

2026-10-10. Savininkas pasirinko Madbeauty kaip pirmą būsimos bendros acquisition sistemos bandymą. Šiame dokumente planuojame; kampanija neįjungta. [Core roadmap](../../agent-business-core/acquisition-plan/ROADMAP.md), [architektūra](../../agent-business-core/acquisition-plan/ARCHITECTURE.md), [įrankiai](TOOLS.md).

## Tikslas ir pasiūlymas

Agentas ieško tinkamų grožio paslaugų teikėjų, kuriems gali būti naudingas prisijungimas prie Madbeauty, ir fiksuoja jų tikrą atsakymą. Viešai rastas verslas yra kandidatas, ne žmogus, kuris jau nori prisijungti.

Savininko 2026-10-10 patikslinimas: platforma apims visas grožio paslaugas; ankstesnis nagų paslaugų fokusas [BUSINESS](BUSINESS.md) pasenęs. Ieškome įvairių grožio sričių meistrų ir salonų. Tikslų paslaugų sąrašą sinchronizuoti su aktualiu platformos katalogu, ne išgalvoti iš seno aprašo. Siūloma pirmoji geografinė banga — Vilnius, bet visos platformos grožio kategorijos. Paieškos ir ataskaitų segmentas `paslauga × vietovė`, kad matytume kurioms kategorijoms pasiūlymas veikia. Rolė `provider`, tikslas `provider_signup`. Klientų vizitų paieška yra atskira vėlesnė kampanija, kuriai reikės realios pasiūlos.

Dabartinis verslo pasiūlymas: nemokamas piloto profilis ir naudojimas, platformos komisinis 0 €. Procedūros mokėjimas teikėjui nėra Madbeauty pajamos. Nežadėti klientų skaičiaus, papildomų pajamų, reitingo ar patvirtinto vizito. Būsimo premium kainos ir funkcijos nepridedamos prie kvietimo. Prieš siuntimą patvirtinti aktualų pasiūlymą ir tikrai hosted veikiančias profilio / registracijos funkcijas.

CTA: vienas realus žingsnis — susipažinti su piloto sąlygomis ir pradėti teikėjo registraciją arba atsakyti, ar domina. Konkreti registracijos URL įrašoma tik po veikiančio hosted kelio patikros. Agentas negali sukurti ir paviešinti teikėjo profilio ar jo darbų nuotraukų be teikėjo veiksmų ir teisių patvirtinimo.

## Kampanijos profilis (projektinė konfigūracija)

| Laukas | Siūloma reikšmė |
|---|---|
| site_id / objective / role | madbeauty / provider_signup / provider |
| enabled / pradinis mode | false / research_only |
| geography / categories / language | Pirma siūloma banga Vilnius, LT / visos aktualaus platformos katalogo grožio kategorijos / lt |
| schedule | Darbo dienomis 09:00 Europe/Vilnius; due koordinatorius kas 5 min. |
| primary discovery | Treg serper.web.search → oficialaus šaltinio patikra |
| initial reviewed candidates | Iki 10 naujų kandidatų per darbo dieną |
| first send wave | Iki 5 konkrečiai peržiūrėtų ir tinkamų gavėjų per darbo dieną |
| follow-up | Išjungtas; galimas atskiras patvirtintas vienas priminimas po piloto peržiūros |
| offer / CTA | Patvirtinta versija ir veikiantis hosted URL; kol nėra — send denied |
| cost cap | Įrašomas prieš paid discovery/model run; nenurodytas limitas blokuoja mokamą run |

Skaičiai yra siūlomi eksperimento darbo limitai, ne tiekėjų saugios kvotos ar prognozuojamas rezultatas. Vienas kontaktas neturi būti kartojamas, kad užpildytume dienos limitą.

## Atranka ir kontaktavimo kelias

Tyrėjas turi patvirtinti tikrą grožio paslaugą, jos atitikmenį aktualiame platformos kataloge, pasirinktos bangos vietovę, veikiančią organizaciją/profilį, originalų šaltinį ir kontaktą. Kelių paslaugų salonas yra viena organizacija su keliomis kategorijomis, ne keli atskirai kontaktuojami leads. Išsaugomas aiškus „kodėl šis teikėjas tinka“; negalima iš reklamos ar aktyvios svetainės daryti išvados, kad teikėjui trūksta klientų.

Juridinis salonas su tinkamai pagrįstu kanalu gali patekti į peržiūrimą kontaktavimo eilę, jei tai leidžia aktuali politika ir transportas. Savarankiškas meistras / fizinis asmuo ar nežinomas statusas lieka tyrimo/juodraščio stadijoje iki tinkamo sutikimo/pagrindo. Alternatyva: taisyklių leidžiamas bendras kvietimas profesinėje bendruomenėje, savanoriška registracija ir sutiktas follow-up. Nebandyti apeiti ribojimų siųsdami tą pačią reklamą socialiniu DM. [Teisiniai ir transporto vartai](../../agent-business-core/acquisition-plan/ARCHITECTURE.md#6-siuntimas-atsakymai-ir-teisė-kontaktuoti).

Nepatenka į pirmą bangą: vien grožio priemonių parduotuvės, mokymų pardavėjai be realios platformoje palaikomos grožio paslaugos, kitos bangos miesto teikėjai, nebeveikiantys salonai, duplikatai, jau atsisakę, nežinomo contact policy gavėjai. Jokio privataus grupės narių sąrašo rinkimo.

Juodraščio forma: aiškiai kas rašo ir kas yra Madbeauty; vienas patikrintas tinkamumo faktas; tikras nemokamo piloto pasiūlymas; vienas CTA; lengvas nemokamas atsisakymas. Trūkstant fakto nekurti „pastebėjome jūsų puikius darbus“ ar kitokio išgalvoto personalizavimo. Savininkas priima pirmos bangos konkrečius gavėjus ir tekstus operatoriaus GUI.

## Piloto seka

1. **Synthetic:** visas core kelias su fiktyviu teikėju, capture transportu ir registracijos callback. Atlikti role ir tenant patikras.
2. **Discovery P1:** siūlomas mažas iki 10 paieškos užklausų bandymas ir 20 unikalių kandidatų rankinė patikra, užklausas paskirstant skirtingoms aktualaus katalogo grožio kategorijoms. Šis mažas bandymas neįrodo kiekvienos kategorijos aprėpties; likusios sistemingai tikrinamos kitose bangose. Mokamos užklausos tik su konkrečia sąmata. Priėmimas: bent 80% atitinka užklausos kategoriją ir miestą, 100% priimtų turi pirminį šaltinį; zero-match ir netikri kontaktai atmetami. Neprilyginti 20 kandidatų 20 kontaktuojamų gavėjų.
3. **Owner inbox:** tik savininko valdomas testinis adresas; tikras gavimas, reply, opt-out ir CTA→profilis. Patikrinti telefoną ir desktop, registracijos laiško pristatymą bei teikėjo teises.
4. **Kontroliuojama P2 banga:** po M9 ir visų vartų iki 5 tinkamų peržiūrėtų gavėjų per dieną; jei tinkamo kanalo nėra, opt-in bendruomenės kelias. Kasdien review, pirmą savaitę jokio automatinio follow-up ar mastelio didinimo.
5. **4–6 savaičių vertinimas:** pasiūlymo, auditorijos ir onboarding kliūčių analizė pagal kategoriją ir vietovę. Tik po jos spręsti dėl automatinių patvirtinimų, bangų apimties ir kitų miestų; visų grožio kategorijų palaikymas yra pradinė produkto apimtis.

## Kaip vertinsime naudą

| Metrika | Apibrėžimas |
|---|---|
| Kvalifikuoti kandidatai | Tikra tinkama paslauga/vieta su įrodymu; ne SERP eilučių kiekis |
| Kontaktavimo tinkamumas | Kiek kandidatų turi patvirtintą gavėjo/kanalo pagrindą |
| Pristatyti kvietimai | Transporto receipt ir žinomas delivery status; uncertain atskirai |
| Susidomėjimas | Tikras teikėjo atsakymas / savanoriškas veiksmas; OOO nėra susidomėjimas |
| Patvirtinta paskyra | Tikras teikėjas užbaigia account verification |
| Aktyvus profilis | Patvirtintas teikėjas, tikros paslaugos ir vieta, patvirtintos sąlygos / vaizdų teisės, veikiantis klientų kreipimosi kelias, dabartinis priėmimo statusas |
| 30 dienų išlaikymas | Profilis tebėra tikras/aktualus; fiksuoti teikėjo aktyvumą atskirai nuo tiesiog nepašalintos eilutės |
| Kaštas / aktyvus teikėjas | Faktinės duomenų, modelio, transporto ir operatoriaus laiko sąnaudos / aktyvuoti teikėjai |

Iš esamo ACQUISITION plano perimama **20 aktyvių tikrų profilių per 4–6 savaites** kaip bandomoji hipotezė, ne pažadas ar rinkos benchmark. Neradus pakankamai kontaktuojamų gavėjų ar silpnam atsakui pirmiausia keisti kanalą / vertės pasiūlymą, o ne masiškai didinti siuntimą. Vartotojų poreikiai, patvirtinti vizitai ir procedūrų mokėjimai matuojami kitame funnel. Nemokamo piloto pajamos iš prisijungimų 0 €; geras signup skaičius dar neįrodo būsimo premium mokėjimo.

## Stabdymas ir sprendimai

Iškart pause: skundas, netinkamai kontaktuotas gavėjas, suppression pažeidimas, tenant leak, neveikiantis CTA, pasikeitęs pasiūlymas ar biudžeto viršijimas. Submit timeout palieka attempt uncertain ir neleidžia jo pakartoti aklai. Atsisakymas uždaro gavėjo seką. Pilotinės bangos bent 2 hard bounce iš pirmų 10 submit — konservatyvus mūsų duomenų kokybės stop signalas, ne tiekėjo garantuojamas slenkstis.

Savaitinė ataskaita: funnel su vardikliais, realios sąnaudos, atsisakymo priežastys, onboarding klaidos, source kokybė, first FAIL ir pataisos. Jei 20 tinkamai pristatytų kvietimų / opt-in kontaktų nesukuria jokio susidomėjimo, sustabdyti tą variantą ir peržiūrėti pasiūlymą; nėra teiginio, kad toks imties dydis statistiškai įrodo rinkos nebuvimą. Tęsti tik kai matome realų prisijungimą, priimtiną kontaktavimo elgesį ir veikiantį onboarding.

## Prieš siuntimą dar patvirtinti

Repo dokumentai 2026-10-06 aprašo vietinį backend ir testinius profilius; jie nepatvirtina dabartinio hosted onboarding. Planavimo patikroje `https://madbeauty.lt/` ir sitemap atsakė HTTP200, tačiau tai nėra registracijos/booking kelio priėmimas. M0/M8 turi patikrinti dabartinį deployment ir registry, realų signup URL, email pristatymą, offer versiją, duomenų politiką, transporto sąlygas ir konkrečius biudžetus. Šios nežinomybės netrukdo sukurti planą, bet neleidžia paskelbti piloto jau paleistu.
