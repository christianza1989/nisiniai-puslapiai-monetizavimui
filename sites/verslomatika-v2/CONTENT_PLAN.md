# Verslomatika V2 svetainės struktūra ir turinio planas

Atnaujinta 2026 m. spalio 23 d. Projektą valdo [tiesioginiai Verslomatikos susitarimai](antigravity/PROJECT_RULES.md); bendri kitų nišų core apimties ir etapų ribojimai netaikomi. Rinka – Lietuva, kalba – lietuvių, kalendoriaus laiko juosta – Europe/Vilnius.

Tai vienas įgyvendinimui skirtas redakcinis pagrindas: svetainės paskirtis, 75 inventoriaus įrašai, puslapių struktūros, 16 straipsnių užduočių, ryšiai ir publikavimo datos. Jis pakeičia ankstesnius tarpusavyje prieštaraujančius Gemini planų variantus. Codex parengia architektūrą, tyrimo duomenis ir rašymo užduotis. Antigravity / Gemini atlieka kiekvieno puslapio interneto tyrimą ir parašo visą galutinį turinį. Pilnas perdavimas – [Antigravity pradžios dokumente](antigravity/START_HERE.md).

Savininko patvirtinta apimtis – pilna „Verslomatika V2“ sistema. Turinys pristato agentų pasirinkimą, įmonės kontekstą, įrankius ir jų darbo grandines. Viešas tekstas rašomas veikiančio produkto kalba. Straipsnių programos data ir vidinis įrodymų registras nėra produkto raidos etapo aprašas.

Planą sudaro **74 konkretūs URL ir vienas agento profilio šablonas**. Pradinėje grupėje T0 yra **58 konkretūs URL**; vėliau suplanuoti 16 straipsnių. /agentai/{slug}/ yra šablono žymuo, o ne publikuojamas adresas. Konkretūs agentų profiliai atsiranda tik pagal tikrą katalogo manifestą ir turi savo turinį bei peržiūrą.

JSON priedas content-plan.json yra redakcinis duomenų failas, skirtas patikrai ir perdavimui. Tai nėra core importo schema ar patvirtintas viešas turinio paketas. Tikrieji siteId ir pageId susiejami su tikra studijos būsena prieš bet kokį importą.

## Produkto žinutė ir komercinis kelias

Pagrindinė žinutė: **Verslo procesų automatizavimas su DI agentais.** Paaiškinimas: pasirinkite agentus, suteikite jiems įmonės kontekstą, prijunkite reikalingus įrankius ir sujunkite darbus į valdomą procesą.

Agentų apimtis nesusiaurinama iki dabartinių demonstracijų ar vienos komandos. agency-agents vaidmuo, vykdymo modelis, įrankių prieigos ir verslo taisyklės yra atskiri sistemos elementai. Profilio instrukcija savaime nesuteikia prieigos prie kliento pašto, CRM, finansų ar infrastruktūros.

Pagrindinis kelias: skaitytojo problema → tinkamas sprendimas → agentas arba komanda → reikalinga integracija → darbas V2 sistemoje. Vieši mygtukai veda į tikras V2 funkcijas, susietas su faktiniu programos maršrutu. Šiame plane programos API adresai neišgalvojami.

Komercinis puslapis /kainodara/ paaiškina kainos sudėtį ir individualaus proceso vertinimą. Fiksuoti planai, žetonų antkainiai, nemokamas bandymas, SLA ir reakcijos laikas skelbiami tik pagal realias komercines sąlygas. Kol skaičių nėra, tekstas gali aiškiai kviesti „Aptarti automatizavimo apimtį“, nežadėdamas konkretaus tarifo.

Operatorius – MB Pinet, numatytas kontaktas – info@pinet.lt. info@verslomatika.lt pakeičia jį tik patikrinus veikimą. Nekopijuojami kitų nišų telefonai, adresai, atsiliepimai ar įmonių kodai. Autorių ir redakcinės atsakomybės informaciją galima pateikti /apie-mus/; fiktyvus ekspertas ar naujas tuščias profilio URL nereikalingas.

## Agentų kūrėjas

**Paskirtis:** vartotojas aprašo norimą darbą, o sistema parengia jam agentą arba agentų komandą. Tai atskira pilno produkto funkcija, papildanti agentų katalogą ir darbų koordinatorių. Ji įtraukta į šį turinio planą po 2026 m. spalio 23 d. klausimo apie Invent; atskiras jos įgyvendinimas peržiūrėtame vietiniame V2 šaltinyje nepatvirtintas.

Koordinatorius paskirsto darbą turimiems agentams. Agentų kūrėjas parengia arba pritaiko patį agento aprašą: jo užduotį, įvestį, rezultatą, įrankius, taisykles, bandymus ir vietą komandoje. Instrukcijų pataisos tikrinimas yra svarbi to dalis, tačiau ne visas kūrimo procesas.

[Relevance AI Invent](https://relevanceai.com/invent) savo produkto puslapyje aprašo poreikio išgryninimą, sistemų prijungimą, specialistų komandos sudarymą, veikimo kriterijus, kokybės stebėjimą, tobulinimą ir verslo poveikio vertinimą. Tai jų pristatoma funkcija; jų pavyzdžių rodikliai ir teiginiai neperkeliami į Verslomatikos rezultatus.

### Funkcijos kelias

1. Iš vartotojo aprašymo išskirti norimą rezultatą, darbo pradžios įvykį, reikalingus duomenis ir sprendimo ribas. Išnaudoti jau žinomą verslo kontekstą, nekartojant nereikalingo klausimyno.
2. Patikrinti, ar tinka esamas agency-agents profilis. Jį pritaikyti verslui arba parengti savitą versijuotą vaidmenį, kai turimi profiliai neatsako į poreikį. Naujai rolei neišgalvoti tariamo upstream failo.
3. Parinkti rezultatui tinkamą modelį, įvesties ir išvesties struktūrą, žinių šaltinius ir tikrus prieinamus įrankius. Trūkstamai jungčiai gali būti parengiamas adapterio ir jo bandymų kandidatas; sukurtas kodas dar nėra aktyvi integracija.
4. Nustatyti teises, veiksmų ir išlaidų ribas, paleidimo sąlygas, klaidų kelią bei ryšius su kitais agentais. Naudoti esamą vykdymo ir integracijų registrą.
5. Parengti reprezentatyvius bandymus, išbandyti pradinį variantą, taisyti nustatytas priežastis ir palyginti naują versiją su atskirais apsaugotais atvejais. Vieno gero atsakymo nepakanka agentui priimti.
6. Tikslų patikrintą variantą užregistruoti ir aktyvuoti per tą patį Engine, Store ir versijos priėmimo kelią. Kūrėjo sugeneruotas tekstas pats sau nesuteikia išorinių veiksmų teisių.
7. Stebėti užbaigtus darbus ir vartotojo pataisas, siūlyti patikrinamą naują versiją bei išlaikyti grąžinimą. Tobulinimas nereiškia slapto modelio svorių mokymo.

### Puslapis ir susiejimas su svetaine

**Naujas URL:** /agentu-kurejas/. Jis atsako į savarankišką klausimą „Kaip sukurti savo DI agentą pagal darbo aprašymą?“. /kaip-veikia/ aiškina visą sistemą, /agentai/ leidžia rinktis paruoštus profilius, o šis puslapis paaiškina naujo arba pritaikyto agento sukūrimą ir jo priėmimą. Paieškos frazė „DI agentų kūrimas pagal aprašymą“ yra ketinimo hipotezė, o ne pamatuota paklausa.

Sekcijos: darbo aprašymas → ką kūrėjas paruošia → esamo profilio pritaikymas arba nauja rolė → įrankiai ir komanda → bandymų bei priėmimo rezultatas → darbas ir tobulinimas → tikras veiksmas V2. Pirminis veiksmas – „Sukurti agentą pagal savo užduotį“; realizuojant jis susiejamas su veikiančiu kūrėjo maršrutu. Savos neveikiančios programos nuorodos šiame plane nekuriamos.

Pagrindiniame puslapyje atsiranda kelias „Aprašykite, ką norite automatizuoti“. /kaip-veikia/ atskiria „pasirinkti paruoštą“ ir „sukurti pagal poreikį“. Agentų meniu turi nuorodą „Agentų kūrėjas“. /darbo-grandines/ parodo, kaip kūrėjas sujungia specialistus. /kokybes-kontrole/ paaiškina naujo agento bandymus, prieigas ir versijų grąžinimą. /pagalba/ pateikia tikrą kūrimo bei redagavimo eigą.

Turinio priėmimas reikalauja parodyti vientisą pavyzdį: darbo aprašymas → sukurtas agento aprašas → įrankių susiejimas → bandymo klaida → pataisa → priimta tiksli versija → vienas tikras darbo rezultatas. Katalogo importas ar koordinatoriaus paskyrimas šio pavyzdžio nepakeičia. Papildomas straipsnis apie kūrimą vėliau planuojamas tik radus atskirą mokomąjį klausimą; S1–S16 grafikas dėl šio puslapio nedauginamas.

## Navigacija ir lankytojų keliai

Viršutinė navigacija: **Sprendimai**, **Agentai ir komandos**, **Integracijos**, **Žinių centras**, **Kainodara**. Sprendimų meniu pateikia visas 16 funkcijų ir nuorodą į industrijas. Agentų meniu jungia katalogą, komandas ir darbo grandines. Žinių centre randami pagrindiniai gidai, straipsniai, palyginimai bei ištekliai.

„Prisijungti“ ir veiksmas „Pradėti automatizavimą“ susiejami su tikrais V2 maršrutais. Komercinės konsultacijos kelias veda į /kontaktai/. Neveikiantis prisijungimas ar demonstracija nekeičiami laukiančiųjų sąrašu.

Poraštėje: kontaktai, apie mus, pagalba, kokybės kontrolė, privatumas ir sąlygos, taip pat prasmingos pagrindinių turinio grupių nuorodos. Ilgose navigacijose nesikartoja visų puslapių sąrašas.

Lankytojo keliai:

1. Vadovas atpažįsta problemą pagrindiniame puslapyje, palygina sprendimą ir pereina į V2 arba aptaria diegimą.
2. Specialistas iš paieškos patenka į praktinį straipsnį, pasinaudoja jame pateiktu pavyzdžiu ir randa tinkamą agentą, komandą ar integraciją.
3. Techninis vertintojas skaito /kaip-veikia/, /darbo-grandines/ ir /kokybes-kontrole/, tada įvertina konkrečius duomenų srautus.
4. Industrijos puslapis paaiškina visą pasirinktos veiklos procesą ir susieja kelias funkcijas; jo turinys nėra sprendimo puslapio kopija su pakeistu sektoriaus pavadinimu.

## Puslapių struktūros

Kiekviena šeima turi bendrą struktūrą, bet tekstas atsako į jos konkretų klausimą. Šablonas nenustato žodžių, DUK ar nuorodų kvotos.

| Šeima | Sekcijos ir rezultatas |
| --- | --- |
| Pagrindinis puslapis | Aiški žinutė ir veiksmas → poreikio atpažinimas → kaip veikia agentas, įrankiai ir grandinė → paruoštos komandos → integracijos → kontrolė → aktualus viešas turinys → kitas žingsnis. Žurnalą ar sutaupymo rezultatą rodyti tik su tikra kilme; iliustraciją taip ir įvardyti. |
| Produkto ir architektūros gidai | Sąvoka ir proceso modelis → įvestis, būsena ir rezultatas → įrankių teisės → klaidos, kartojimo ribos ir perdavimas žmogui → praktinis scenarijus → susiję sprendimai. DAG vartoti tik acikliniam grafui, o taisymo ciklus paaiškinti atskirai. |
| Agento profilis | Tikras repo profilis ir šaltinio versija → darbo paskirtis → įvestis ir rezultatas → reikalingi įrankiai bei taisyklės → vieta komandoje → patikrintas arba aiškiai iliustracinis pavyzdys → tikras V2 veiksmas. |
| Agentų komanda | Proceso tikslas → realūs vaidmenys ir atsakomybės → darbų seka → kokybės bei patvirtinimo taškai → išimtys ir rezultatas → paleidimo arba pritaikymo kelias. Agentų skaičius priklauso nuo darbo. |
| Komercinis sprendimas | Problema ir kam tinka → gaunamas rezultatas → darbo eiga → agentai, duomenys ir integracijos → išimtys ir kontrolė → sąnaudų veiksniai → praktiniai gidai → tikras kitas veiksmas. |
| Industrija | Sektoriui būdingas procesas → duomenų ir sistemų skirtumai → keli susiję sprendimai → specifinės išimtys → diegimo ir poveikio vertinimas. Medicinos ir grožio puslapyje aprašomas administravimas; klinikinių išvadų ar vienodos duomenų rizikos nežadėti. |
| Integracija | Pasirinktas produktas ir versija → reikalingos teisės → tikri duomenų srautai ir laukų susiejimas → užklausos pavyzdys → pasikartojimai, limitai ir klaidos → būsenos patikra → susijęs procesas. Rivilės produktų API nesuplakti į vieną tariamą sąsają. |
| Pagrindinis teminis gidas | Sąvoka → pasirinkimo kriterijai → pasirengimas ir procesas → sąnaudos bei ribos → problemų diagnostika → nuorodos į išsamius atsakymus. |
| Praktinis straipsnis | Tiesioginis atsakymas → konkreti eiga → originali lentelė, schema ar pavyzdys → klaidos ir patikra → šaltiniai → prasmingas kitas žingsnis. Tikras autorius ar operatoriaus redakcinė atsakomybė, datos, naršymo kelias ir temos vaizdas. |
| Palyginimas | Skaitytojo situacija → vienodi vertinimo kriterijai → alternatyvų skirtumai → kada kuri tinka → sąnaudų prielaidos → pagrįsta pasirinkimo rekomendacija. Kainos ir planų ribos tikrinamos rengiant tekstą. |
| Indeksai | Grupės paskirtis → aiškios temų grupės ar filtrai → tik viešos ir tinkamos kortelės → susiję gidai. Žinių centras padeda pasirinkti mokymosi kelią, straipsnių indeksas padeda rasti konkretų tekstą. |
| Ištekliai | Ką padeda atlikti → kaip naudoti → prielaidos ir ribos → tikras failas, įrankis ar demonstracija → susijęs procesas. ROI skaičiuoklė rodo vartotojo prielaidomis paremtą scenarijų, o ne garantuotą grąžą. |
| Kainodara ir kontaktai | Kainos sudėtis arba kontakto tikslas → reikalinga informacija → tikros komercinės sąlygos → aiškus veiksmas. Formos pristatymas, saugojimas ir gavimas tikrinami realizavimo metu. |
| Apie mus, pagalba ir teisė | Tikra atsakomybė, operatorius ir kontaktas; naudojimo instrukcijos pagal faktinę sąsają; faktinį duomenų tvarkymą ir sutartį atitinkantys privatumo bei sąlygų tekstai. |

Agentų katalogas gali rodyti visus sistemoje prijungiamus profilius. Atskiro indeksuojamo puslapio nereikia generuoti vien dėl kiekvieno repo failo egzistavimo: profilis turi turėti savitą klausimą, paaiškintą panaudojimą ir tikrą manifestą. Tai nekeičia produkto galimybės prijungti pasirinktą agentą.

## Temų ir URL sprendimai

Pagrindinės užklausos ir sinonimai nukreipiami į vieną atsakymą: „verslo procesų automatizavimas“ – į /verslo-procesu-automatizavimas/, „AI agentai“ ir „DI agentai“ – į /ai-agentai/. Pagrindinis puslapis pristato Verslomatiką ir jos komercinį pasiūlymą. /agentai/ yra funkcionalus katalogas, /ai-agentai/ – aiškinantis gidas. Šios funkcijos skiriasi, nors žodžiai sutampa.

| Teminis centras | Komercinis URL | Išsamūs gidai | Klausimai sprendimo skyriams ir plėtrai |
| --- | --- | --- | --- |
| Pardavimai | /sprendimai/pardavimai/ | S1, S2 | Tikslinio kliento kriterijai, kontaktų kokybė, pasiūlymo sąlygos, sąnaudų vertinimas ir nepavykusio kontakto analizė. |
| CRM | /sprendimai/crm/ | S1, S2, S15 | Duomenų šaltiniai, laukų susiejimas, dublikatai, sinchronizavimo kryptis, prieigos ir klaidų atsekamumas. |
| Klientų aptarnavimas | /sprendimai/klientu-aptarnavimas/ | S3, S4 | Kanalų pasirinkimas, tapatybė, atsakymo pagrindimas, perdavimas darbuotojui ir paslaugos kokybės matavimas. |
| Rinkodara | /sprendimai/rinkodara/ | S5 | Turinio planas, rengimas, redagavimas, sklaidos kanalai ir rezultato priskyrimas verslo tikslui. |
| SEO ir GEO | /sprendimai/seo-geo-automatizavimas/ | S5, S7 | Užklausa ir URL, turinio spragos, indeksavimo kliūtys, faktinės citatos ir verslo užklausos. |
| Mokama reklama | /sprendimai/reklamos-valdymas/ | S6 | Priskyrimas, konversijų vėlavimas, marža, išlaidų ribos, stabdymas ir pakeitimo grąžinimas. |
| Programavimas | /sprendimai/programavimas/ | S9 | Specifikacija, kodo pakeitimas, duomenų migracijos, testai, saugumas, diegimo ir grąžinimo sprendimas. |
| Dizainas | /sprendimai/dizainas/ | S8 | Dizaino kintamieji, komponentai, UX tyrimas, tipografika, prieinamumas ir vizualinė regresija. |
| Verslo tyrimai | /sprendimai/verslo-tyrimai/ | S10 | Rinkos klausimas, šaltinių teisės, konkurentų stebėjimas, atsiliepimų interpretacija ir sprendimo pagrindimas. |
| Sąskaitos | /sprendimai/saskaitu-valdymas/ | S11, S12 | Gavimas, atpažinimas, validavimas, dublikatai, eksporto klaida ir apmokėjimo būsena. |
| Finansų analitika | /sprendimai/finansu-analitika/ | S6, S12 | Pinigų srautai, duomenų laikotarpiai, prognozės prielaidos, išlaidų analizė ir rodiklių sutikrinimas. |
| Dokumentai | /sprendimai/dokumentu-valdymas/ | S2, S13 | Šablono versija, duomenų tikslumas, gavėjai, parašo būsena, archyvavimas ir saugojimo terminas. |
| Duomenų analitika | /sprendimai/duomenu-analitika/ | S6, S10 | Duomenų sutartis, šaltinių suderinimas, vėlavimas, ataskaitos išimtis ir sprendimo patikrinimas. |
| Operacijos | /sprendimai/operacijos/ | S15 | Atsakomybė, įvykio pavertimas užduotimi, prioritetai, priklausomybės, vėlavimas ir audito žurnalas. |
| Personalo procesai | /sprendimai/hr-procesai/ | S16 | Dokumentai, rolės, prieigos, įvedimas, grįžtamasis ryšys ir prieigos atšaukimas. |
| Žinių bazė | /sprendimai/ziniu-baze-rag/ | S14 | Šaltinių versijos, dokumentų skaidymas, teisės, paieškos kokybė, atsakymo citata ir informacijos trūkumas. |

Kiekvienam centrui numatytas pasirinkimo, pasirengimo, naudojimo, integravimo, sąnaudų, problemų ir rezultatų vertinimo kelias. Lentelės klausimai pirmiausia pildomi esamų URL skyriais; atskiras straipsnis kuriamas tik atsiradus savarankiškam skaitytojo darbui ir pakankamam originaliam atsakymui. Integracijų ir industrijų kombinacijos nesudaro automatinio naujų URL tinklo.

Šie 16 straipsnių yra konkreti pirmoji redakcinė programa. Jie neužbaigia visų galimų išplečiamos platformos temų. Naujas agency-agents vaidmuo pirmiausia susiejamas su agentų katalogu, esamu sprendimu ir klausimu; tik tada sprendžiama, ar reikia naujo turinio.

2026-10-23 atliktas atskirai autorizuotas Treg tyrimas: 133 LT frazės, po 89 US ir GB frazes, 26 sėkmingi Google rezultatų atsakymai ir 8 sėkmingi AI paieškos atsakymai. Išlaidos pagal kvietimų kvitus – 0,3536 USD iš 10 USD limito. Null apimtys nėra nulis, užsienio duomenys nėra LT paklausa, o AI faktinė geografija nepatvirtinta. Pilni sprendimai ir ribos pateikti [tyrimo ataskaitoje](antigravity/RESEARCH.md). Pagrindinę frazę „verslo procesų automatizavimas“ valdo /verslo-procesu-automatizavimas/; titulinis pristato prekės ženklą ir visą produktą. Reitingų ar rinkos lyderystės garantija neteikiama.

## Visas puslapių inventorius

URL išsaugoti iš suderinto 74 įrašų inventoriaus; papildomas /agentu-kurejas/ įrašas įtrauktas po naujo klausimo apie agentų kūrimą. T0 yra publikavimo grupė, o ne teiginys, kad tekstai jau parengti. Planiniai identifikatoriai P ir S nėra studijos pageId.

| Plano ID | Kanoninis kelias | Šeima | Skaitytojo klausimas | Grupė |
| --- | --- | --- | --- | --- |
| P01 | / | Titulinis | Kaip autonominiai DI agentai gali perimti įmonės darbus? | T0 |
| P02 | /kaip-veikia/ | Produkto gidas | Kaip techniškai veikia Verslomatika V2 grandinės? | T0 |
| P03 | /kainodara/ | Komercinis | Iš ko susideda paslaugos kaina ir kaip įvertinti savo proceso sąnaudas? | T0 |
| P04 | /apie-mus/ | Informacinis | Kas kuria ir prižiūri Verslomatika V2 sistemą? | T0 |
| P05 | /kontaktai/ | Komercinis | Kaip susisiekti dėl individualaus diegimo ar konsultacijos? | T0 |
| P06 | /kokybes-kontrole/ | Sprendimas | Kaip valdomos agentų teisės, rezultatų patikra ir perdavimas žmogui? | T0 |
| P07 | /agentai/ | Indeksas | Kokie agentai egzistuoja ir kokius darbus atlieka? | T0 |
| AGENT_TEMPLATE | /agentai/{slug}/ | Agento šablonas | Ką konkrečiai atlieka šis agentas ir kokių įrankių jam reikia? | Šablono realizavimas |
| P08 | /komandos/ | Indeksas | Kokios paruoštos agentų komandos egzistuoja procesams? | T0 |
| P09 | /komandos/b2b-pardavimu-komanda/ | Sprendimas | Kaip veikia suderinta pardavimų agentų komanda? | T0 |
| P10 | /komandos/turinio-ir-seo-komanda/ | Sprendimas | Kaip veikia turinio fabrikas (Tyrimas → Tekstas → SEO)? | T0 |
| P11 | /komandos/programavimo-ir-qa-komanda/ | Sprendimas | Kaip inžineriniai agentai kuria, testuoja ir diegia kodą? | T0 |
| P12 | /komandos/finansu-operaciju-komanda/ | Sprendimas | Kaip agentai suderina sąskaitas, banką ir biudžeto prognozes? | T0 |
| P13 | /darbo-grandines/ | Techninis gidas | Kaip sukonstruoti agentų darbo seką (DAG) su klaidų valdymu? | T0 |
| P14 | /sprendimai/ | Indeksas | Kokias verslo funkcijas galima automatizuoti (16 sprendimų)? | T0 |
| P15 | /sprendimai/pardavimai/ | Sprendimas | Kaip automatizuoti B2B klientų paiešką ir kvalifikavimą? | T0 |
| P16 | /sprendimai/crm/ | Sprendimas | Kaip sinchronizuoti formų, pašto ir skambučių duomenis CRM? | T0 |
| P17 | /sprendimai/klientu-aptarnavimas/ | Sprendimas | Kaip suderinti klientų aptarnavimą paštu, pokalbiais ir balsu? | T0 |
| P18 | /sprendimai/rinkodara/ | Sprendimas | Kaip automatizuoti rinkodaros planavimą, turinį ir sklaidą? | T0 |
| P19 | /sprendimai/seo-geo-automatizavimas/ | Sprendimas | Kaip paruošti svetainę tradicinei ir generatyvinei (LLM) paieškai? | T0 |
| P20 | /sprendimai/reklamos-valdymas/ | Sprendimas | Kaip valdyti Meta ir Google Ads biudžetus pagal realias pajamas? | T0 |
| P21 | /sprendimai/programavimas/ | Sprendimas | Kaip automatizuoti programinės įrangos kūrimą iki testuoto kodo? | T0 |
| P22 | /sprendimai/dizainas/ | Sprendimas | Kaip automatizuoti dizaino kintamuosius ir UX tyrimus? | T0 |
| P23 | /sprendimai/verslo-tyrimai/ | Sprendimas | Kaip automatizuoti rinkos ir konkurentų pokyčių stebėjimą? | T0 |
| P24 | /sprendimai/saskaitu-valdymas/ | Sprendimas | Kaip automatizuoti sąskaitų suvedimą į apskaitos programas? | T0 |
| P25 | /sprendimai/finansu-analitika/ | Sprendimas | Kaip automatizuoti pinigų srautų prognozavimą ir biudžeto kontrolę? | T0 |
| P26 | /sprendimai/dokumentu-valdymas/ | Sprendimas | Kaip automatizuoti sutarčių rengimą ir pasirašymą e-parašu? | T0 |
| P27 | /sprendimai/duomenu-analitika/ | Sprendimas | Kaip sujungti duomenis iš skirtingų šaltinių į ataskaitas? | T0 |
| P28 | /sprendimai/operacijos/ | Sprendimas | Kaip automatizuoti užduočių delegavimą ir terminų kontrolę? | T0 |
| P29 | /sprendimai/hr-procesai/ | Sprendimas | Kaip automatizuoti naujo darbuotojo įvedimą (Onboarding)? | T0 |
| P30 | /sprendimai/ziniu-baze-rag/ | Sprendimas | Kaip prijungti įmonės dokumentus ir išlaikyti prieigos teises? | T0 |
| P31 | /industrijos/ | Indeksas | Kaip automatizavimo scenarijus pritaikyti savo veiklos sričiai? | T0 |
| P32 | /industrijos/e-komercija/ | Industrija | Kaip automatizuoti užsakymus, sąskaitas, likučius ir siuntas? | T0 |
| P33 | /industrijos/b2b-paslaugos/ | Industrija | Kaip paslaugų įmonėms automatizuoti projektus ir atskaitomybę? | T0 |
| P34 | /industrijos/logistika/ | Industrija | Kaip transporto įmonėms automatizuoti CMR ir sąskaitų apdorojimą? | T0 |
| P35 | /industrijos/nekilnojamasis-turtas/ | Industrija | Kaip NT brokeriams automatizuoti užklausas ir vizitų derinimą? | T0 |
| P36 | /industrijos/gamyba/ | Industrija | Kaip automatizuoti žaliavų užsakymus ir tiekimo grandinę? | T0 |
| P37 | /industrijos/paslaugu-verslas-medicina-grozis/ | Industrija | Kaip klinikoms ir salonams automatizuoti vizitų registraciją? | T0 |
| P38 | /integracijos/ | Indeksas | Su kokiomis verslo sistemomis jungiasi Verslomatika V2 agentai? | T0 |
| P39 | /integracijos/b1/ | Integracija | Kaip sujungti el. parduotuvę ar CRM su B1.lt per REST API? | T0 |
| P40 | /integracijos/rivile/ | Integracija | Kokie duomenys ir pasirinktos Rivilės sistemos sąsajos reikalingi integracijai? | T0 |
| P41 | /integracijos/make-n8n/ | Integracija | Kaip iškviesti agentus iš Make.com arba n8n scenarijų? | T0 |
| P42 | /integracijos/crm-sistemos/ | Integracija | Kaip sujungti Pipedrive, HubSpot ir Zoho su Verslomatika agentais? | T0 |
| P43 | /integracijos/dokobit/ | Integracija | Kaip automatizuoti dokumentų pasirašymą per Dokobit API? | T0 |
| P44 | /ziniu-centras/ | Indeksas | Kur rasti visus gidus, straipsnius ir įrankius vienoje vietoje? | T0 |
| P45 | /verslo-procesu-automatizavimas/ | Mega-gidas | Nuo ko pradėti procesų peržiūrą ir atranką? | T0 |
| P46 | /ai-agentai/ | Mega-gidas | Kas yra autonominiai DI agentai ir kuo jie skiriasi nuo botų? | T0 |
| P47 | /straipsniai/ | Indeksas | Visi praktiniai automatizavimo, agentų ir integracijų gidai. | T0 |
| S1 | /straipsniai/b2b-kontaktu-atranka-duomenu-sodrinimas/ | Straipsnis | Kaip atsirinkti tikslines įmones, papildyti jų duomenis ir įvertinti kontaktavimo sąlygas? | S1 |
| S2 | /straipsniai/komercinio-pasiulymo-automatizavimas/ | Straipsnis | Kaip kliento užklausą paversti teisingu ir nuosekliu pasiūlymu? | S2 |
| S3 | /straipsniai/ai-balso-agentai-skambuciams/ | Straipsnis | Kaip įvertinti lietuviškai kalbančio agento pokalbį ir jo veiksmus verslo sistemose? | S3 |
| S4 | /straipsniai/klientu-aptarnavimo-eskalavimo-taisykles/ | Straipsnis | Kokios sąlygos turi sustabdyti savarankišką atsakymą ar veiksmą? | S4 |
| S5 | /straipsniai/autonominis-turinio-fabrikas/ | Straipsnis | Kaip kelių agentų darbą paversti naudingu, patikrintu ir suplanuotu turiniu? | S5 |
| S6 | /straipsniai/reklamos-biudzeto-valdymas/ | Straipsnis | Kada biudžeto pakeitimas pagrįstas duomenimis ir kaip apriboti klaidingą veiksmą? | S6 |
| S7 | /straipsniai/geo-optimizavimas-struktura/ | Straipsnis | Kaip padaryti viešą turinį aiškų skaitytojui ir paieškos sistemoms? | S7 |
| S8 | /straipsniai/dizaino-sistemos-automatizavimas/ | Straipsnis | Kaip perkelti patvirtintus dizaino kintamuosius į kodą nesugadinant sąsajos? | S8 |
| S9 | /straipsniai/automatinis-kodo-testavimas/ | Straipsnis | Kaip agentų patikrą įtraukti į tikrą testavimo procesą ir išsaugoti įrodymus? | S9 |
| S10 | /straipsniai/klientu-atsiliepimu-analize/ | Straipsnis | Kaip atsiliepimus sugrupuoti ir pagrįsti tobulinimo prioritetus? | S10 |
| S11 | /straipsniai/saskaitu-atpazinimas-ocr-buhalterija/ | Straipsnis | Kokius sąskaitos laukus ištraukti, ką tikrinti ir kada perduoti žmogui? | S11 |
| S12 | /straipsniai/skolu-priminimu-automatizavimas/ | Straipsnis | Kaip priminti apie mokėjimą nesuklystant dėl jau apmokėtos ar ginčijamos sąskaitos? | S12 |
| S13 | /straipsniai/sutarciu-pasirasymas-dokobit/ | Straipsnis | Kaip patikimai sekti sutarties parengimą, kvietimą ir galutinį pasirašymo rezultatą? | S13 |
| S14 | /straipsniai/vidine-ziniu-baze-rag/ | Straipsnis | Kaip pateikti agentui tinkamus įmonės dokumentus ir tikrinti atsakymo pagrįstumą? | S14 |
| S15 | /straipsniai/vidiniu-uzduociu-delegavimas/ | Straipsnis | Kaip iš užklausos sukurti aiškią užduotį be dublikatų ir nepagrįstų terminų? | S15 |
| S16 | /straipsniai/darbuotojo-ivedimo-onboarding-automatizavimas/ | Straipsnis | Kaip suderinti dokumentus, prieigas ir darbuotojo pirmųjų dienų užduotis? | S16 |
| P48 | /palyginimai/ | Indeksas | Objektyvūs automatizavimo įrankių ir metodų palyginimai. | T0 |
| P49 | /palyginimai/make-vs-zapier-vs-n8n/ | Palyginimas | Kurią orkestracijos platformą pasirinkti: Make, Zapier ar n8n? | T0 |
| P50 | /palyginimai/ai-agentai-vs-tradicinis-programavimas/ | Palyginimas | Kada procesui reikia DI agento, o kada fiksuotos kodo funkcijos? | T0 |
| P51 | /istekliai/ | Indeksas | Nemokami praktiniai įrankiai, šablonai, skaičiuoklės ir demonstracijos. | T0 |
| P52 | /istekliai/roi-skaiciuokle/ | Įrankis | Kiek lėšų ir darbo valandų sutaupytų komanda automatizavus procesus? | T0 |
| P53 | /istekliai/procesu-audito-sablonas/ | Šablonas | Praktinis klausimynas įmonės procesų inventorizacijai ir atrankai. | T0 |
| P54 | /istekliai/demonstracijos/ | Demonstracija | Kaip atrodo konkretus agento procesas ir jo patikrinamas rezultatas? | T0 |
| P55 | /pagalba/ | Dokumentacija | Kaip pasirinkti agentą, prijungti įrankį ir suprasti darbo grandinės būseną? | T0 |
| P56 | /privatumas/ | Teisinis | Kas, kokiu tikslu ir pagal kokias sąlygas tvarko asmens duomenis? | T0 |
| P57 | /salygos/ | Teisinis | Paslaugų teikimo ir sistemos naudojimo sąlygos. | T0 |
| P58 | /agentu-kurejas/ | Produkto funkcija | Kaip pagal aprašytą darbą sukurti agentą arba agentų komandą? | T0 |

## Publikavimo datos ir parengimo eiga

Išlaikytas pateiktas kalendoriaus pasiūlymas: T0 – **2026-10-27 09:00 Lietuvos laiku**, parengimo tikslas – 2026-10-25 18:00. Abu laikai jau yra EET. Core helper localPublishAt perskaičiavo juos į 2026-10-27T07:00:00.000Z ir 2026-10-25T16:00:00.000Z. Datos įrašomos tik per tikrą projekto turinio eigą; planas pats nieko nesuplanuoja.

Du straipsniai per savaitę yra darbo ritmo pasirinkimas. Tai nėra SEO reikalavimas ar indeksavimo terminas. Visų 58 T0 URL kokybės, teisinių tekstų, įrankių ir demonstracijų parengimas yra atskira darbų apimtis; dvi dienos nėra jos įvykdymo garantija.

| ID | Parengti iki Lietuvos laiku | Publikuoti Lietuvos laiku | Core publishAt UTC |
| --- | --- | --- | --- |
| S1 | 2026-10-27 12:00 | 2026-10-29 09:00 | 2026-10-29T07:00:00.000Z |
| S2 | 2026-11-01 18:00 | 2026-11-03 09:00 | 2026-11-03T07:00:00.000Z |
| S3 | 2026-11-03 18:00 | 2026-11-05 09:00 | 2026-11-05T07:00:00.000Z |
| S4 | 2026-11-08 18:00 | 2026-11-10 09:00 | 2026-11-10T07:00:00.000Z |
| S5 | 2026-11-10 18:00 | 2026-11-12 09:00 | 2026-11-12T07:00:00.000Z |
| S6 | 2026-11-15 18:00 | 2026-11-17 09:00 | 2026-11-17T07:00:00.000Z |
| S7 | 2026-11-17 18:00 | 2026-11-19 09:00 | 2026-11-19T07:00:00.000Z |
| S8 | 2026-11-22 18:00 | 2026-11-24 09:00 | 2026-11-24T07:00:00.000Z |
| S9 | 2026-11-24 18:00 | 2026-11-26 09:00 | 2026-11-26T07:00:00.000Z |
| S10 | 2026-11-29 18:00 | 2026-12-01 09:00 | 2026-12-01T07:00:00.000Z |
| S11 | 2026-12-01 18:00 | 2026-12-03 09:00 | 2026-12-03T07:00:00.000Z |
| S12 | 2026-12-06 18:00 | 2026-12-08 09:00 | 2026-12-08T07:00:00.000Z |
| S13 | 2026-12-08 18:00 | 2026-12-10 09:00 | 2026-12-10T07:00:00.000Z |
| S14 | 2026-12-13 18:00 | 2026-12-15 09:00 | 2026-12-15T07:00:00.000Z |
| S15 | 2026-12-15 18:00 | 2026-12-17 09:00 | 2026-12-17T07:00:00.000Z |
| S16 | 2026-12-20 18:00 | 2026-12-22 09:00 | 2026-12-22T07:00:00.000Z |

Galutines datas nustatysime pagal šio projekto parengtą turinį. Jau turimą publikavimo pagal datą galimybę pritaikysime Verslomatikai; jos ankstesnis darbo režimas nenustato šio turinio apimties ar privalomo rašymo tempo. Techninio prijungimo metu patikrinamos faktiškai išsaugotos datos.

Jeigu reikalingas turinys ar privalomas failas iki termino neparengtas, paveikta publikacija lieka privati; tvarkoma jos užduotis ir reali data. Parengti nepriklausomi puslapiai tęsiami. Būsimo straipsnio nuoroda komerciniame puslapyje yra atidedamas kontekstinis ryšys, o ne priežastis klaidingai nukreipti skaitytoją į kitą temą.

## Straipsnių rašymo užduotys

Žemiau yra galutinės redakcinės užduotys, pakeičiančios ankstesnes S1–S16 versijas. Paieškos frazės nusako ketinimą; sutampančių tyrimo frazių apimtys ir negrąžinti įverčiai pateikti atskirame tyrimo rinkinyje. Visų ilgesnių straipsnių formuluočių paklausa atskirai nematuota. Jas tekste vartoti natūraliais linksniais. Numatyti pavyzdžiai rengiami su sintetiniais arba teisėtai nuasmenintais duomenimis. „Peržiūrėti“ ar „atsisiųsti“ veiksmas įgyvendinamas tik turint patikrintą skiltį arba failą.

### S1 B2B kontaktų atranka ir duomenų sodrinimas: procesas, kokybės patikra ir teisėta komunikacija

**URL:** /straipsniai/b2b-kontaktu-atranka-duomenu-sodrinimas/

**Skaitytojas:** Pardavimų vadovas, kuris nori gauti tinkamų įmonių sąrašą ir patikimus kontaktus.

**Klausimas:** Kaip atsirinkti tikslines įmones, papildyti jų duomenis ir įvertinti kontaktavimo sąlygas?

**Pagrindinė užklausa:** B2B klientų paieška automatiškai. Variantai: B2B kontaktų atranka; kontaktų duomenų sodrinimas; tiesioginė rinkodara juridiniams asmenims.

**Riba:** Pardavimų sprendimo puslapis pristato visą procesą; šis gidas išsamiai nagrinėja atranką ir duomenų kokybę. Teisinė dalis yra proceso dalis, o ne viso gido pakaitalas.

**Turinio eiga:**

1. Tikslinio kliento kriterijai: veikla, dydis, geografija, pirkimo signalas ir aiški atmetimo priežastis. Atskirti įmonės duomenis nuo konkretaus žmogaus duomenų.
2. Duomenų kilmė ir kokybė: išsaugoti šaltinį, surinkimo datą, faktą ir jo patikimumą; pašalinti dublikatus, nekurti numanomų adresų kaip patvirtintų kontaktų. Kontaktų techninė patikra: sintaksė ir MX įrašai rodo adreso formato bei domeno pašto maršruto sąlygas, tačiau neįrodo konkrečios dėžutės egzistavimo. Neaiškų ir catch-all rezultatą palikti atskira būsena. SPF, DKIM ir DMARC negarantuoja pristatomumo ar atsakymų.
3. ERĮ 81 straipsnio 1 dalis: kai abonentas ar registruotasis paslaugų gavėjas yra juridinis asmuo, išankstinio sutikimo nereikia, tačiau būtina aiški, nemokama ir lengvai įgyvendinama galimybė atsisakyti tolesnės komunikacijos. Adreso rašyba pati savaime abonento statuso nenustato. Komercinis aktualumas gali būti mūsų atrankos kokybės taisyklė; jo nepriskirti kaip papildomos universalios ERĮ 81 straipsnio sąlygos be konkretaus normos pagrindo.
4. Vardiniams darbuotojų kontaktams nustatyti tinkamą BDAR teisinį pagrindą. Jeigu remiamasi 6 straipsnio 1 dalies f punktu, prieš tvarkymą įvertinti ir dokumentuoti teisėtą interesą, būtinumą bei interesų pusiausvyrą. Teisėtas interesas netaikomas automatiškai vien todėl, kad komunikacija yra B2B.
5. Numatyti taikytiną informavimą pagal BDAR 13 arba 14 straipsnį, teisę nesutikti pagal 21 straipsnį ir atsisakymo įrodymų saugojimą. Atsisakius tiesioginės rinkodaros nebetęsti. ERĮ 81 straipsnio 2 dalies esamo kliento, kuris yra fizinis asmuo, išimties nepateikti kaip bendros B2B taisyklės.
6. Perdavimas į CRM: kontaktavimo sprendimas, atsakingas asmuo ir draudimo kontaktuoti žyma. Siuntimo apimtį nustatyti pagal faktinį paslaugos teikėją ir kampaniją; universalaus saugaus laiškų kiekio nepateikti.

**Originali nauda:** Atrankos matrica ir kontaktavimo patikros lentelė su laukais šaltiniui, datai, abonento statusui, teisiniam pagrindui ir atsisakymui.

**Šaltiniai ir patikra:** VDAI 2026-05-19 DUK; Aktuali ERĮ 81 straipsnio ir BDAR 6, 13, 14, 21 straipsnių redakcija; RFC 5321: domeno pašto maršrutas ir neaiškūs adresato patikros rezultatai. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `sales/sales-outbound-strategist.md`, `testing/testing-reality-checker.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/pardavimai/, /kokybes-kontrole/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Duomenų kelio schema: įmonės kriterijai → šaltinis → kokybės ir kontaktavimo patikra → CRM.

**Kitas veiksmas:** „Peržiūrėti B2B kontaktų atrankos kontrolinį sąrašą“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-10-29 09:00 Europe/Vilnius; publishAt – 2026-10-29T07:00:00.000Z.

### S2 Komercinių pasiūlymų rengimo automatizavimas: nuo kliento užklausos iki PDF

**URL:** /straipsniai/komercinio-pasiulymo-automatizavimas/

**Skaitytojas:** Pardavimų vadybininkas ir vadovas, prižiūrintis kainodaros taisykles.

**Klausimas:** Kaip kliento užklausą paversti teisingu ir nuosekliu pasiūlymu?

**Pagrindinė užklausa:** komercinio pasiūlymo rengimas automatiškai. Variantai: komercinio pasiūlymo šablonas; pasiūlymų generavimas iš CRM.

**Riba:** Nagrinėja pasiūlymo rengimą, o ne kontaktų paiešką ar elektroninį pasirašymą.

**Turinio eiga:**

1. Iš laiško ar susitikimo užrašų išskirti poreikį, apimtį, terminą ir aiškiai trūkstamą informaciją. Nepaversti kliento nutylėtų sąlygų faktais.
2. Kainas, nuolaidų ribas ir mokesčius imti iš patvirtintų struktūrizuotų taisyklių. Agentas rengia turinį, o skaičiavimai tikrinami atskirai.
3. Užpildyti dokumento šabloną, patikrinti sumas, versiją ir gavėją. Pasiūlymo parengimą ir jo išsiuntimą pateikti kaip atskirus veiksmus.
4. Parodyti iliustracinę užklausą, iš jos gautus laukus ir pasiūlymo struktūrą; tikro darbo greičio nežadėti be matavimo.

**Originali nauda:** Užklausos laukų žemėlapis ir pasiūlymo struktūra: poreikis, sprendimas, etapai, sąmata, sąlygos.

**Šaltiniai ir patikra:** Faktinis V2 dokumentų kelias ir įmonės kainodaros taisyklės; Pasirinkto PDF generatoriaus dokumentacija. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `sales/sales-deal-strategist.md`, `support/support-support-responder.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/pardavimai/, /sprendimai/dokumentu-valdymas/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Vienos iliustracinės užklausos laukų susiejimas su pasiūlymo skyriais.

**Kitas veiksmas:** „Peržiūrėti komercinio pasiūlymo struktūrą“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-11-03 09:00 Europe/Vilnius; publishAt – 2026-11-03T07:00:00.000Z.

### S3 DI balso agentai klientų skambučiams: lietuvių kalba, delsa ir CRM integracija

**URL:** /straipsniai/ai-balso-agentai-skambuciams/

**Skaitytojas:** Aptarnavimo vadovas ir techninis specialistas, vertinantys skambučių automatizavimą.

**Klausimas:** Kaip įvertinti lietuviškai kalbančio agento pokalbį ir jo veiksmus verslo sistemose?

**Pagrindinė užklausa:** AI balso asistentas skambučiams lietuviškai. Variantai: DI balso agentas klientams; balso agento integracija su CRM.

**Riba:** Bendras aptarnavimo puslapis pristato kanalus; šis gidas nagrinėja garsą, delsą ir skambučio tęstinumą.

**Turinio eiga:**

1. Aprašyti faktiškai pasirinktą balso architektūrą. STT → kalbos modelis → TTS grandinę pateikti kaip konkretaus varianto schemą; nevadinti jos vienintele visų balso agentų architektūra. WebRTC yra garso perdavimo dalis.
2. Atskirti vartotojo kalbos pabaigą, pirmą išgirstą atsakymo garsą, įrankio vykdymą ir viso veiksmo trukmę. Užrašyti testavimo kanalą, modelių versijas, tinklo sąlygas ir imties dydį.
3. Vertinti lietuviškus vardus, datas, sumas, pertraukimą, tylą ir triukšmą. Rodyti rezultatus tik turint išsaugotą matavimo protokolą.
4. CRM įrašymas, tapatybės patikra ir perdavimas darbuotojui turi išlaikyti pokalbio kontekstą. Demonstracinį skambutį aiškiai įvardyti ir naudoti sintetinius duomenis.

**Originali nauda:** Pakartojamas bandymo protokolas ir atskirai parengti lietuviško pokalbio pavyzdžiai.

**Šaltiniai ir patikra:** Faktinio V2 balso modulio architektūra; Naudojamos telefonijos ir balso API dokumentacija; Išsaugoti bandymų įrašai ir protokolas. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `support/support-support-responder.md`, `specialized/specialized-workflow-architect.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/klientu-aptarnavimas/, /istekliai/demonstracijos/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Garso perdavimo, apdorojimo, įrankių ir CRM veiksmų schema su atskirais matavimo taškais.

**Kitas veiksmas:** „Peržiūrėti balso agento integracijos schemą“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-11-05 09:00 Europe/Vilnius; publishAt – 2026-11-05T07:00:00.000Z.

### S4 Klientų aptarnavimo eskalavimo taisyklės: kada DI agentas perduoda pokalbį darbuotojui

**URL:** /straipsniai/klientu-aptarnavimo-eskalavimo-taisykles/

**Skaitytojas:** Klientų aptarnavimo vadovas.

**Klausimas:** Kokios sąlygos turi sustabdyti savarankišką atsakymą ar veiksmą?

**Pagrindinė užklausa:** klientų aptarnavimo eskalavimo taisyklės. Variantai: kada DI agentas perduoda pokalbį žmogui; pokalbių agento saugikliai.

**Riba:** Pateikia perdavimo sprendimą ir kontekstą; nepakartoja viso aptarnavimo kanalų aprašo.

**Turinio eiga:**

1. Nustatyti aiškias perdavimo priežastis: vartotojo prašymas, nepatikima tapatybė, nepakankami duomenys, incidentas ar veiksmui trūkstami įgaliojimai.
2. Nepatenkinto kliento toną naudoti kaip papildomą signalą. Finansines ir prieigos ribas tikrinti taisyklėmis, o ne vien nuotaikos klasifikatoriumi.
3. Darbuotojui perduoti klausimą, patikrintus faktus, jau atliktus veiksmus ir laukiamą sprendimą. Numatyti nepasiekiamo darbuotojo būseną.
4. Išbandyti aiškius, ribinius ir prieštaringus atvejus; fiksuoti, kas ir kada perėmė atsakomybę.

**Originali nauda:** Sąlygos, veiksmo ir atsakingo asmens matrica bei perdavimo santraukos šablonas.

**Šaltiniai ir patikra:** V2 perdavimo ir įgaliojimų taisyklės; Naudojamos CRM arba aptarnavimo sistemos API. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `support/support-support-responder.md`, `testing/testing-reality-checker.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/klientu-aptarnavimas/, /kokybes-kontrole/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Sprendimų medis, parodantis savarankišką atsakymą, stabdymą ir perdavimą žmogui.

**Kitas veiksmas:** „Peržiūrėti pokalbio perdavimo taisyklių matricą“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-11-10 09:00 Europe/Vilnius; publishAt – 2026-11-10T07:00:00.000Z.

### S5 Autonominis turinio fabrikas: tyrimas, straipsnio rengimas ir patikra su DI agentais

**URL:** /straipsniai/autonominis-turinio-fabrikas/

**Skaitytojas:** Rinkodaros vadovas ir turinio redaktorius.

**Klausimas:** Kaip kelių agentų darbą paversti naudingu, patikrintu ir suplanuotu turiniu?

**Pagrindinė užklausa:** turinio kūrimo automatizavimas su DI agentais. Variantai: automatizuotas straipsnių rašymas; SEO turinio rengimo procesas.

**Riba:** Aprašo straipsnio rengimo procesą; SEO ir GEO techninę struktūrą išsamiau nagrinėja S7.

**Turinio eiga:**

1. Skaitytojo klausimas ir esamas URL nustatomi prieš rašymą. Tyrėjas surenka šaltinius, autorius parengia atsakymą, tikrintojas vertina faktus ir originalią naudą.
2. Peržiūra siejama su tikslia teksto, vaizdų ir nuorodų versija. Nei vertinimo trukmė minutėmis, nei agentų skaičius neįrodo kokybės.
3. Parodyti visą turinio kelią: skaitytojo klausimas → šaltinių tyrimas → tekstas ir originalus pavyzdys → faktų bei kalbos patikra → publikavimas pagal datą → rezultatų vertinimas.
4. TVS integraciją pateikti kaip konkretų pasirinktą išvesties adapterį. Rašymas, patvirtinimas ir viešas paskelbimas išlieka skirtingi veiksmai.

**Originali nauda:** Redakcinės patikros lentelė ir agentų atsakomybių seka su taisymo grįžtamuoju ryšiu.

**Šaltiniai ir patikra:** Google people-first turinio gairės; CONTENT_CORE ir faktinė studijos eiga. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `marketing/marketing-content-creator.md`, `testing/testing-reality-checker.md`, `marketing/marketing-seo-specialist.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/rinkodara/, /sprendimai/seo-geo-automatizavimas/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Turinio kelio schema nuo tyrimo iki patikrinto ir pagal datą paskelbto straipsnio.

**Kitas veiksmas:** „Peržiūrėti turinio rengimo ir patikros seką“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-11-12 09:00 Europe/Vilnius; publishAt – 2026-11-12T07:00:00.000Z.

### S6 Reklamos biudžeto automatizavimas: ROAS, duomenų kokybė ir išlaidų ribos

**URL:** /straipsniai/reklamos-biudzeto-valdymas/

**Skaitytojas:** Mokamos reklamos specialistas ir finansų vadovas.

**Klausimas:** Kada biudžeto pakeitimas pagrįstas duomenimis ir kaip apriboti klaidingą veiksmą?

**Pagrindinė užklausa:** reklamos biudžeto valdymas automatiškai. Variantai: Google Ads biudžeto taisyklės; Meta reklamos ROAS automatizavimas.

**Riba:** Konkrečios skaičiavimo ir vykdymo taisyklės; komercinio reklamos valdymo puslapio nedubliuoja.

**Turinio eiga:**

1. Kai konversijos vertė yra pajamos, ROAS apskaičiuojamas reklamai priskirtas pajamas dalijant iš reklamos išlaidų. Tai nėra pelno rodiklis. Jeigu platformai perduodama marža ar kita vertė, aiškiai įvardyti šią matavimo prielaidą ir nesuplakti jos su pajamomis.
2. Suderinti konversijų laikotarpį, valiutą, priskyrimą ir duomenų vėlavimą. CRM įplaukų ir reklamos platformos rodiklių nelyginti kaip tapačių duomenų.
3. Pavyzdines ribas įvardyti kaip pasirinktos kampanijos prielaidas. Numatyti minimalų duomenų kiekį, dienos išlaidų ribą, vieno pakeitimo dydį ir grįžimo sąlygą.
4. Neigiamas užklausas ir biudžeto pakeitimus tikrinti prieš vykdymą; parodyti sprendimo žurnalą ir sustabdymo mechanizmą.

**Originali nauda:** Taisyklių pavyzdys su duomenų pakankamumo, išlaidų ir pakeitimo dydžio ribomis.

**Šaltiniai ir patikra:** Aktuali Google Ads ir Meta Marketing API dokumentacija; Iliustracinio skaičiavimo prielaidos ir patikrintos formulės. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `paid-media/paid-media-ppc-strategist.md`, `paid-media/paid-media-search-query-analyst.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/reklamos-valdymas/, /sprendimai/duomenu-analitika/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Pajamų, reklamos išlaidų ir maržos atskyrimo lentelė bei sprendimo schema.

**Kitas veiksmas:** „Peržiūrėti reklamos biudžeto taisyklių pavyzdį“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-11-17 09:00 Europe/Vilnius; publishAt – 2026-11-17T07:00:00.000Z.

### S7 SEO ir GEO turinio struktūra: aiškūs atsakymai, esybės ir tikslūs struktūriniai duomenys

**URL:** /straipsniai/geo-optimizavimas-struktura/

**Skaitytojas:** SEO specialistas ir svetainės programuotojas.

**Klausimas:** Kaip padaryti viešą turinį aiškų skaitytojui ir paieškos sistemoms?

**Pagrindinė užklausa:** GEO optimizavimas svetainės struktūra. Variantai: svetainės parengimas DI paieškai; SEO struktūriniai duomenys.

**Riba:** Nagrinėja vieno puslapio ir svetainės techninę išraišką; turinio gamybos eigą palieka S5.

**Turinio eiga:**

1. Aiški antraštė, tiesioginis atsakymas, patikrinami faktai ir prasmingos nuorodos normaliai matomame HTML. Skaitytojui ir robotui teikti tas pačias faktines žinias.
2. Article, Organization, BreadcrumbList ar kitą tipą rinktis pagal matomą tikrą turinį. FAQPage ar specialus DI ženklinimas nėra privalomas šablonas.
3. Google AI funkcijoms galioja įprasti SEO principai; nėra specialios privalomos Schema.org schemos ar garantuoto citavimo. Techninė atitiktis negarantuoja indeksavimo.
4. Matomas tekstas, sitemap, struktūriniai duomenys ir skaitymo išvestys turi pateikti tuos pačius tikrus teiginius bei aktualius URL. llms.txt gali būti papildomas turinio indeksas; jis negarantuoja matomumo.

**Originali nauda:** Matomo puslapio ir jo struktūrinių duomenų atitikties pavyzdys bei patikros sąrašas.

**Šaltiniai ir patikra:** Google AI features and your website; Google people-first turinio gairės; Pasirinktų Schema.org tipų oficialūs aprašai. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `marketing/marketing-seo-specialist.md`, `engineering/engineering-frontend-developer.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/seo-geo-automatizavimas/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Vieno turinio šaltinio kelias į HTML, naršymo kelią, sitemap ir LLM išvestis.

**Kitas veiksmas:** „Peržiūrėti puslapio ir struktūrinių duomenų atitikties pavyzdį“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-11-19 09:00 Europe/Vilnius; publishAt – 2026-11-19T07:00:00.000Z.

### S8 Dizaino sistemos automatizavimas: Figma kintamieji, kodas ir vizualinė patikra

**URL:** /straipsniai/dizaino-sistemos-automatizavimas/

**Skaitytojas:** Dizaineris ir sąsajos programuotojas.

**Klausimas:** Kaip perkelti patvirtintus dizaino kintamuosius į kodą nesugadinant sąsajos?

**Pagrindinė užklausa:** dizaino sistemos automatizavimas Figma. Variantai: design tokens sinchronizavimas su kodu; Figma kintamieji CSS.

**Riba:** Konkreti kintamųjų perdavimo grandinė; UX tyrimų ir visos dizaino paslaugos neperpasakoja.

**Turinio eiga:**

1. Nustatyti vieną reikšmių šaltinį, semantinius kintamuosius, tipus ir temų variantus. Atskirti pirmines reikšmes nuo jų taikymo komponentuose.
2. Eksporto arba API būdą pasirinkti pagal realias Figma paskyros teises ir dokumentaciją. Nežadėti konkretaus webhook įvykio jo nepatikrinus.
3. Konvertuoti tik leidžiamus laukus į projekto CSS ar kitą esamą formatą ir pateikti peržiūrimą kodo pakeitimą.
4. Tikrinti lietuviškus tekstus, tikrus šriftų svorius, kontrastą, mobilų vaizdą ir 200 procentų teksto didinimą.

**Originali nauda:** Kintamųjų susiejimo lentelė ir mažas konvertavimo pavyzdys su prieš ir po patikra.

**Šaltiniai ir patikra:** Figma Variables API dokumentacija ir faktinės prieigos sąlygos; Design Tokens Community Group specifikacija; Projekto dizaino ir tipografikos sistema. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `design/design-ui-designer.md`, `engineering/engineering-frontend-developer.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/dizainas/, /sprendimai/programavimas/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Figma semantinio kintamojo, JSON reikšmės ir CSS taikymo palyginimas.

**Kitas veiksmas:** „Peržiūrėti dizaino kintamųjų susiejimo pavyzdį“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-11-24 09:00 Europe/Vilnius; publishAt – 2026-11-24T07:00:00.000Z.

### S9 Automatinis kodo testavimas: DI agentai, saugumo patikra ir CI/CD

**URL:** /straipsniai/automatinis-kodo-testavimas/

**Skaitytojas:** Programuotojas ir techninis vadovas.

**Klausimas:** Kaip agentų patikrą įtraukti į tikrą testavimo procesą ir išsaugoti įrodymus?

**Pagrindinė užklausa:** automatinis kodo testavimas CI CD. Variantai: DI sugeneruoto kodo saugumo auditas; automatizuota kodo peržiūra.

**Riba:** Aprašo testus ir saugumo peržiūrą; bendras kūrimo ciklas lieka programavimo sprendimo puslapyje.

**Turinio eiga:**

1. API Tester pritaikyti API testams, Reality Checker – rezultato įrodymų kritinei peržiūrai, AI-Generated Code Security Auditor – DI sugeneruoto kodo saugumo peržiūrai. Vaidmenis sieti su prisegtu profilio failu.
2. agency-agents Markdown profilis aprašo vaidmenį ir instrukcijas. CI vykdymui reikia realaus V2 ar kito prižiūrimo vykdiklio, įrankių, ribotų prieigų ir sutarto išvesties formato.
3. Atskirti deterministinius testus, agento išvadą ir žmogaus sprendimą. Neleisti agentui uždengti nepraėjusio testo bendru kokybės įvertinimu.
4. Išsaugoti pirmą nesėkmę, pataisą ir pakartotinio bandymo rezultatą. Kodo pataisos pateikimą ir jos sujungimą laikyti atskirais veiksmais.

**Originali nauda:** Peržiūrimas CI darbo eigos pavyzdys ir ataskaitos forma su komanda, rezultatu bei įrodymu.

**Šaltiniai ir patikra:** Prisegti agency-agents profiliai; GitHub Actions ir pasirinkto testavimo įrankio dokumentacija; Aktualūs OWASP dokumentai pagal tikrinamą problemą. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `testing/testing-reality-checker.md`, `testing/testing-api-tester.md`, `security/security-ai-generated-code-auditor.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/programavimas/, /kokybes-kontrole/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Kodo pakeitimas → testai → agento peržiūra → pataisa → pakartotiniai testai.

**Kitas veiksmas:** „Peržiūrėti CI testų ir agento ataskaitos struktūrą“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-11-26 09:00 Europe/Vilnius; publishAt – 2026-11-26T07:00:00.000Z.

### S10 Klientų atsiliepimų analizė: nuo skirtingų kanalų iki produkto prioritetų

**URL:** /straipsniai/klientu-atsiliepimu-analize/

**Skaitytojas:** Produkto vadovas ir aptarnavimo analitikas.

**Klausimas:** Kaip atsiliepimus sugrupuoti ir pagrįsti tobulinimo prioritetus?

**Pagrindinė užklausa:** klientų atsiliepimų analizė automatiškai. Variantai: atsiliepimų grupavimas; klientų grįžtamojo ryšio analizė.

**Riba:** Analizuoja jau turimus atsiliepimus; rinkos ir konkurentų stebėjimas lieka verslo tyrimų sprendime.

**Turinio eiga:**

1. Sujungti leistinus kanalus, pašalinti dublikatus ir išsaugoti atsiliepimo kilmę. Nevienodą kanalų imtį aptarti prieš darant išvadas.
2. Atskiriamos klaidos, naujų funkcijų prašymai ir naudojimo sunkumai. Vienam atsiliepimui prireikus priskirti kelias temas.
3. Dažnumą, poveikį ir įgyvendinimo sąnaudas vertinti atskirai. Kategorijos reikšmę patikrinti su žmogaus sužymėta imtimi.
4. Parodyti sintetinį pavyzdį su pirminiais tekstais ir patikrinti, ar suvestinės išvada remiasi būtent jais. Išgalvotos didelės imties nepristatyti kaip tyrimo.

**Originali nauda:** Kategorijų aprašai, prieštaringų atvejų taisyklės ir produkto sprendimo suvestinė.

**Šaltiniai ir patikra:** Paties straipsnio aiškiai pažymėtas sintetinis pavyzdys; Faktinio atsiliepimų šaltinio prieigos ir naudojimo sąlygos. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `product/product-feedback-synthesizer.md`, `support/support-analytics-reporter.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/verslo-tyrimai/, /sprendimai/klientu-aptarnavimas/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Keli atsiliepimai, jų kategorijos ir iš jų išvedamas prioritetas.

**Kitas veiksmas:** „Peržiūrėti atsiliepimų klasifikavimo lentelę“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-12-01 09:00 Europe/Vilnius; publishAt – 2026-12-01T07:00:00.000Z.

### S11 Sąskaitų atpažinimas ir OCR: duomenų patikra prieš perkėlimą į apskaitą

**URL:** /straipsniai/saskaitu-atpazinimas-ocr-buhalterija/

**Skaitytojas:** Buhalteris ir finansų procesų vadovas.

**Klausimas:** Kokius sąskaitos laukus ištraukti, ką tikrinti ir kada perduoti žmogui?

**Pagrindinė užklausa:** sąskaitų atpažinimas OCR buhalterija. Variantai: sąskaitų suvedimas automatiškai; PDF sąskaitos nuskaitymas.

**Riba:** OCR, laukų patikra ir paruošimas eksportui; konkrečių B1 ir Rivilės API parametrų gidas jų nedubliuoja.

**Turinio eiga:**

1. Paaiškinti teksto išgavimą ir struktūrizavimą, atskiriant skaitmeninį PDF nuo skenuoto vaizdo. Rezultatai priklauso nuo dokumento kokybės.
2. Patikrinti dokumento numerį, šalis, valiutą, eilutes ir sumas. Realius mokestinius atvejus pagrįsti galiojančiomis taisyklėmis; nekeisti jų į apibendrintą vienos formulės pažadą.
3. Aptikti dublikatą, neaiškią reikšmę ir neatitikimą užsakymui. Klaidos neturi automatiškai virsti apskaitos įrašu.
4. Parodyti sintetinį dokumentą, gautą JSON ir patikros rezultatą. Greičio ar tikslumo procentus skelbti tik su konkrečia bandymo imtimi.

**Originali nauda:** Ištrauktų laukų ir patikros klaidų pavyzdys su aiškiu stabdymo sprendimu.

**Šaltiniai ir patikra:** Aktuali B1 ir Rivilės API dokumentacija pasirinktam produktui; Faktinės V2 nuskaitymo ir validavimo taisyklės; Mokestinio pavyzdžio pirminis šaltinis, jei toks pavyzdys naudojamas. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `support/support-finance-tracker.md`, `testing/testing-reality-checker.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/saskaitu-valdymas/, /integracijos/b1/, /integracijos/rivile/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Sintetinė sąskaita → ištraukti laukai → patikra → apskaitos įrašo projektas.

**Kitas veiksmas:** „Peržiūrėti sąskaitos laukų patikros pavyzdį“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-12-03 09:00 Europe/Vilnius; publishAt – 2026-12-03T07:00:00.000Z.

### S12 Mokėjimų priminimų automatizavimas: apmokėjimo patikra ir mandagi komunikacija

**URL:** /straipsniai/skolu-priminimu-automatizavimas/

**Skaitytojas:** Finansų specialistas ir paslaugų verslo vadovas.

**Klausimas:** Kaip priminti apie mokėjimą nesuklystant dėl jau apmokėtos ar ginčijamos sąskaitos?

**Pagrindinė užklausa:** skolų priminimų automatizavimas. Variantai: vėluojančių mokėjimų priminimų šablonai; sąskaitų apmokėjimo sekimas.

**Riba:** Mokėjimo būsenos ir priminimų eiga; nepakeičia teisinio skolų išieškojimo ar visos finansų analitikos.

**Turinio eiga:**

1. Prieš kiekvieną priminimą iš naujo sutikrinti apmokėjimą, sumą, kreditinį dokumentą, ginčą ir mokėjimo susitarimą.
2. Pateikti pasirenkamą keturių žingsnių seką. Dienos yra aiškiai įvardyti pavyzdžio nustatymai, ne teisės aktu nustatyti terminai.
3. Atskirti informacinį priminimą, žmogaus kontaktą ir pagal sutartį galimą kitą veiksmą. Nežadėti automatinio paslaugos sustabdymo kaip visuotinės teisės.
4. Parodyti dubliavimo prevenciją, gavėjo patikrą ir sustabdymą pasikeitus mokėjimo būsenai.

**Originali nauda:** Keturi pavyzdiniai tekstai ir jų siuntimo bei sustabdymo sąlygų lentelė.

**Šaltiniai ir patikra:** Faktinės sutarties ir mokėjimų derinimo taisyklės; Galiojantys pirminiai teisės šaltiniai tik toms teisinėms išvadoms, kurios pateikiamos. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `support/support-finance-tracker.md`, `support/support-support-responder.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/saskaitu-valdymas/, /sprendimai/finansu-analitika/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Būsenų schema: neapmokėta, suderinta, ginčijama, apmokėta ir priminimo sustabdymas.

**Kitas veiksmas:** „Peržiūrėti mokėjimo priminimų tekstus ir sąlygas“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-12-08 09:00 Europe/Vilnius; publishAt – 2026-12-08T07:00:00.000Z.

### S13 Sutarčių rengimas ir pasirašymas su Dokobit: procesas nuo CRM iki dokumento archyvo

**URL:** /straipsniai/sutarciu-pasirasymas-dokobit/

**Skaitytojas:** Operacijų vadovas ir integracijos programuotojas.

**Klausimas:** Kaip patikimai sekti sutarties parengimą, kvietimą ir galutinį pasirašymo rezultatą?

**Pagrindinė užklausa:** sutarčių pasirašymas Dokobit API integracija. Variantai: automatizuotas sutarčių rengimas; elektroninis parašas B2B sutartyse.

**Riba:** Visas dokumento procesas; Dokobit integracijos puslapis aprašo jungties techninius reikalavimus.

**Turinio eiga:**

1. Sutarties projektą rengti iš patvirtintų CRM laukų ir šablono. Prieš kvietimą patikrinti šalį, gavėją ir dokumento versiją.
2. Dokobit produkto ir API būdą parinkti pagal realią dokumentaciją bei turimą prieigą. Dokumento pateikimas pasirašyti pats savaime nėra kvalifikuoto parašo įrodymas.
3. Patikrinti pranešimo kilmę ir pasirašymo būseną, apdoroti pasikartojančius įvykius ir atsisiųsti tikrą galutinį dokumentą.
4. Atskirti elektroninio parašo teisinį lygį nuo API techninio pavyzdžio. API adresus, parametrus ir parašo rezultatą prieš publikavimą patikrinti pirminiame šaltinyje.

**Originali nauda:** Duomenų ir būsenų schema su nepasirašymo, pasikartojančio įvykio ir galutinio archyvavimo atvejais.

**Šaltiniai ir patikra:** Oficiali pasirinkto Dokobit API produkto dokumentacija; Aktualus eIDAS tekstas ir taikytina parašo patikra. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `specialized/specialized-workflow-architect.md`, `testing/testing-reality-checker.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/dokumentu-valdymas/, /integracijos/dokobit/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** CRM → sutarties projektas → kvietimas → būsenos patikra → galutinis archyvas.

**Kitas veiksmas:** „Peržiūrėti sutarčių automatizavimo proceso schemą“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-12-10 09:00 Europe/Vilnius; publishAt – 2026-12-10T07:00:00.000Z.

### S14 Vidinė įmonės žinių bazė ir RAG: dokumentų parengimas, prieigos ir atsakymai su šaltiniais

**URL:** /straipsniai/vidine-ziniu-baze-rag/

**Skaitytojas:** IT ir operacijų vadovas.

**Klausimas:** Kaip pateikti agentui tinkamus įmonės dokumentus ir tikrinti atsakymo pagrįstumą?

**Pagrindinė užklausa:** vidinė įmonės žinių bazė RAG diegimas. Variantai: RAG veikimo principas versle; DI atsakymai iš įmonės dokumentų.

**Riba:** Dokumentų parengimo, paieškos ir patikros metodika; bendras komercinis diegimas lieka RAG sprendimo puslapyje.

**Turinio eiga:**

1. Atskirti pokalbio būseną, struktūrizuotus duomenis ir paiešką dokumentuose. Ne kiekvienam agento veiksmui reikia RAG.
2. Segmentuoti dokumentus išsaugant antraštes, versiją, kilmę ir prieigos teises. Nedėti universalaus visiems dokumentams tinkamo segmento dydžio.
3. Prieigos filtrą taikyti prieš pateikiant dokumento turinį modeliui. Užklausos tekstu neleisti pakeisti dokumentų matomumo.
4. Tikrinti atsakymą ir jo šaltinio ištrauką. Neradus pagrindo agentas turi pranešti apie informacijos trūkumą arba perduoti klausimą. RAG nesuteikia garantijos, kad klaidų nebebus.

**Originali nauda:** Dokumentų parengimo matrica ir keli atsakymo su šaltiniu bei atsisakymo atsakyti atvejai.

**Šaltiniai ir patikra:** Faktinė V2 paieškos ir prieigos architektūra; Pasirinktos paieškos sistemos pirminė dokumentacija; Išsaugoti atsakymo ir šaltinio atitikties bandymai. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `specialized/zk-steward.md`, `testing/testing-reality-checker.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/ziniu-baze-rag/, /kokybes-kontrole/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Prieigos filtras → dokumentų paieška → šaltinio ištrauka → pagrįstas atsakymas arba perdavimas.

**Kitas veiksmas:** „Peržiūrėti žinių bazės dokumentų parengimo matricą“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-12-15 09:00 Europe/Vilnius; publishAt – 2026-12-15T07:00:00.000Z.

### S15 Užduočių delegavimo automatizavimas: nuo kliento laiško iki atsakingo komandos nario

**URL:** /straipsniai/vidiniu-uzduociu-delegavimas/

**Skaitytojas:** Operacijų ir projektų vadovas.

**Klausimas:** Kaip iš užklausos sukurti aiškią užduotį be dublikatų ir nepagrįstų terminų?

**Pagrindinė užklausa:** užduočių delegavimo automatizavimas. Variantai: kliento laiško pavertimas užduotimi; operacijų automatizavimas projektų sistemoje.

**Riba:** Vienos užklausos pavertimas valdoma užduotimi; dokumentų valdymo ir viso projektų portfelio nedubliuoja.

**Turinio eiga:**

1. Išskirti norimą rezultatą, reikalingus duomenis ir atsakomybės ribą. Atskirti pasiūlytą terminą nuo jau sutarto įsipareigojimo.
2. Pagal patvirtintas taisykles pasirinkti komandą ir atsakingą asmenį. Neaiškią užklausą perduoti tikslinti.
3. Naudoti šaltinio identifikatorių dublikatams išvengti. Kurti tik realios projektų sistemos palaikomus laukus ir būsenas.
4. Kontroliuoti terminus, priklausomybes ir perdavimą kitam atsakingam asmeniui; suvestinėje rodyti sprendimo priežastį.

**Originali nauda:** Užklausos laukų ir atsakomybės matrica su pasikartojančio laiško pavyzdžiu.

**Šaltiniai ir patikra:** Pasirinktos Jira, Asana arba ClickUp API dokumentacija; V2 užduoties identiteto ir vykdymo būsenos taisyklės. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `project-management/project-management-project-shepherd.md`, `project-management/project-management-studio-producer.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/operacijos/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Laiškas → užduoties laukai → atsakingas asmuo → vykdymas ir grįžtamasis ryšys.

**Kitas veiksmas:** „Peržiūrėti užduočių delegavimo taisyklių pavyzdį“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-12-17 09:00 Europe/Vilnius; publishAt – 2026-12-17T07:00:00.000Z.

### S16 Naujo darbuotojo įvedimo automatizavimas: prieigos, mokymosi medžiaga ir kontroliniai taškai

**URL:** /straipsniai/darbuotojo-ivedimo-onboarding-automatizavimas/

**Skaitytojas:** Personalo ir operacijų vadovas.

**Klausimas:** Kaip suderinti dokumentus, prieigas ir darbuotojo pirmųjų dienų užduotis?

**Pagrindinė užklausa:** darbuotojo įvedimo automatizavimas. Variantai: naujo darbuotojo įvedimo planas; onboarding kontrolinis sąrašas.

**Riba:** Konkreti įvedimo eiga; HR sprendimo puslapis pristato platesnę personalo procesų apimtį.

**Turinio eiga:**

1. Parengti pasirenkamą keturiolikos dienų pavyzdį: pasiruošimas, pirma diena, pirma savaitė ir grįžtamasis ryšys. Tai nėra visiems privalomas laikotarpis.
2. Prieigas susieti su patvirtinta pareigybe ir leidimų rinkiniu. Tikrinti tapatybę, pradžios datą, sėkmingą sukūrimą ir atšaukimą pasikeitus planui.
3. Mokymosi medžiagą ir vidaus tvarkas pateikti pagal darbuotojo poreikį ir prieigos teisę. Peržiūros faktas savaime neįrodo išmokimo ar teisinio supažindinimo.
4. Numatyti vadovo patikrą, trūkstamų prieigų eskalavimą ir grįžtamąjį ryšį. Tikrus darbo teisės teiginius tikrinti atskirai.

**Originali nauda:** Keičiamas įvedimo kontrolinis sąrašas su atsakingu asmeniu, būsena ir prieigos atšaukimo veiksmu.

**Šaltiniai ir patikra:** Įmonės patvirtintos personalo ir prieigų taisyklės; Pasirinktų tapatybės ir HR sistemų dokumentacija. Šaltinio paminėjimas užduotyje nėra jo turinio patikros įrodymas; konkrečios ištraukos ir versijos tikrinamos rengiant tekstą.

**Agentų profiliai:** `project-management/project-management-project-shepherd.md`, `support/support-support-responder.md`. Tai vaidmenų parinkimas; veiksmus vykdo V2 su konkrečiais įrankiais ir teisėmis.

**Būtini susiję puslapiai:** /sprendimai/hr-procesai/, /sprendimai/dokumentu-valdymas/. Papildomi kontekstiniai ryšiai saugomi JSON inventoriuje ir tampa aktyvūs tik esant tinkamam tikslui.

**Temos vizualas:** Laiko juosta su dokumentų, prieigų, mokymosi ir vadovo patikros žingsniais.

**Kitas veiksmas:** „Peržiūrėti naujo darbuotojo įvedimo kontrolinį sąrašą“. Turinys turi pateikti pažadėtą pavyzdį. Atsisiuntimo mygtuko nepridėti, kol failas neparengtas.

**Data:** 2026-12-22 09:00 Europe/Vilnius; publishAt – 2026-12-22T07:00:00.000Z.

## Agentų šaltiniai ir profilių atitiktis

Profilių keliai susieti su konkrečia [agency-agents versija](https://github.com/msitarzewski/agency-agents/tree/4e3ac3ca6604c75113f52c695dbddcc7af928b46). Naujesnė repo versija nėra tylus leidimas perrašyti jau patvirtintą turinį; atnaujinant peržiūrimi pasikeitę profiliai ir jų panaudojimas.

| Patikrintas failo kelias | Šaltinis |
| --- | --- |
| design/design-ui-designer.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/design/design-ui-designer.md) |
| design/design-ux-researcher.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/design/design-ux-researcher.md) |
| engineering/engineering-backend-architect.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/engineering/engineering-backend-architect.md) |
| engineering/engineering-devops-automator.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/engineering/engineering-devops-automator.md) |
| engineering/engineering-frontend-developer.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/engineering/engineering-frontend-developer.md) |
| marketing/marketing-content-creator.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/marketing/marketing-content-creator.md) |
| marketing/marketing-seo-specialist.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/marketing/marketing-seo-specialist.md) |
| paid-media/paid-media-ppc-strategist.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/paid-media/paid-media-ppc-strategist.md) |
| paid-media/paid-media-search-query-analyst.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/paid-media/paid-media-search-query-analyst.md) |
| product/product-feedback-synthesizer.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/product/product-feedback-synthesizer.md) |
| project-management/project-management-project-shepherd.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/project-management/project-management-project-shepherd.md) |
| project-management/project-management-studio-producer.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/project-management/project-management-studio-producer.md) |
| sales/sales-deal-strategist.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/sales/sales-deal-strategist.md) |
| sales/sales-outbound-strategist.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/sales/sales-outbound-strategist.md) |
| security/security-ai-generated-code-auditor.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/security/security-ai-generated-code-auditor.md) |
| specialized/agents-orchestrator.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/specialized/agents-orchestrator.md) |
| specialized/specialized-workflow-architect.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/specialized/specialized-workflow-architect.md) |
| specialized/zk-steward.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/specialized/zk-steward.md) |
| support/support-analytics-reporter.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/support/support-analytics-reporter.md) |
| support/support-finance-tracker.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/support/support-finance-tracker.md) |
| support/support-support-responder.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/support/support-support-responder.md) |
| testing/testing-api-tester.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/testing/testing-api-tester.md) |
| testing/testing-reality-checker.md | [Profilis](https://github.com/msitarzewski/agency-agents/blob/4e3ac3ca6604c75113f52c695dbddcc7af928b46/testing/testing-reality-checker.md) |

Workflow Architect naudojamas proceso architektūrai, o konkrečias užklausas ir veiksmus atlieka priskirti vykdytojai. Saugumo peržiūrai parinktas security/security-ai-generated-code-auditor.md. Agento vardas ar jo instrukcijose aprašyta funkcija savaime neįrodo, kad adapteris jau prijungtas, veiksmas įvykdytas ar saugumas patvirtintas.

## Failai ir demonstracijų įrodymai

Tai vidinis parengimo registras. Būsena „parengti ir patikrinti“ nerodoma lankytojui kaip produkto etiketė. Vieša publikacija arba pateikia tikrą pažadėtą rezultatą, arba apsieina be nepagrįsto pažado. Failo pavadinimas, kodo pavyzdys ir tikras sistemos bandymas turi skirtingą įrodomąją vertę.

| ID | Reikalingas rezultatas | Susijęs turinys | Būsena |
| --- | --- | --- | --- |
| A01 | B2B atrankos filtrų specifikacija | S1 (B2B atranka) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A02 | Bandomosios užklausos analizės žurnalas | S2 (Pasiūlymų ruošimas) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A03 | Pavyzdinis sugeneruotas PDF pasiūlymas | S2 (Pasiūlymų ruošimas) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A04 | WebRTC delsos matavimo protokolas | S3 (Balso agentai) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A05 | Demonstraciniai garso įrašai (3 vnt.) | S3 (Balso agentai) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A06 | Eskalavimo taisyklių matrica | S4 (Aptarnavimo taisyklės) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A07 | Redaktoriaus patikros kontrolinis sąrašas | S5 (Turinio fabrikas) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A08 | ROAS optimizavimo taisyklių konfigūracija | S6 (Reklamos biudžetas) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A09 | JSON-LD struktūrinių duomenų šablonai | S7 (GEO optimizavimas) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A10 | Figma kintamųjų sinchronizavimo skriptas | S8 (Dizaino sistemos) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A11 | CI/CD saugumo testavimo YAML konfigūracija | S9 (Kodo testavimas) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A12 | Atsiliepimų klasifikavimo taksonomija | S10 (Atsiliepimų analizė) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A13 | Sąskaitos nuskaitymo ir validavimo pavyzdys | S11 (Sąskaitų OCR) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A14 | Priminimų sekos tekstinių šablonų paketas | S12 (Skolų priminimai) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A15 | Dokobit API integracijos demonstracinis kodas | S13 (Dokobit e-parašas) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A16 | RAG dokumentų skaidymo specifikacija | S14 (Vidinė žinių bazė) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A17 | Užduočių delegavimo taisyklių konfigūracija | S15 (Vidinis delegavimas) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A18 | 14 dienų naujo darbuotojo įvedimo kontrolinis sąrašas | S16 (Darbuotojų įvedimas) | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A19 | B1.lt API integracijos konfigūracija | /integracijos/b1/ | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A20 | Rivilė Gama / EPI užklausų struktūra | /integracijos/rivile/ | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |
| A21 | Procesų audito klausimynas | /istekliai/procesu-audito-sablonas/ | Parengti ir patikrinti; atsisiuntimas nepatvirtintas |

Prie kiekvieno parengto failo fiksuojama tikra vieta ir versija, kilmė, patikros būdas bei susijusi straipsnio revizija. Demonstracinis JSON nėra realaus kliento atvejis. Balso metodika nėra delsos matavimas. Veikiantis API pavyzdys nėra produkcinio kliento integracijos priėmimas. Ankstesni nepatvirtinti balso laiko skaičiai pašalinti ir neperkeliami į naujus tekstus.

Failui neprivaloma išgalvota produkcinė patikra: statinį šabloną reikia realiai perskaityti ir išbandyti pagal paskirtį, o teiginį apie sistemos veikimą pagrįsti tikru sistemos bandymu. Parengus keičiamas tik atitinkamas įrašas ir paveikto turinio peržiūra.

## Svetainės techninis prijungimas

Šio projekto struktūrą ir turinio apimtį nustato Verslomatikos produkto poreikiai bei [projekto susitarimas](antigravity/PROJECT_RULES.md). Panaudojama jau sukurta publikavimo pagal datą galimybė. Kitų nišų etapų, pasirengimo terminų ir publikacijų kvotų šiai svetainei netaikome.

Parengus tekstus, techninio prijungimo metu susiejami puslapiai, nuorodos, metaduomenys, vaizdai ir datos. Tikrinamas realus svetainės vaizdas bei kontaktų ir produkto veiksmai. Publikavimo pagal datą patikra turi parodyti, kad straipsnis ir jo nuorodos atsiranda numatytu laiku. Rašytojas gali užbaigti visą turinį nepriklausomai nuo šių vėlesnių programavimo darbų.

Turinio kokybė vertinama pagal tikslų atsakymą, savitą praktinę naudą, šaltinių bei kalbos tikslumą ir aiškų skaitytojo veiksmą. Universalaus žodžių kiekio ar garantuotą AI citavimą suteikiančios schemos nenustatome.

## Teisinių šaltinių taikymas

S1 teisinės dalies atskaitos šaltinis yra [VDAI 2026 m. gegužės 19 d. DUK](https://vdai.lrv.lt/public/canonical/1779182967/1405/05-19_DUK_Tiesiogin%C4%97%20rinkodara_juridiniai_asm_svetainei.pdf), kuriame paaiškintas nuo 2026 m. balandžio 22 d. įsigaliojęs ERĮ 81 straipsnio pakeitimas. Išankstinio sutikimo išimtis juridinio asmens abonentui ir atsisakymo galimybė neprilyginamos neribotam asmens duomenų tvarkymui.

BDAR teisėtas interesas pasirenkamas įvertinus konkrečias sąlygas. [EDPB gairių 1/2024 konsultacinė versija](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf) aiškina trijų sąlygų vertinimą: teisėtą interesą, būtinumą ir interesų pusiausvyrą. Vėlesnį patvirtintą gairių variantą ir galiojantį teisės tekstą reikia tikrinti rengiant galutinę publikaciją.

XV-815 identifikatorius rastas oficialiame TAR registre; tiesioginis TAR teksto atvėrimas šios peržiūros metu grąžino 403, todėl straipsnio teiginiai čia negrindžiami neįskaitytu įstatymo tekstu ar viso pakeitimo įstatymo įsigaliojimo datos supaprastinimu. Prieš S1 publikaciją patikrinama tuo metu aktuali ERĮ ir BDAR redakcija. Viešam paaiškinimui pakanka tiksliai nurodyto 81 straipsnio pakeitimo ir jo taikymo datos.

## Įgyvendinimo eilė ir atsakomybė

1. Codex parengia visą struktūrą ir kiekvieno URL rašymo užduotį, tikrą tyrimo kontekstą, šaltinių taisykles bei rezultatų formatą.
2. Antigravity / Gemini perskaito [pilną perdavimo paketą](antigravity/START_HERE.md), atlieka atskirą aktualų kiekvienos temos interneto tyrimą ir parašo visus 74 konkrečių URL tekstus bei vieną agento puslapio šabloną. Pateikia originalius pavyzdžius, metaduomenis, sąsajos tekstus ir kalbos saviredakciją.
3. Rašytojas registruoja tikras šaltinių vietas ir konkrečias privačias priklausomybes; kainų, klientų rezultatų ar veikimo įrodymų neišgalvoja.
4. Codex vėlesniame įgyvendinimo etape patikrina gautus tekstus, faktines tapatybes, esamas revizijas, priedus, vaizdus ir tikrą atvaizdavimą. Techninį prijungimą parenka pagal šios svetainės poreikius ir jau turimas tinkamas galimybes. Šis perdavimas vykdomo importo neapima.
5. Tikri V2 importo, datos ir talpyklos bandymai atliekami prieš tvirtinant, kad kalendorius veikia. Viešas įdiegimas išlieka atskiras veiksmas.
6. Po realaus paskelbimo matuojamas indeksavimas, tinkamos užklausos ir produkto naudojimas. AI citatos vertinamos pagal konkretų variklį, datą ir atsakymų imtį. Publikavimo laikas nėra Google indeksavimo laikas.

Šiuo etapu parengta struktūra ir rašymo užduotis. Pilni tekstai, 21 priedų registro rezultatas, importas ir įdiegimas nėra pažymėti atliktais. Ankstesnį darbo pasidalijimą pakeitė tiesioginis savininko nurodymas: galutinius tekstus rašo Antigravity / Gemini.
