# Kasimo tūris ir grunto išvežimas · 2026-10-11

Statusas: **evidence_only_no_new_proposal**. Klausimas: ar miniekskavatoriai.lt užklausos ruošinys leidžia atskirti kasimą, technikos transportą ir grunto išvežimą? Tai esamo pasiūlymo vykdymo įrodymų papildymas, ne naujas BUSINESS sprendimas ar operacinio modulio realizacija.

## Sprendimas ir esama apimtis

[BUSINESS](../../../sites/miniekskavatoriai/BUSINESS.md) jau renka kasimo, užpylimo ir išvežimo apimtį. [PRODUCT](../../../sites/miniekskavatoriai/PRODUCT.md) aiškiai apriboja įrankį geometrija. Aktualaus companion `components/niche/miniekskavatoriai-site.tools.tsx` šaltinyje rezultatas vadinamas geometriniu tūriu ir įspėjama, kad tai nėra išpureninto grunto kiekis. Papildomi darbai įrašomi laisvu tekstu. Tai šaltinio peržiūra, ne naujas naršyklės ar formos priėmimas.

[2026-10-02 tyrimas](../2026-10-02-demand-fit/RESEARCH.md) jau atskyrė operatorių, nuomą, prieigą ir papildomus darbus. Dabartiniai įrodymai konkretina jo vykdymo ribą: agentas negali iš tranšėjos matmenų automatiškai išvesti vežimo reisų ar visos kainos. Naujo BDEV numerio ar atskiros laboratorijos nepridedu; [registras](../../IDEAS.md) ir visi penki nepatvirtinti sprendimai lieka nepakeisti. Svetainės ir agentų instrukcijos neredaguotos. Šiame core nėra atskiro miniekskavatoriai pokalbių agento instrukcijų katalogo; nevadinu jo įgyvendintu.

## Pirminiai įrodymai

[Caterpillar medžiagų tūrio lentelė](https://www.cat.com/en_US/articles/ci-articles/earthwork-volumes-reference-tables.html), puslapio data 2025-01-15, perskaityta 2026-10-11: natūralios būklės, išpurento ir sutankinto grunto tūriai skiriasi. Gamintojas pabrėžia, kad tikslios savybės nustatomos bandymais, nes svorį veikia drėgmė, grūdelių dydis ir sutankinimas. Lentelė nėra konkretaus Lietuvos objekto tankio ar universalaus išpurenimo koeficiento įrodymas. Jos skaičių neperkeliu į viešą skaičiuotuvą.

[SERVICE M&D GROUP ekskavatorių puslapis](https://nuomokis.lt/nuomojama-technika/ekskavatoriai/), perskaitytas 2026-10-11: Kaune rodomas 30 €/val. darbas su operatoriumi ir 120 € technikos atvežimas bei išvežimas. Nuoma be operatoriaus ir tolimas vežimas derinami individualiai; savivarčio paslaugos siūlomos atskirai. Puslapis neįrodo, kad į technikos transporto sumą įtrauktas iškasto grunto pašalinimas. PVM, minimalus darbo laikas ir individualios sąlygos čia nepatvirtinti. Tai teikėjo skelbimas, ne mūsų kaina, sutartis ar partnerystė.

Lepela, MVC technika ir Technikos gidas puslapiai neatsivėrė per naudotą web įrankį. Paieškos ištraukų kainų ar talpų nelaikau perskaitytais pasiūlymais. Tyrimo riba: du perskaityti pirminiai HTML puslapiai ir trys nepavykę atvėrimai. Viena Treg katalogo užklausa neturėjo tinkamų atitikmenų; su bankininkyste susiję artimi rezultatai atmesti. Mokamų teikėjų užklausų nėra.

## Palyginimas ir nežinomybės

Esamas geometrinis ruošinys su aiškiais neatsakytais klausimais yra geriau pagrįstas negu automatinis reisų ar visos kainos skaičiuotuvas. Nieko nekeičiant svarbu išsaugoti dabartinį perspėjimą ir išvežimo klausimą. Naujas skaičiuotuvas reikalautų konkretaus objekto bei vykdytojo duomenų, kurių neturime.

Vertinant savo teisėtai gautą poreikį reikėtų atskirai užfiksuoti: ar gruntas paliekamas, panaudojamas užpylimui, ar išvežamas; kokia jo būklė ir kiekis žinomi; kas krauna; ar transporto kaina skirta technikai, ar gruntui; kokia priėmimo vieta ir išlaidų apimtis patvirtintos. Žinomas kėbulo tūris savaime nepatvirtina leistinos krovinio masės. Šis tyrimas nenustato atliekų teisinės klasifikacijos, saugaus kasimo ar vežimo atitikties.

Nežinomi mūsų klientai, partneriai, jų grafikai, noras mokėti už užklausą, priėmimo vieta, objekto grunto savybės, pakrovimo ir išvežimo kaina. Mokamas kliento rezultatas tebėra vykdytojo atliktas sutartos apimties darbas; mūsų galima pajama — tik realiai sutartas ir surinktas užklausos mokestis. Rangovo valandinis tarifas nėra mūsų marža.

## Mažiausias praktiškas patikrinimas

Vėlesniame autorizuotame esamo poreikių vertinimo etape pakanka [šešių kontrolinių atvejų](CHECK_CASES.json), be naujos prenumeratos ar atskiro runtime. Iki vienos agento darbo valandos yra planavimo riba, ne išmatuotas našumas ar naujas approval prašymas. Atvejai dabar tik aprašyti, agentui nevykdyti. Esamo modelio darbo ir patikros sąnaudas reikėtų fiksuoti; mokėtojo ir pritraukimo ekonomika lieka nežinoma.

Tikslas — neišsiųsti rangovui klaidingai sukomplektuotos apimties. Priėmimas: visuose šešiuose atvejuose geometrija, technikos transportas ir grunto vežimas atskirti; nepagrįsti reisai ir kainos neapskaičiuoti; prie kiekvienos nežinomybės nurodyta konkreti trūkstama informacija. Tolesniame tikrų poreikių etape matuoti papildomų patikslinimų laiką ir vykdytojo priėmimą. Tai neprideda sintetinių atvejų prie paklausos skaitiklių.

Stabdyti ar taisyti, jei agentas pasirenka grunto koeficientą be objekto duomenų, suplaka dvi transporto rūšis, žada priėmimo vietą ar paskelbia pilną kainą iš valandinio tarifo. Jei esamas ruošinys jau išsaugo šiuos skirtumus, naujo modulio nereikia. Esami šešių savaičių paklausos ir ekonomikos kriterijai nepakeisti.

## Tęstinumas ir patikros ribos

Naujausi tiesioginiai root savininko pavedimai yra užbaigti X agentą ir prieš darbus koordinuoti jo vietą Verslomatikos platformoje. Tai root pavedimas, ne šios sesijos P1–P4 ar BI patvirtinimas; perrašymo nepradedu. Core sesijos roletų ir privačios konfigūracijos pavedimai taip pat nepatvirtina registro eksperimentų. Sekretų failų neskaičiau, klientams ar kitoms sesijoms nesiunčiau.

Savo šakoje be konfliktų integruotas aktualus core main; nauja tipografikos sutartis ir projekto instrukcijos perskaitytos. Kuriami tik privatūs Markdown ir JSON įrodymai, todėl svetainės tekstų vaidmenys, CSS, DESIGN ir vaizdinės patikros šiai apimčiai netaikomi. Galutinis tyrimo tekstas atskirai suredaguotas. Istoriniai įrašai ir ankstesnės patikros neperrašyti.

Šaltiniai ir neprieinami puslapiai: [SOURCES.json](SOURCES.json). Dokumentinė patikra: [QA.json](QA.json). Naujo pasiūlymo ar reikšmingos įgyvendinimo kliūties nėra, todėl senų pasiūlymų savininkui nekartoju.
