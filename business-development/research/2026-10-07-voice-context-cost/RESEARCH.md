# Balso piloto sąnaudos ir kontekstas · 2026-10-07, antras ciklas

Klausimas: ar traktorių padangų konsultanto ekonomikai užtenka pokalbio minučių × viešo audio tarifo? Ne. Kainos modelis turi remtis faktiškai apdorotais tokenais, o visa paslaugos savikaina apima ir transportą, serverį bei po-pokalbinį darbą. Tai [VISION](../../VISION.md) autonomijos ekonomikos patikslinimas; naujo BDEV pasiūlymo nėra.

## Faktai ir deduplikacija

Tikras savininko pavedimas core sesijoje `01a0f1fa-3e13-7ab0-867b-d0091e73e1b7`, pranešimas `01a11510-32dc-7b22-8582-3f473a65ac7e`, prašo paruošti traktoriupadangos su paskambinamu AI. Šio domeno apimtis aiškiai išplėsta kitam vykdytojui; kitų nišų pirmos fazės ribos nesikeičia. Tai nėra šios idėjų sesijos P1/P2 ar BI eksperimento approval.

Read-only peržiūrėtas vykdytojo worktree `tractor-voice`, HEAD `bc34e9b9491aff159216bceb19f93e7e4b6ddf5c`: `sites/traktoriupadangos/IMPLEMENTATION_STATUS.md`, `voice-agent-plan/VOICE_LAUNCH_2026-10-07.md`, `agent-business-core/runtime/src/pinet_core/{pricing,voice_worker,contracts}.py` ir `tests/{test_pricing,test_budget}.py`. Būsena nurodo vietinį tikro garso pilotą, viešas paleidimas nepriimtas; serverio/LiveKit/DNS priklausomybės priskirtos tam vykdytojui. Jo kodas, procesai, DB, konfigūracija ir prieigos nekeisti. Nepriklausomo audio ar produkcijos bandymo čia nėra.

Kodas jau turi `live_estimate`: modalumų tokenų tarifus, nežinomo modalumo konservatyvią kainą, konkretaus modelio ir kainyno peržiūros galiojimo tikrinimą. `voice_worker` naudoja konteksto suspaudimą, abiejų krypčių transkripcijas, kumuliacinį `session_usage_updated` snapshot; pakartotinį snapshot neprideda antrą kartą. Matomas soft-stop ties 90% deklaruotos ribos. Kvitas žymimas `provider_estimate`, ne sąskaita. Testų failai turi kainyno ir pakartotinio usage atvejus; jų skaitymas nėra naujas testų PASS ar pilnas SDK tokenų perdavimo auditas. [ARCHITECTURE](../../../agent-business-core/ARCHITECTURE.md) jau numato tikras sąnaudas ir nežinomos kainos būseną. Naujo sąnaudų runtime nesiūlome.

## Aktualūs pirminiai šaltiniai

[Google Live best practices](https://ai.google.dev/gemini-api/docs/live-api/best-practices?hl=en), atnaujinta 2026-09-15: apdorojamas aktyvus sukauptas kontekstas kiekviename pokalbio žingsnyje, įskaitant ankstesnį audio. Įjungta transkripcija prideda teksto išvesties kainą. Konteksto suspaudimas riboja senų tokenų kiekį, bet nenustato visos pokalbio kainos. Dokumentas taip pat nurodo 3.8-live nuolatinį proactive audio ir įvesties apmokestinimą klausymosi metu. Todėl tylos ar laukimo savikainos nelaikome nuline be realių duomenų.

[Google kainynas](https://ai.google.dev/gemini-api/docs/pricing?hl=en), 3.8 Live Standard: per milijoną tokenų USD 0,75 teksto įvestis, 3 audio įvestis, 1 vaizdo įvestis; 4,50 teksto išvestis ir 12 audio išvestis. Šie tarifai sutampa su perskaityta vietine Live kainyno lentele. Viešas minutės orientyras nėra konkretaus mūsų pokalbio sąskaita. Free tier, nuolaidos, kvotos, tikras paskyros tarifas ir transporto kaina šiuo tyrimu nepatvirtinti; nulinių sąnaudų nepriskiriame.

[Live WebSockets API](https://ai.google.dev/api/live), atnaujinta 2026-09-04, dokumentuoja `UsageMetadata` tokenų skaičius ir įvesties/išvesties modalumų detalizaciją. Tai pagrindas sutikrinti usage, ne įrodymas, kad konkretus SDK jau visus duomenis persiunčia teisingai. Bandymas atverti LiveKit observability metrics puslapį grąžino Internal Error; jo turiniu išvadų negrindžiame. Nevertiname nepatikrintos LiveKit kainos kaip nemokamos.

## Mažiausias bandymas ir atliktas skaičiavimas

Šiame cikle atlikta tik šaltinių/kodo peržiūra ir izoliuota sintetinė aritmetika, be API, audio ar tikrų kontaktų. Tie patys 1 000 naujų audio įvesties tokenų, padalyti į du žingsnius po 500, sudarytų 500+1 000=1 500 apdorotų įvesties tokenų. Keturi žingsniai po 250: 250+500+750+1 000=2 500. Esant 3 USD/milijonui, šio vieno komponento kaina būtų 0,0045 arba 0,0075 USD. Tai tyčia supaprastintas tik naujos audio įvesties istorijos pavyzdys: neįtrauktas sistemos tekstas, ankstesnis modelio audio, transkripcijos, tools, suspaudimas, klausymosi laikas ar kitos paslaugos. Tai nėra visas skambučio tarifas ar faktinio piloto matavimas.

Du kumuliaciniai sintetiniai sąnaudų snapshot 4 500 ir 7 500 mikro-USD bei pakartotas 7 500 reiškia galutinį 7 500, ne 12 000 ar 19 500. Tai apskaitos skirtumo iliustracija, ne worker/gateway integracijos bandymas. Aritmetikos priėmimas: abiem atvejais 1 000 naujų tokenų, teisingos sumos ir valiuta; kumuliaciniai kvitai nepridedami kaip atskiri žingsniai. Rezultatai išsaugoti QA.

Mažiausias tolesnis nemokamas patikrinimas esamo balso priėmimo darbe — iki 30 minučių jau teisėtai turimo nuasmeninto sintetinio piloto usage kvito sutikrinimas su modalumais, modeliu/kainyno versija ir rezervacija; nereikia naujo skambučio ar prenumeratos. Ši kvito patikra dabar nevykdyta. Trūkstamų duomenų rezultatas UNVERIFIED, ne 0 USD. Stabdymas: gyvos API, tikrų asmenų įrašų, paskyros ar išplėsto biudžeto poreikis; neaiški SDK event semantika; 30 minučių riba. Priėmimas: kvitas ir kainos kilmė sutampa, duplicatas nepadidina sumos, transportas / post-call / palaikymas atskirti nuo modelio. Faktinės visos savikainos ir mokamos kvalifikuotos užklausos vertė lieka nežinomos.

Naudos gavėjas — tinklo operatorius ir būsimas portfelio klientas: galima įvertinti automatizacijos išlaidas vienai tinkamai užklausai. Minučių statistika naudinga apkrovai, bet mokamą rezultatą reikėtų sieti su užbaigtais ir tinkamais poreikiais. Alternatyvos: palikti esamą usage kelią ir užbaigti jo priėmimą; vien minučių orientyras (nepakanka savikainai); naujas sąnaudų modulis (dubliuotų esamą). Konteksto trumpinimo ar pokalbio elgesio pakeitimo be žinių pilnumo ir garso kokybės bandymo nesiūlome.

Naujų veiksmų savininkui nėra. BDEV-0002/P1/P2 lieka proposed; IDEAS/VISION ir kitų vykdytojų failai nekeičiami. Tęstinumas saugomas tik šios sesijos tyrime ir STATE, esamoje PR #1.
