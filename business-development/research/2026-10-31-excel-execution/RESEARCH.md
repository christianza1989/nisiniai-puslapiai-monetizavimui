# Vieno paspaudimo ataskaita ir vykdymas be žmogaus

2026-10-31. Klausimas BDEV-0002 ir Verslomatikos autonomijos kontekste: ar kliento turimas Excel ir Power Query atnaujinimas savaime pagrindžia pažadą vykdyti ataskaitą be žmogaus ir be naujų prenumeratų?

## Išvada ir nedubliavimas

Ne. [BDEV-0002](../../ideas/BDEV-0002.md) jau siūlo vieno naudotojo Windows Excel paketą su tikru atnaujinimo ir perdavimo bandymu; automatinio serverio ten nežadama. [Savininko vizija](../../VISION.md) siekia platesnės autonomijos, tačiau ji neįrodo konkretaus Office vykdymo režimo ar licencijos. Šis tyrimas papildo esamo pasiūlymo kvalifikavimą, nekeičia jo statuso **proposed**, 12 valandų etapo ar prašomos apimties. Naujo BDEV ID, piloto ar runtime modulio nereikia; veikiančio produkto defekto nenustatyta.

## Pirminiai įrodymai

Microsoft aprašo atskirus nustatymus: užklausos vykdymą fone, atnaujinimą kas nustatytą intervalą ir atnaujinimą atveriant failą. Fono režimas leidžia žmogui toliau naudotis Excel, kol vykdoma užklausa. Tai savaime neįrodo mūsų uždaryto failo, neprisijungusio naudotojo ar išjungto kompiuterio vykdymo. Pastarasis teiginys yra šio tyrimo įrodymų ribos išvada, ne dokumentuotas visų galimų vykdymo būdų draudimas. [Connection properties](https://support.microsoft.com/en-us/excel/connection-properties).

Microsoft 365 Apps for enterprise unattended RPA aprašas atskirai reikalauja vykdančios paskyros unattended licencijos, Windows Office ir tinkamos versijos. Viena tokia licencija apima vieną unikalią fizinę ar virtualią operacinės sistemos aplinką; shared computer activation nepalaikoma. Tai šio konkretaus produkto režimo sąlygos, ne išvada apie visų Excel versijų licencijas ar mūsų kliento sutartį. Mūsų ir kliento licencijų būklė bei kaina netikrinta. [Unattended RPA overview](https://learn.microsoft.com/en-us/microsoft-365-apps/licensing-activation/overview-unattended).

Net unattended RPA licencija nepašalina Office dialogų, prisijungimo ar stabilumo problemų. Microsoft dokumentas atskiria licencijuotą unattended kontekstą nuo nerekomenduojamo ir nepalaikomo neinteraktyvaus Office vykdymo, pavyzdžiui, per serverio tarnybą. Dokumente siūlomos ir tiesioginio failų apdorojimo alternatyvos. Tai ne bendras autonomijos draudimas. Failo generavimas be Office taip pat dar neįrodo Power Query užklausos įvykdymo ar teisingų rodiklių. [Unattended automation considerations](https://learn.microsoft.com/en-us/office/client-developer/integration/considerations-unattended-automation-office-microsoft-365-for-unattended-rpa).

Trys vieši šaltiniai perskaityti šią dieną. Learn puslapiuose rodyta autorizacijos juosta, tačiau straipsnių tekstas buvo prieinamas be prisijungimo; jų atnaujinimo datos 2024-07-22 ir 2022-07-05. Tai šiandien perskaityti dokumentai, ne naujos šiandien paskelbtos sąlygos. Sąskaitos, administratoriaus portalas, Product Terms ir realus Excel nebuvo tikrinti; licencijos neįsigytos.

## Mažiausia patikra ir alternatyvos

Po tikro BDEV-0002 patvirtinimo jau numatytame pilote skirti iki 30 min. vykdymo režimui aprašyti ir trims atvejams dokumentuoti: naudotojas pats atnaujina; prašomas vykdymas jam nedalyvaujant; reikia tik sugeneruoto failo, o ne Excel užklausos. Šiandien šie atvejai **nevykdyti**. Tai priėmimo detalė, ne papildomas nepatvirtinto piloto įgyvendinimas.

Pirmu atveju išlaikyti esamą siaurą pasiūlymą: vienas atnaujinamas failas kliento aplinkoje, sutartos sumos ir žmogaus galimybė pakartoti veiksmą. Antru atveju reikia atskiros aplinkos / licencijos / atkūrimo ir sąnaudų patikros; dabartinis paketas jos neįrodo. Trečiu galima vėliau tirti tiesioginį CSV/XLSX apdorojimą be Office, tačiau jo dar neįgyvendiname ir nevadiname lygiaverčiu Power Query vykdymu. Nieko nekeisti yra pagrįsta, kol nėra tikro kliento poreikio kitam režimui.

Priėmimas: užrašytas tikras vykdytojas, aplinka, kas inicijuoja atnaujinimą, paskutinio sėkmingo rezultato patikra, sutartos sumos ir po klaidos likusio seno rezultato atskyrimas. Atnaujinimo nustatymo ekrano ar vien failo sukūrimo neužtenka. Stabdyti platesnį autonomijos pažadą, jei reikalinga nauja nepatvirtinta licencija, nuolatinis host ar neįrodytas atkūrimas; tęsti nepriklausomą pasiūlymo kvalifikavimą be tokių pažadų.

## Sąnaudos ir ribos

Naujų prenumeratų / mokamų API / klientų failų / Office ar OS nustatymų pakeitimų 0. Esamo modelio ir agento laikas turi savikainą, kuri šiame tyrime nematuota. Būsimos 30 min. yra darbo riba, ne rinkos kaina ar patvirtinta nauja apimtis. Užklausų, sutaupymo ir pelno įrodymų nėra. Nesiūloma iš naujo pranešti BDEV-0002; laukti naujo tikro poreikio, patvirtinimo arba pasikeitusių vykdymo įrodymų.

Core main `25292e20219b735df7f04c5807dd4c100f98addc`, nuosavas HEAD prieš dokumentų pakeitimus `ecef1e98d5299f6f048e6f5f067ad63df083c6c1`; continue PASS 2026-10-31T12:11:45.878Z. Companion nenaudotas. Root naujausiame dešimties turn rezultate žmogaus pranešimų nebuvo; core grąžinti ankstesni tikri nurodymai nepatvirtina šio registro pasiūlymų. BDEV-0001 vykdymas neperimtas, aštuoni saugomi approval / pending / pranešimų laukai išsaugomi.
