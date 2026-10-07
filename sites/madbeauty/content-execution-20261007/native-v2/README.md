# Pirmas peržiūrėtas native V2 paketas

2026-10-07. Du nauji gidai parašyti tikru `gpt-6-luna / xhigh` CLI: paslaugų kategorijos pasirinkimas ir vizito registracija. Kategorijų gido konkrečią pataisą parašė tas pats modelis. Iliustracijų pikseliai sukurti atskiru ImageGen įrankiu ir faktiškai peržiūrėti. Tai pirmas vykdymo paketas iš 292 naujų straipsnių plano, ne užbaigti visi straipsniai.

`release/content-package.json` SHA256: `b208596faea613be548c15423ec691c3d1cc01b2f0b1dcdcfb80f7411ea8fdd5`. Bendri `recordEditorialReview`, `approveReviewedBatch`, `releaseContent` ir `verifyContentRelease` paruošė 9 patvirtintus V2 puslapius bei 30 tikslių WebP failų. V1 patvirtinimai automatiškai neperkelti: trys ankstesni gidai, pradžia, rodyklė ir redakcija peržiūrėti iš naujo. Pridėtas tikros organizacijos autoriaus profilis `/autoriai/redakcija`; operatorius MB Pinet, kontaktas info@pinet.lt.

Abu nauji gidai numatyti **2026-10-13 10:00 Europe/Vilnius**, `2026-10-13T07:00:00.000Z`. Iki datos viešas runtime turi slėpti jų URL, tekstą, nuorodas, JSON/Schema ir sitemap. Registracijos iliustracijos penki failai priklauso tik būsimam straipsniui. Kategorijų gido iliustracija taip pat naudojama jau paskelbtuose pradžios ir rodyklės puslapiuose, todėl jos viešumas nėra būsimo straipsnio nutekėjimas. Publikavimas pagal datą veikia tik jau įdiegtam patvirtintam paketui.

Kategorijų gidas apima visas 14 aktyvių nacionalinių sričių ir aiškiai pažymėtas 7 planuojamas sritis. 14 kategorijų SSR/registro tikslai patikrinti; nacionalinė kategorija nėra vietinių meistrų pasiūlos, laisvo laiko ar indeksavimo įrodymas. Straipsnis veda į nacionalinę sritį ir aiškų miesto pasirinkimą; nekuria neegzistuojančių procedūros–miesto rezultatų. Miestų SEO laukia realios patvirtintos pasiūlos ir atskiro priėmimo.

Pirmam paketui užbaigta 14 prasmingų vidinių ryšių. 44 dar neparengtų straipsnių pasiūlymai su priežastimis atidėti privačiai; pilnas būsimas topical map ir planningBrief išliko. Ankstesnio registracijos juodraščio revizija `45b6cc23d2d23566be44f9bb0d96f2326c418473dcc9875f7ced0cf670f450f4` nepakeista. Istoriniai to gido vykdymo failai viršutiniame kataloge išliko.

Faktinis privatus 9 puslapių vaizdas patikrintas Codex naršyklėje 1280×900 ir 390×844: nėra horizontalaus išlindimo, antraštės ir sąrašai skaitomi, tikri vaizdai dekoduojasi, įskaitant žemiau esančią tingiai įkeliamą spalvų iliustraciją. Kategorijų gido dubliuotas body vaizdas pašalintas, nes tas pats featured vaizdas jau rodomas. Klinikinė eksperto peržiūra nevaidinta: tekstai neperžengia bendro pasirinkimo, stiliaus ir vizito organizavimo temos.

Pirmas tikras CLI bandymas atmetė `oneOf`. V2 public schema nepakeista; CLI schema naudoja disjoint `anyOf`, o po rezultato išlieka griežtas native validatorius. 59/59 studijos testų praėjo dabartiniame darbo kontekste, įskaitant SEO/planavimo integracijos priklausomybes. Tikras Luna rezultatas ir pataisa patvirtino tai, ko vien mock testai neįrodo. Rezultatai ir jų SHA išsaugoti privačiai prieš acceptance; repo nėra raw promptų, SEO provider bundle ar prisijungimų.

Patikra:

```powershell
node sites/madbeauty/content-execution-20261007/native-v2/verify-native-execution.mjs
```

`EXECUTION.json` išsaugo peržiūrėto eksporto etapą. Gyvas paketas jau įdiegtas į [madbeauty.lt](https://madbeauty.lt/gidai); Cloudflare versija `edf429e9-2409-49bb-bf2b-88b5d53628f8`. [HOSTED-ACCEPTANCE.json](HOSTED-ACCEPTANCE.json) susieja tikslų paketą su platformos 92/92 testais, izoliuotais publikavimo laiko bandymais ir faktine domeno patikra. [INDEPENDENT-HOSTED-CHECK.json](INDEPENDENT-HOSTED-CHECK.json) fiksuoja papildomas 43 nepriklausomas HTTP užklausas: 7 matomi puslapiai, 2 būsimi URL su 404, 25 tikslūs vieši WebP failai ir 5 iki datos paslėpti failai. Platformos sesijos gyvas vaizdas patikrintas 1280×720 ir 390×844; šioje sesijoje papildomai peržiūrėta jos tikra mobili ekrano nuotrauka.

Abu nauji gidai automatiškai tampa matomi spalio 13 d. 10:00 Lietuvos laiku jau įdiegtame pakete. Tikslūs prieš/po datos bandymai atlikti izoliuotame runtime; tikras gyvas domenas po būsimos datos dar nepatikrintas. Diegimo šaltinis yra PR24, generatoriaus šaltinis PR10; abu šiame įraše neįvardijami kaip sujungti į main. Vietinė meistrų pasiūla, klinikinė kompetencija, GSC/GA4, rezervacijos bei pašto pristatymas šiuo turinio paketu neįrodomi.

Nepriklausomos gyvo domeno patikros pakartojimas (tik skaitymas):

```powershell
node sites/madbeauty/content-execution-20261007/native-v2/check-hosted-release.mjs
```
