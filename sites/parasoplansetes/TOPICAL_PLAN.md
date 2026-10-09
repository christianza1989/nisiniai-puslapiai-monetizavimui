# Užklausų ir URL sprendimai
## Aktualus pilnas planas — 2026-10-09

Visas dabartinis žemėlapis, 47 URL briefai, 154 tikslių užklausų sprendimai, verslo/proceso/aplinkos matrica ir šešių mėnesių parengimo langai: [CONTENT_PLAN_20261009.md](CONTENT_PLAN_20261009.md), struktūruoti duomenys [CONTENT_PLAN_20261009.json](CONTENT_PLAN_20261009.json). 19 esamų puslapių išsaugoti, 28 nauji tik suplanuoti; 3 priklauso nuo konkretaus papildomo įrodymo. Bendrinės įrangos užklausos taikinys naujame domene patikslintas į /paraso-plansetes, homepage skirtas StepOver pasiūlymui. NG5 įtrauktas sąlygiškai, duraSign10.0 tiekimas tikrintinas.

Žemiau paliktas originalus 2026-10-08 checkpoint ir pirmo release istorija. Jo trumpas būsimas temų sąrašas bei homepage/kategorijos paskirstymas nėra naujo pilno plano pakaitalas. Native planningBrief adapterio spraga įvardyta naujame plane; nauji tekstai, approval ar publikavimas šiuo darbu neatlikti.

## Istorinis 2026-10-08 checkpoint

2026-10-08, LT / lt / Europe/Vilnius. Savininko patvirtintos abi svetainės; skirtingi gamintojai. Treg šaltinių paieškos be12143f50d14d4fa64bc2c9eeb0cd37 rezultatas padeda rasti katalogus, ne patikimą Google poziciją ar apimtį. Google LT desktop SERP / Ads volume faktiškai gauti; mobile head pozicija nepatvirtinta. Limitas 2 EUR, kaštas apie 0,21 EUR. Žr. SEO_BASELINE.md. Šis žemėlapis remiasi tikru katalogu ir skaitytojo užduotimis, o ne išgalvotu SERP overlap.
| Užklausa / klausimas | Funkcija | Destination | Sprendimas |
|---|---|---|---|
| parašo planšetės; parasu plansetes; skaitmeninio parašo planšetės | Tinkamo gamintojo / komplekto paieška | parasoplansetes.lt/ (StepOver); signaturepads.lt/ (signotec) | Sinonimus apima atitinkamas pagrindinis pasiūlymas, nekuriame atskirų spellingURL |
| StepOver Lietuva; StepOver parašo planšetės | StepOver pasiūlymas ir jo ribos | parasoplansetes.lt/ | Savininko pasirinktas pagrindinis commercial URL |
| StepOver modeliai; parašo planšečių palyginimas | Modelių savybių atranka | /paraso-plansetes | Katalogas / tikra lentelė, ne antras tos pačios homepage kopijos puslapis |
| naturaSign Pad Classic | Konkretaus modelio tinkamumas | /produktas/paraso-plansete-stepover-naturasign-pad-classic | Perkeliamas semantiškai tas pats modelis, naujas originalus tekstas |
| duraSign Pad 4.3 | Tas modelis | /produktas/paraso-plansete-stepover-durasign-pad-4-3 | Ta pati senoji path forma leidžia1:1migration |
| duraSign Pad 5.0 | Tas modelis | /produktas/paraso-plansete-stepover-durasign-pad-5-0 | Atskiras tikras produktas |
| duraSign Pad 10.0 | Tas modelis | /produktas/paraso-plansete-stepover-durasign-pad-10-0 | Atskiras tikras produktas |
| duraSign Pad NG 10; nextGen | Įrenginio programinio kelio atranka | /produktas/paraso-plansete-stepover-durasign-pad-ng-10 | Neprilyginame senam10.0; naujo5NG kaina / tiekimas neišgalvoti |
| eSignatureOffice; StepOver programinė įranga | Kas reikalinga PDF pasirašymui | /programine-iranga | Komplekto Windows / NG / remote pasirinkimas, ne „nemokama programa visiems“ |
| parašo planšetės integracija; StepOver API | Įvertinti sistemas / atsakomybes | /integracija | Konkreti įgyvendinimo apimties užklausa |
| kaip pasirinkti parašo planšetę | Reikalavimų surinkimas | /gidai/kaip-pasirinkti-paraso-plansete | Gidas su6kriterijais / pavyzdžiu / checklist |
| kaip pasirašyti PDF parašo planšete | Dokumento darbo eiga ir patikra | /gidai/pdf-pasirasymas-plansete | Atskiria įrangą nuo failo kelio;8priėmimo bandymai |
| kaip integruoti planšetę į verslo sistemą | IT paruošimas ir piloto priėmimas | /gidai/paraso-plansetes-integracija | Žingsniai / atsakomybių klausimai, ne pardavimo landing kopija |
| signotec; Sigma/Zeta/Gamma/Omega/Delta; signoSign | Kita gamintojo ekosistema | Esami signaturepads.lt produkto URL | Lieka WordPress ir atnaujinami atskiru planu, ne nukopijuojami į StepOver domeną |
| nuotolinis pasirašymas; kvalifikuotas parašas | Kitas procesas / reikalingas parašo lygis | /programine-iranga dalis + pirminiai šaltiniai | No genericQESlanding kol nepatikrinta konkreti oferta |
| sektorių / miestų kombinacijos | Ta pati užklausa smulkiais variantais | Homepage / guide pavyzdžiai | Nauji doorways atmesti; bet kuriame sektoriuje priimamas tinkamas poreikis |
Pilnas bounded scope:5esamųStepOver modeliai, gamintojo software/cloud/developer keliai, vietinis / nuotolinis / mišrus procesas, įrangos / licencijų / integracijos / archyvo pasirinkimas. F1pirmasrelease apima šias pirkėjo užduotis ir3gidu; būsima atskira cloud oferta tik po licencijų / vykdymo patikros. Tai ne fiksuota straipsnių kvota.
Policy6mėn /2per mėnesį /10:00EuropeVilnius — planavimo pajėgumo hipotezė; naujų datų / turinio nepublikuoja. Pasiruošimui planuojami vėlesni7 klausimai: terminalserver /Citrix, licencijų sąmata, keliųpadaliniųdiegimas, dokumento peržiūra mažame ekrane, parašo duomenų prieigos, klientokopijosišsiuntimas, nesėkmingoprocesoatstatymas. Prieš kiekvieną naująURL patikrinti, ar tai ne esamo gido išplėtimas.
Pirmasprivatusgidas pernativeAPI irnoindexpreview faktiškai patikrintas priešbulkcontent; IDs studio-ids.json. Likusių puslapių IDs materializuojami įprastuaddPage, links tikraspageIDs; ne naujas importer arba rankiniaiapprovalhash. Ši byla — URL sprendimų checkpoint, ne jau paskelbtas kalendorius.

Native pirmas release: 19 puslapių, 3 pirminiai gidai ir ketvirtas terminalinio serverio gidas su 2026-10-08T16:45:49.664Z data. Tas pats paketas faktiškai perėjo iš 18 viešų / 3 gidų į 19 / 4, be perbuild ar hash keitimo. Tikros gamybinės publikacijos datos nėra.
