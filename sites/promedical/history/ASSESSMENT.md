# promedical.lt: domeno istorijos ir dabartinių URL vertinimas

Privatus projekto dokumentas. Semantinis vertinimas atliktas 2026-10-09; jokie vieši URL, DNS, esamas WordPress turinys ar nukreipimai nepakeisti. Sprendimai žemiau skirti galimam vėlesniam svetainės pakeitimui, kurį valdo pagrindinis agentas.

## Tikrinti įrodymai ir jų ribos

Pagrindinio agento ribotas Archive CDX tyrimas: `C:/Core/promedical-core-20261009/sites/promedical/history/audit.json`, patikrinta 2026-10-09T14:30:25.240Z. Visos keturios inventoriaus, turinio, metų ir paskutinio root mėginio užklausos grąžino HTTP 200 ir 0 tinkamų HTML eilučių. Limito jos nepasiekė. Tai reiškia **šiose konkrečiose užklausose nerastas HTML archyvo mėginys**; tai neįrodo, kad svetainė neturi istorijos. Turinio periodų ir ankstesnių operatorių pagal šį archyvą nustatyti negalima.

Dabartinė svetainė atskirai nuskaityta tik skaitymui 2026-10-09T15:09:09.197Z. Nuo root sekta viešų, to paties hosto HTML nuorodų aibė; nebuvo lankomi administravimo, paskyrų ar pirkinių krepšelio URL ir neparsisiųsti vaizdai. 70 užklausų limitas nepasiektas. 16 atsakymų sudaro 13 turinio URL bei robots.txt ir du sitemap atradimo bandymai. Tai pilnas **šios nuorodų aibės**, o ne visų galimų WordPress URL inventorius. Išorinė paieškos priemonė negalėjo atverti root; tiesioginis HTTPS GET jį ir kitus 12 turinio URL patikrino sėkmingai.

Patikrintas inventorius ir atsakymų SHA-256 yra [LIVE-INVENTORY.json](LIVE-INVENTORY.json). Vietiniai žali atsakymai išsaugoti ignoruojamame `data/promedical-history/`; jie nenaudojami naujos svetainės turiniui kopijuoti. [URL sprendimai](url-decisions.json) nėra hosto nukreipimų konfigūracija.

## Nustatomas turinio periodas

| Periodas | Įrodymas | Tematika | Tęstinumas su Klaro pasiūlymu |
| --- | --- | --- | --- |
| Iki patikros | CDX tyrime nerasta tinkamų HTML mėginių | Nežinoma | unknown |
| 2026-10-09 dabartinis HTTPS turinys | 12 HTTP 200 HTML puslapių; root H1 „SKAITMENINIO PARAŠO PLANŠETĖS“ | Signotec ir StepOver parašo planšetės, monitorių išplėtimai, pasirašymo programinė įranga | unrelated |
| Rengiama Klaro versija | Vartotojo patvirtintas naujas pasiūlymas ir atskiras vietinis projektas | Medicininiai vežimėliai, laikymo sistemos, baldai ir kita Klaro įranga įstaigoms | Naujas pasiūlymas; ankstesnio produkto atitikmuo neįrodytas |

Bendras institucinių pirkėjų kontekstas nesukuria produktų ar užklausų ketinimo lygiavertiškumo. Net jei Klaro turi skaitmenizavimui skirtų vežimėlių, jie nepakeičia Signotec parašo planšetės ar eSignatureOffice licencijos.

## Dabartinė URL aibė

| URL kelias | HTTP | Tikras dabartinis ketinimas | Sprendimas galimam pakeitimui |
| --- | --- | --- | --- |
| `/` | 200 | Parašo įrangos pasiūlymas | Išlaikyti root su nauju vartotojo užsakytu Klaro turiniu; neredirektinti |
| `/iranga/paraso-plansetes/` | 200 | Parašo planšečių pasirinkimas | Neatkurti kaip Klaro kategorijos; 404 po autorizuoto pakeitimo |
| `/iranga/elektroninio-paraso-plansetes-monitoriu-ispletimai/` | 200 | Pasirašymo monitorių išplėtimai | Neatkurti; 404 po autorizuoto pakeitimo |
| `/iranga/programine-iranga/` | 200 | Dokumentų pasirašymo programos | Neatkurti; 404 po autorizuoto pakeitimo |
| `/produktas/paraso-plansete-stepover-naturasign-pad-classic/` | 200 | StepOver naturaSign Pad Classic | Neatkurti; 404 po autorizuoto pakeitimo |
| `/produktas/paraso-plansete-signotec-delta/` | 200 | Signotec Delta | Neatkurti; 404 po autorizuoto pakeitimo |
| `/produktas/paraso-plansete-stepover-durasign-pad-10-0/` | 200 | StepOver duraSign Pad 10.0 | Neatkurti; 404 po autorizuoto pakeitimo |
| `/produktas/monitoriaus-ispletimas-pasirasymui-signotec-delta-pen-display/` | 200 | Signotec Delta Pen Display | Neatkurti; 404 po autorizuoto pakeitimo |
| `/produktas/programine-iranga-stepover-esignatureoffice/` | 200 | eSignatureOffice | Neatkurti; 404 po autorizuoto pakeitimo |
| `/produktas/programine-iranga-signotec-signosign-2/` | 200 | signoSign/2 Pro | Neatkurti; 404 po autorizuoto pakeitimo |
| `/produktas/programine-iranga-signotec-signosign-universal/` | 404 | Root nuorodoje įvardyta Signotec programa; turinys nepasiekiamas | Išlaikyti 404; nekurti Klaro atitikmens |
| `/apie-mus-spaudoje/` | 200 | Signotec įrangos aprašymas spaudoje | Neatkurti kaip Promedical/Klaro reputacijos; 404 po autorizuoto pakeitimo |
| `/musu-slapuku-politika/` | 200 | Senos svetainės slapukų paaiškinimas | Atidėti; `/privatumas` galėtų būti semantiškai lygiavertis tik užbaigus tikrą naujos svetainės privatumo informaciją ir patikrinus viešą 200 |

Visų 13 HTML atsakymų meta robots yra `noindex, nofollow`, įskaitant 404. Tai patikrintas dabartinis žymėjimas, ne įrodymas apie Google indeksą ar ankstesnį matomumą. Root `<title>` tuščias. `robots.txt` HTTP 200 riboja WordPress administravimo, žurnalų / techninius įkėlimų kelius ir add-to-cart užklausas; **visos svetainės `/` jis neuždraudžia**. `/wp-sitemap.xml` ir `/sitemap_index.xml` grąžina 404. Kitų sitemap vietų buvimas netirtas.

## Trūkstami signalai ir ribotas verdiktas

Backlinkai, organinis srautas, Search Console indekso būklė, Google manual actions ir ankstesnio turinio teisių tęstinumas nepatvirtinti. Šių signalų neįrašome kaip 0 ar „švaru“. Domeno pavadinimas semantiškai tinka naujam pasiūlymui, tačiau dabartinė parašo įrangos tematika nesuteikia išmatuoto Klaro katalogo SEO pranašumo. Naują katalogą vertiname kaip naują pasiūlymą ir naują paklausos testą.

Esamos svetainės kontaktai, kainos, pirkėjų logotipai, spaudos paminėjimai ir tekstų / nuotraukų teisės nepernešami. Naujam projektui kontaktai paimti iš vartotojo patvirtinimo: `sales@promedical.lt`, `+370 686 88369`; juridinis pavadinimas neviešinamas pagal vartotojo pageidavimą. Juridinio asmens nepapildome iš seno puslapio.

Viešą dabartinę versiją išlaikome. Šis vertinimas nesuteikia leidimo perjungti domeną, pašalinti esamą svetainę ar įgyvendinti nukreipimus. Jeigu vėliau pasirenkamas pakeitimas, 404 turi likti tikru HTTP 404, o ne tuščiu HTTP 200. Nė vienas Signotec / StepOver produkto ar kategorijos URL nenukreipiamas į Klaro produktą, katalogą ar homepage. Slapukų puslapio sprendimas lieka atidėtas iki gyvo, išsamaus ir aktualaus privatumo taikinio.
