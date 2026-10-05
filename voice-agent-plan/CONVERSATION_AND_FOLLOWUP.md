# Pokalbio ir tolesnio bendravimo eiga

Siūloma produkto ir agentų elgsena 2026-09-30. Tikslas — profesionalus konsultantas, kuris išklauso poreikį, pateikia pagrįstą atsakymą ir sukuria tinkamą kitą žingsnį. Klientui turi būti aišku, kad kalba su AI; profesinis tonas nesukuria neegzistuojančio žmogaus, kompetencijos pažymėjimo ar verslo pajėgumo.

## Skambučio widget

Mygtukas: **„Kalbėti su AI konsultantu“**. „Skambinti“ gali būti papildomas paaiškinimas, bet neturi imituoti neegzistuojančio telefono numerio. Paspaudimas pradeda internetinį balso pokalbį su mikrofono leidimu; tai nėra PSTN skambutis.

Widget scenarijus:

1. Prieš mikrofono įjungimą matomi nišos pavadinimas, AI žyma, trumpas pokalbio duomenų naudojimo tekstas ir privatumo nuoroda. Žmogus gali pasirinkti įprastą formą.
2. Klientas paspaudžia „Pradėti pokalbį“. Nenaudojamas automatiškai įsijungiantis mikrofonas ar garsas.
3. Prisijungimo ekranas rodo tikrą būseną ir leidžia nutraukti. Atmetus mikrofono leidimą pateikiama aiški forma ar teksto alternatyva.
4. Pokalbyje yra mute, pabaigos mygtukas, ryšio būklė ir pasirenkamas transkriptas. Kontaktą galima palikti bet kada pačiam arba agentui iškvietus kontakto langą įrankiu `ui.open_contact_form`.
5. Normaliai baigus arba nutrūkus pokalbiui šiame puslapyje automatiškai atveriama kontakto forma, jei kontakto dar nėra. Jei kontaktas jau išsaugotas, rodoma patvirtinimo ir redagavimo galimybė. Laukai nepanaikinami po tinklo klaidos.
6. Išsaugojus kontaktą rodoma „Prašymas išsaugotas“. „Išsiųsta“ rodoma tik pagal tikrą pristatymo būseną; SMTP priėmimas vadinamas perdavimu pašto serveriui.

Bibliotekos ir garso kodas kraunami paspaudus mygtuką. SEO turinys lieka serverio HTML. Klaviatūros fokusas, dialogo uždarymas, ekrano skaitytuvo būsenos, mobilus išdėstymas ir aiškūs garso valdikliai yra priėmimo kriterijai.

## Privalomas prisistatymas ir kontakto priminimas

Pirmo etapo įžangos pavyzdys, pritaikomas pagal realų profilį:

> Sveiki, esu šios svetainės virtualus AI konsultantas. Prireikus pokalbio metu arba jo pabaigoje galėsite ekrane palikti el. paštą arba telefoną, kad pagal jūsų užklausą tęstume bendravimą. Kuo galiu padėti?

Šis tekstas nėra Google dokumentacijos citata; tai siūlomas produkto scenarijus. Nišos profilis gali patikslinti, kokią informaciją iš tikrųjų įmanoma parengti. Negalima sakyti „atsiųsime kainą“, jei kainos šaltinio nėra.

Priminimas turi būti užtikrinamas programiškai: prieš laisvą modelio kalbėjimą atkuriamas patvirtintas įžangos garso asset, kurio tekste yra AI ir kontakto paaiškinimas. Įrašas gali būti parengtas TTS ir peržiūrėtas kaip produkto medija. Sesija registruoja įžangos versiją ir playback būseną. Jei garsas neveikia, tas pats paaiškinimas aiškiai rodomas ekrane; vien prompto pažado neužtenka.

Prieš užbaigimą agentas trumpai apibendrina ir primena kontakto formą arba patvirtina, kad kontaktas jau išsaugotas. Kontakto priminimo nereikia kartoti po kiekvieno atsakymo. Jei klientas netikėtai nutraukė ar uždarė puslapį, sistema nefabrikuoja, kad jis išgirdo atsisveikinimą.

## Agento iškviečiamas kontakto langas

Pagal savininko patikslinimą 2026-09-30 agentas gali atverti el. pašto arba telefono įvedimą bet kuriuo tinkamu pokalbio momentu: klientui paprašius pasiūlymo, registracijos, papildomos informacijos ar susisiekimo. Tai bendras visų nišų UI įrankis, susietas su konkrečiu pokalbiu.

Pavyzdinė eiga:

1. Agentas iškviečia `ui.open_contact_form` ir nurodo leidžiamus kontakto laukus bei tęsinio paskirtį.
2. Serveris perduoda tipizuotą komandą to paties pokalbio widget. Jis atveria dialogą esamame puslapyje; balso ryšys lieka aktyvus.
3. Widget praneša serveriui, kad langas parodytas. Tik tada agentas gali pasakyti: **„Dabar savo ekrane galite įvesti el. paštą arba telefono numerį.“** Jei parodymas nepatvirtintas, agentas siūlo matomą kontakto mygtuką arba kitą veikiančią eigą.
4. Klientas įveda ir pateikia duomenis. Serveris juos patikrina, patvariai išsaugo ir užregistruoja `ContactSubmitted`.
5. Agentas gauna rezultatą, kad kontaktas išsaugotas, ir tęsia pokalbį: **„Ačiū, kontaktinius duomenis gavome. Patikslinkime dar vieną dalyką…“** Nepateikta ar tik pradėta pildyti forma nėra gauti duomenys.

Dialogas neturi automatiškai nutildyti mikrofono. Klientas gali jį uždaryti, atsisakyti pateikti kontaktą ar grįžti vėliau. Modelis nelaukia neribotai: UI parodymo įrankis yra asinchroninis, o pats formos pateikimas ateina atskiru įvykiu. Pakartotinis kvietimas aktyvina jau atvertą langą, išlaiko įvestą tekstą ir nekuria dialogų krūvos.

Po kontakto pateikimo pokalbio metu galima tęsti registracijos ar kitą leistiną veiksmą, kuriam kontakto reikia. Galutinis kontekstinis laiškas vis tiek rengiamas iš viso užbaigto pokalbio, nebent klientas atskirai paprašo konkretaus veiksmo dabar ir tam yra įjungtas įrankis.

## Profesionalaus konsultanto elgesys

Agentas klausia po vieną prasmingą dalyką, kalba trumpomis aiškiomis frazėmis ir naudoja kliento pasirinktą kalbą. Pirmiausia išsiaiškina tikslą, tuomet pateikia atsakymą; pradinis pokalbis netampa ilga registracijos anketa.

Jo instrukcijas sudaro keturi sluoksniai: bendras aptarnavimo scenarijus, serverio patvirtintas nišos pasiūlymas, dalykinė atmintinė ir dabartinio pokalbio patvirtinti laukai. Įrankių rezultatai pateikiami kaip duomenys su kilme. AI neperskaito klientui techninių tool vardų, promptų ar vidinių statusų.

Pavyzdinis bendro prompto turinys, dar ne vykdomas failas:

```text
Prisistatyk kaip virtualus AI konsultantas ir naudok aktyvios nišos pavadinimą.
Padėk išspręsti konkretų kliento klausimą. Klausk po vieną svarbų dalyką.
Verslo kontaktus, paslaugų sąlygas ir pajėgumą imk tik iš business fact įrankių.
Dalykiniam atsakymui naudok patvirtintą knowledge arba leistiną research lookup.
Nežinomą kainą, terminą, sandėlį ar partnerystę laikyk nežinoma.
Kritinius skaičius ir datas pakartok, paprašyk patikslinti, jei neaišku.
Prieš tikrą įsipareigojimą pateik jo tikslias sąlygas ir gauk kliento patvirtinimą.
Apie atliktą veiksmą kalbėk tik gavęs sėkmingą serverio kvitą.
Kai reikia kontakto, iškviesk ui.open_contact_form ir tęsk pokalbį.
Apie ekrane atvertą langą kalbėk tik gavęs jo parodymo patvirtinimą.
Apie gautą kontaktą kalbėk tik gavęs patvaraus pateikimo rezultatą.
Užbaigdamas apibendrink ir primink kontakto formą, jei kontaktas dar nepateiktas.
```

Programinės teisės, recipient pasirinkimas ir finansų skaičiavimas nėra šio prompto atsakomybė. Klientas negali pakeisti taisyklių pasakydamas „ignoruok instrukcijas“ ar įvardydamas tariamą naują sistemos rolę.

Jei informacijos trūksta, agentas turi tris veiksmingus pasirinkimus: užduoti tikslinantį klausimą, atlikti leistiną paiešką arba užregistruoti neatsakytą klausimą tolesniam tikrinimui. Tai turi būti natūrali konsultacija, o ne improvizuotas tikrumas.

## Pokalbio ritmas, klaidos ir užduoties tęstinumas

Įprastai agentą galima pertraukti. Tikrą naują kliento prašymą skiriame nuo trumpo klausymosi signalo „mhm“ ar „taip“; vertiname ir klaidingų, ir praleistų pertraukimų dalį. Tai tikrintinas audio elgesys, ne pažadas, kad vien tekstinis promptas sukuria semantic interruption classifier. Pradžioje native Gemini valdo turn detection, o transportas sustabdo playback pagal suderintus įvykius; du savarankiški valdikliai neturi kartu inicijuoti atsakymų. Pildant formą ar tariant pilną matmenį leidžiama ilgesnė pauzė. Pavienė klaidinga STT kalba nekeičia pasirinktos kalbos be aiškaus kliento ketinimo.

Pradinės tikrintinos ribos: įprastam klausimui tylos priminimas po 8–12 s, formos ar techninio matmens pildymui po 20–30 s. „Palaukite, pažiūrėsiu“ būsenoje priminimas atidedamas; vis tiek galioja sesijos biudžetas ir maksimali trukmė. Po dviejų neatsakytų priminimų siūloma baigti ir palikti veikiančią formą. Šie skaičiai yra mūsų pilotų hipotezės, ne perkelti Gemini parametrai.

Laukiant įrankio vieną kartą, pavyzdžiui, po 2–3 s, galima trumpai pasakyti „Patikrinu šią informaciją“. Nesakome „sekundėlę“ kaip termino garantijos. Progress audio ir native modelio replika derinami per vieną output valdytoją; užbaigus užklausą stale filler nebegrojamas. Tool deadline viršijimas turi aiškų rezultatą ir tikrą tęsinį, ne kartojamą frazę.

Temos pokytis neištrina jau patvirtintų poreikio laukų. Konsultantas gali trumpam paaiškinti konstrukcijos skirtumą ir grįžti prie parinkimo. Pataisius matmenį ar terminą panaikinamos nuo senos reikšmės priklausančios rekomendacijos; išorinio veiksmo pakeitimas turi atskirą procedūrą. Aiškus kliento baigimo prašymas stabdo naujus klausimus. Operatorius arba telefoninis perdavimas siūlomas tik turint realų kanalą ir pajėgumą.

Serverio [CustomerNeedState](ROUTING_AND_INTELLIGENCE.md) atskiria atsakytą, praleistą, nežinomą ir netaikomą temą. Ekrane galima rodyti poreikio juodraštį, kritinio matmens kortelę ir patikrintus šaltinius; pažangos procentas nėra registracija. [AI_teacher vedlio adaptacija](AI_TEACHER_REVIEW.md).

## Traktorių padangų scenarijaus eiga

Remiamasi [dabartine nišos dokumentacija](../sites/traktoriupadangos.md). Ji patvirtina informacinį vietinį pilotą ir kontaktą, tačiau ne mūsų tiekėjų sąrašą ar gebėjimą įvykdyti pardavimą.

Poreikio laukų pavyzdys:

- Tikslas: pakeisti esamą dydį, rasti analogą, suprasti žymėjimą ar gauti tikrą tiekėjo pasiūlymą.
- Mašinos markė, modelis ir ašis, jei reikia parinkimo.
- Visas esamos padangos žymėjimas, pageidaujamas kiekis ir turima nuotrauka.
- Darbo pobūdis, apkrovos bei greičio aplinkybės, jei jos svarbios konkrečiam techniniam klausimui.
- Kliento terminas ir vieta, kai tai reikalinga tolesnei užklausai.

Klausimus rinkti pagal situaciją, o ne priversti kiekvieną klientą užpildyti visus laukus. Dydį iš garso pateikti ir ekrane: „Ar teisingai supratau 460/85R30?“ Neaiškiame atpažinime nereikia spėti R ar vieno skaitmens.

Gamintojo duomenys gali paaiškinti ženklinimą ar konstrukcijos skirtumą. Konkretus tinkamumas, slėgis ir alternatyvus dydis turi atitikti mašiną bei specifikaciją. Agentas nepateikia universalios pavojingo pripūtimo ar montavimo instrukcijos ir nežada saugaus keitimo vien pagal semantinį panašumą.

Pirmos fazės tęsinys: poreikio santrauka, naudingi patvirtinti gidai ir trūkstamų duomenų klausimas. Pavyzdžiui, klientui reikia pilno šoninės sienelės žymėjimo nuotraukos. Laiškas nevadinamas komerciniu pasiūlymu su mūsų kaina.

Vėlesnė pardavimo eiga: realus tiekėjo adapteris gauna modelį, dydį, kainą, PVM sąlygas, pristatymą, likutį ir galiojimą; core apskaičiuoja leistiną pasiūlymą. Tik šioje būsenoje AI gali pateikti komercinį dokumentą. Tiekėjas turi būti tikras šio verslo partneris, o ne atsitiktinis paieškos rezultatas.

## Kontaktų forma

Siūloma antraštė: **„Kur atsiųsti atsakymą į jūsų užklausą?“**

Formoje klientas pasirenka el. paštą arba telefoną ir mato tik įjungto kanalo veiksmą. El. paštui: „Atsiųsti informaciją pagal šį pokalbį“. Telefonui su SMS adapteriu: „Gauti SMS su tolesniu žingsniu“. Telefonui su realia callback eiga: „Paprašyti susisiekti“. Neveikiančio kanalo pažado nerodyti.

Kontaktas normalizuojamas, bet nereikia tyliai keisti vietinio telefono į bet kurios šalies numerį. Šalies kodą klientas patvirtina; serveris tikrina E.164 formatą. El. pašto formatas neįrodo jo nuosavybės. Laisvas papildomas pastabų laukas ribojamas dydžiu.

Prašymas tęsti konkretų pokalbį yra atskirtas nuo pasirenkamo rinkodaros sutikimo. Nė vienas checkbox iš anksto nepažymimas. Naujienlaiškio, kitų nišų pasiūlymų ir portfelio cross-sell šis prašymas savaime neleidžia.

Forma neprivalo prašyti vardo, jei jo nereikia atsakymui. Ji saugo channel, purpose, request time, privacy notice version ir verification būklę. Recipient gaunamas iš formos įrašo; analitikas negali sugalvoti ar pakeisti adreso.

Jei kanalas užblokuotas ar neegzistuoja, klientas gauna tik išsaugoto prašymo būseną ir veikiančią alternatyvą. Tik telefonas neužbaigia el. laiško proceso. Automatiniai išoriniai AI skambučiai yra vėlesnis atskiras kanalas su tikru teikėju, leidimais ir patikromis.

## Du nepriklausomi procesai po pokalbio

```text
ConversationFinalized → transcript patikra → analizė → AnalysisCompleted
ContactSubmitted → kontakto ir prašymo patikra → ContactReady

AnalysisCompleted + ContactReady + leidžiama politika → followup parengimas
```

Analizė nelaukia formos; forma nelaukia analizės. Kiekvienas įvykis patikrina, ar jau yra abu rezultatai. Unique constraint ir outbox transaction neleidžia išsiųsti du kartus, jei įvykiai atėjo kita tvarka.

Kiekvienas užbaigtas ar nutrūkęs pokalbis taip pat sukuria atskirą `QualityReview` darbą. Jis vertina poreikio supratimą, įrodymus, pokalbio klaidas ir korekcijų galimybes. Kokybės analizė nepriverčia kliento laukti laiško; jos candidate pataisos praeina regresijas ir valdomą rollout. [Automatinė savikalibracija](SELF_CALIBRATION.md).

Iki konfigūruoto finalization termino surenkami vėluojantys transkripto fragmentai ir įrankių kvitai. Trūkstami duomenys pažymimi, o ne užpildomi fantazija. Vėliau atėjęs svarbus įvykis sukuria naują analizės versiją; jau išsiųstas laiškas tyliai neperrašomas ir papildomas laiškas siunčiamas tik jei to iš tikrųjų reikia.

## Analitiko rezultatas

Gemini 3.8 Flash gauna serverio transkriptą, patvirtintus kliento laukus, panaudotų šaltinių nuorodas, įrankių kvitus ir dabartinę nišos politiką. Jam nereikia kitos nišos klientų ar visos portfelio atminties. Rezultatas tikrinamas pagal tipizuotą schemą; struktūruota JSON išvestis negarantuoja turinio teisingumo. [Google structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).

Siūlomas `ConversationAnalysis` kontraktas:

```text
intent                 informacija / registracija / kainos poreikis / kita
customer_need          trumpa neutrali poreikio santrauka
confirmed_fields[]     reikšmė, transcript event refs ir patvirtinimo būsena
uncertain_fields[]     neaiški reikšmė, priežastis ir tikslinantis klausimas
answered_questions[]   atsakymas ir naudoto faktinio šaltinio refs
open_questions[]       ko dar reikia, kad galėtume tęsti
action_receipts[]      tik serverio pateikti atliktų veiksmų kvitai
next_step              vienas tinkamiausias tęsinys
followup_type          summary / clarification / booking / quote / escalation
evidence_coverage      complete / partial / insufficient
policy_flags[]         trūkstami faktai arba neleidžiamas įsipareigojimas
```

Kliento pareiškimas „man reikia rytoj“ yra pageidavimas; jis netampa mūsų pažadu pristatyti rytoj. Agento sakyti žodžiai „užregistravau“ nėra rezervacija, jei nėra tool receipt. Analitikas ypač tikrina šiuos skirtumus.

Siūloma analysis ir draft grandinė tame pačiame post-call vaidmenyje: pirmas kvietimas išgrynina poreikį; po faktų papildymo antras parengia artefaktą. Tai vis dar atskiras agentas nuo gyvo balso, o ne neribotas specialistų swarm. Papildomas vertintojas reikalingas rizikingesnei nišai ar aiškiai kokybės spragai.

## Atsakymo parengimas ir patikra

Profesionalus follow-up turi kliento klausimą atitinkančią temą, 1–2 sakinių poreikio santrauką, tik reikalingą atsakymą, aiškias nepatvirtintas sąlygas ir vieną konkretų kitą žingsnį. Jei reikalingas pasiūlymas ir turime jo faktus, siunčiamas pasiūlymas. Jei reikia dar vienos nuotraukos, siunčiamas trumpas tikslinantis laiškas.

Laiško pavyzdys informacinei padangų nišai, be išgalvotos kainos:

```text
Tema: Duomenys, kurių reikia jūsų traktoriaus padangų klausimui

Sveiki,

Pokalbyje aptarėme esamos padangos keitimą ir žymėjimą, kurį nurodėte.
Kad tolesnis atsakymas remtųsi tiksliu dydžiu, atsiųskite visos šoninės
sienelės žymėjimo nuotrauką ir traktoriaus modelį.

Žymėjimo paaiškinimą rasite žemiau pateiktoje šios svetainės gido nuorodoje.

MB Pinet
info@pinet.lt
```

Tikrame artefakte santrauka ir URL įdedami pagal konkretaus pokalbio duomenis bei gyvų puslapių registrą. Šis šablonas nėra teiginys, kad toks pokalbis jau įvyko.

Validatorius patikrina recipient, paskirtį, facts refs, kritines kainas, kontaktus, URL publikavimo būseną, terminus, versiją ir priedus. Nepagrįstas komercinis sakinys pašalinamas arba pakeičiamas tikslinimu. Klaidingas artefaktas nėra siunčiamas vien todėl, kad „kitas AI patvirtino“.

Kai mandatą atitinka visi duomenys, siuntimas automatinis. Žmogui perduodamos tik išimtys: neegzistuojantis verslo faktas, neturima prieiga arba neįvykdoma sąlyga. Svarbios neaiškios užklausos taip pat sukuria aiškią užduotį su trūkstamu lauku; nereikia peržiūrėti visų transkriptų.

## Pristatymas ir pokalbio tęstinumas

El. laiškas turi stabilų Message-ID, business/case nuorodą, patvirtintą siuntėją ir teisingą Reply-To. Operatorius bei klientas yra skirtingi delivery tikslai. Operatorius neturi gauti kopijos su kitos nišos duomenimis.

SMTP priėmimas, galutinis pristatymas, atmetimas ir kliento atsakymas yra atskiros būsenos. Testiniam laiškui galutinį gavimą patikrina tikslus Message-ID testinėje dėžutėje. Gamyboje rodome tik turimą transporto įrodymą. Timeout po siuntimo sukuria reconciliation būseną, o ne aklą pakartotinį laišką.

SMS siunčia trumpą žinutę ar saugią nuorodą; ilgi pasiūlymai ir transkriptai SMS netalpinami. Jautrios santraukos siunčiamos tik po adreso patvirtinimo ar per ribotos prieigos portalą. Pradinio kontakto įvedimas nėra nuosavybės įrodymas.

Kad procesas tęstųsi iki sandorio, vėlesnis inbound email/SMS adapteris susieja kliento atsakymą su business ir case. Sender adresas ir case ID vieni nesuteikia prieigos prie ankstesnių privačių duomenų. Sprendimų būsena tęsiama toje pačioje case, išlaikant dokumentų versijas ir prašyto kanalo ribas.
