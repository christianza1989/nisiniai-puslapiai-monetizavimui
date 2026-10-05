# Ar i.SAF gali būti autonominės apskaitos duomenų pagrindas?

2026-10-05. Būsena: evidence_only_no_new_proposal. Ribotas bendros automatizacijos tyrimas savininko buhalteriui paruošto paketo tikslui; tai nėra MB Pinet mokestinės prievolės nustatymas.

## Šaltiniai ir sprendimą keičiantys faktai

[VMI apie i.SAF](https://imas.vmi.lt/isaf/aboutIsaf/) aprašo registrų XML įkėlimą, eksportą ir žiniatinklio paslaugas. Mokėjimų/atsiskaitymų duomenų įrašymas neprivalomas. Išvada: registras gali būti vienas struktūruotų duomenų šaltinis, tačiau registrų buvimas ar XML priėmimas neįrodo realių mokėjimų sutikrinimo. Šaltinis taip pat atskiria fizinių asmenų e. sąskaitų išrašymą nuo juridinių asmenų gavimo/peržiūros.

[VMI e. PVM sąskaitų paslauga](https://www.vmi.lt/evmi/elektronines-pvm-saskaitos-fakturos-paslauga) patvirtina šį skirtumą ir Lietuvos PVM mokėtojo sąlygą. Todėl šis konkretus portalinis išrašymo kelias nėra universalus MB ar visų 50 domenų sąskaitų generatorius. Puslapio paskelbimo data ir tyrimo peržiūros data skirtingos; remiamės atvertu turiniu, paskyros funkcijų nebandėme.

[VMI duomenų teikimo puslapis](https://www.vmi.lt/evmi/duomenu-teikimas-tikslinimas), KM1914 2025-07-10, nurodo i.SAF registrų teikimo išimtį PVM mokėtojams, taikantiems SVS Lietuvoje. Tai prieštarauja pernelyg bendrai prielaidai „visi LT PVM mokėtojai teikia i.SAF“. Tikras MB Pinet PVM/SVS statusas šiuo ciklu nenustatytas; konkrečių prievolių ar terminų automatiškai neparenkame.

Šie trys pirminiai LT šaltiniai pasirinkti, nes klausimas yra vietinės paslaugos taikymas. Užsienio programos negali patvirtinti Lietuvos įmonės statuso. Neįvertinta visa i.SAF schema, i.SAF-T, konkrečios apskaitos programos importas ar VMI API prisijungimo sąlygos; veikiantis nemokamas adapteris neįrodytas.

## Deduplikacija pagal esamą projektą

[Vizija](../../VISION.md) jau apima originalus, juridinį subjektą, nišos analitinį pjūvį, dokumentų ir mokėjimų ryšius, neatitikimus bei buhalteriui tinkamą eksportą. [Core architektūra](../../../agent-business-core/ARCHITECTURE.md), 12–13 skyriai, jau atskiria dokumentų administravimą, sutikrinimą, deklaravimą ir konkrečios apskaitos programos adapterį. Lentelių sąrašas dokumente aiškiai pažymėtas projektu. Ribota runtime teksto paieška rado teikėjo sąnaudų įverčius su invoice_verified=false; tai ne viso runtime auditas ir ne patvirtinta faktinė sąskaitų apskaita.

Pasirinkimas: šaltinių patikslinimą pridėti prie tyrimų, išlaikant esamą originalų ir mokėjimų sutikrinimo kryptį. Alternatyva naudoti vien i.SAF eksportą neužpildo mokėjimų įrodymų ir nėra universali visiems profiliams. Nauja apskaitos prenumerata ar antras agentų core dabar neturi patvirtinto poreikio. Naujo BDEV ID ar modulio nesiūloma; registruoti apskaitos patikros principą antrą kartą dubliuotų VISION ir ARCHITECTURE.

Nauda galėtų būti mažiau buhalterio rankinio trūkstamų dokumentų ir mokėjimų aiškinimosi. Sutaupytas laikas, gavėjo priimamas formatas ir piniginė vertė nežinomi. Tai portfelio veiklos sąnaudų klausimas, ne naujas mokamos paslaugos ar garantuoto pelno pasiūlymas.

## Mažiausias būsimas patikrinimas be naujų prenumeratų

Esamo apskaitos etapo priėmime pakaktų vieno mažo vietinio sintetinės dokumentų ir mokėjimų lentelės palyginimo: keturi atvejai, aiškus juridinio subjekto profilis, nišos žyma, šaltinio nuoroda ir išimčių sąrašas. Naudoti esamą CSV/JSON ir patikrinamą aritmetiką. Iki vienos agento darbo valandos yra tik planavimo riba; testas šiame cikle nevykdytas ir naujas jo įgyvendinimo mandatas nesukurtas.

Kontroliniai atvejai: (1) sąskaita 100 EUR, mokėjimas 60 EUR – likutis 40 EUR, ne „apmokėta“; (2) pakartotinai importuotas tas pats dokumentas – viena sąskaita; (3) mokėjimas be sąskaitos – trūkstamo dokumento išimtis, ne modelio sugalvotos sąnaudos; (4) juridinio subjekto PVM/SVS statusas nežinomas – i.SAF prievolė nepatvirtinta. Sumos sintetinės, be PVM skaičiavimo ar buhalterinių korespondencijų prielaidų. Šių taisyklių aprašymas nėra algoritmo PASS.

Priėmimas: kiekviena suma turi atsekamą įrodymą; dalinis mokėjimas, dublikatas ir trūkstamas originalas lieka teisingai pažymėti; juridinis subjektas nesupainiojamas su domenu. Buhalteriui tinkamumas vėliau priimamas pagal jo tikrą formatą, ne pagal failo pavadinimą. Stabdyti automatinį deklaravimo ar „laikotarpis uždarytas“ pažadą, kai nėra patvirtinto statuso, originalo, sutikrinimo ar gavėjo reikalavimų.

Kaštai: šiame cikle naujų prenumeratų/pirkimų 0; faktiniai modelio kaštai neapskaičiuoti. Vėlesni programos importo, buhalterio, prieigos ir priežiūros kaštai nežinomi. Sintetinis bandymas galėtų patikrinti logiką, bet ne realių dokumentų nuskaitymo tikslumą ar sutaupytą buhalterio laiką.

## Koordinavimas ir patikra

Perskaityti registry/skill/WORKSTREAMS ir naujausi pasiekiami tikri root/core savininko nurodymai: root trijų nišų pavedimas ir core autonominio kalibravimo tęsinys. Naujo P1/P2/BDEV-0002 patvirtinimo nerasta. Naujos Dovanos123 kitų vykdytojų integracijos ataskaitos nėra mūsų patvirtinto darbo užbaigimas ar paklausos įrodymas; jų neperrašome. Metalo-tvoros atidėjimas išlieka.

Rašymo ribos – tik šis privatus tyrimo katalogas ir STATE. Sąskaitos, bankas, asmeninis inbox, VMI paskyra ar sekretai neskaityti; buhalteriui nesiųsta, API/DNS/kampanijos/runtime neįjungti. Pradinis roletai failo lookup pataisytas pagal inventorių ir nebuvo panaudotas tyrimo išvadai. read_thread 20 turnLimit buvo atmestas; 10 ribos užklausa sėkmingai pateikė tiesioginį core nurodymą. [Šaltiniai](SOURCES.json), [QA](QA.json).
