# Memocasting domeno ir senų adresų atkūrimas

2026-10-12. Tai paleidimo sutartis ir adresų inventorius, ne veikiančios svetainės ar DNS pakeitimo patvirtinimas.

Savininko Google paieškos ekrane pagal „ranku liejimo rinkinys“ memocasting.lt matomas antras įprastas rezultatas. Ekranas pažymėtas kaip suasmenintas; tai nėra visos Lietuvos pozicijos matavimas. 2026-10-12 šios sesijos HTTPS užklausa į pagrindinį domeną grąžino HTTP 402. Nei dabartinis indeksavimas, nei domeno senumas negarantuoja būsimo reitingo.

Savininko pateiktame Search Console išorinių nuorodų ekrane matyti šie šeši tiksliniai adresai. Pagrindinio puslapio www ir be www skaičių nesumuoti: ekrane neįrodytas unikalių nuorodų persidengimas. Pirminis įrodymas — pateiktas ekranas, ne naujas pilnas backlink auditas. Mašinai skaitomas inventorius: [legacy-urls.json](legacy-urls.json).

| Senas adresas | Ekrane nuorodų / svetainių | Paleidimo sprendimas |
|---|---:|---|
| https://memocasting.lt/ | 79 / 31 | 200 pagrindinis puslapis, savireferencinis canonical |
| https://www.memocasting.lt/ | 79 / 31 | 301 arba 308 į https://memocasting.lt/; www visiems prasmingiems keliams išlaiko kelią |
| /pages/instrukcija | 1 / 1 | 200, patikrinta instrukcija, išsaugotas adresas; santykiai ir sauga tik pagal realias medžiagas |
| /products/alginato-papildymas-650g-dvieju-ranku-rinkiniui | 1 / 1 | Išsaugotas atskiras adresas; ankstesnis pavadinimas nėra patvirtinimas, kad dabartinis papildymas yra 650 g ar parduodamas. Turinio ir prekybos būsena laukia savininko bei tiekėjo duomenų |
| /products/kudikio-pedutes | 1 / 1 | Išsaugotas atskiras adresas; ankstesnė prekė ir tinkamumas kūdikiams dar nepatvirtinti. Jokio pirkimo ar saugos pažado iš vien seno slug |
| /products/liejimo-rinkinys-porai | 1 / 1 | 200 poros rinkinio puslapis, €32 pagal savininką, išsaugotas adresas |

LT poros prekės ir instrukcijos canonical adresai turi likti aukščiau nurodyti seni adresai. [SEO/GEO plane](SEO_GEO_PLANAS.md) jų ankstesni /lt/ adresai yra planavimo pasiūlymai: nekurti dviejų indeksuojamų to paties turinio kopijų. Lokalizuotų PL/LV/EE puslapių hreflang grįžta į šiuos LT canonical; šeimos prekė ir nauji gidai gali turėti naujus planuotus adresus. Nedaryti nereikalingo seno poros URL perkėlimo vien dėl vienodesnio prefikso.

Papildymo ir kūdikio puslapius prieš viešinimą reikia atkurti iš Shopify eksporto ar kitų savininko šaltinių. Jei prekė nutraukta, prasmingas 200 informacinis puslapis galimas tik turint tikrą ankstesnį aprašymą ir aiškią neparduodamos prekės būseną. Jei turinio atkurti nepavyksta ir nėra lygiaverčio pakaitalo, sprendimas gali būti 404/410; nukreipimas į nesusijusią poros prekę būtų klaidinantis. Visos šešios eilutės turi būti išspręstos prieš paleidimo priėmimą; dabar jos pažymėtos, ne išgalvotos.

Prieš perjungiant domeną: išsaugoti Shopify produktų, straipsnių, failų ir redirect eksportą, GSC puslapių/sitemap duomenis; papildyti pilną URL inventorių; patikrinti domeno registratorių, DNS ir pašto įrašus. www ir be www bei HTTP/HTTPS variantai turi pasiekti vieną canonical be ilgų grandinių. Jokio domeno ar senos paskyros panaikinimo iki eksporto ir priimto perjungimo.

Paleidimo patikra: GET iš išorės į kiekvieną seną adresą, statusas/redirect tikslas/canonical; robots leidimas ir pašalintas staging noindex; sitemap su galutiniais 200 URL; matomas turinys atitinka Product/Offer ir atsargas. Po perjungimo GSC URL patikra, sitemap pateikimas ir indeksavimo/404/srauto stebėjimas. Reikalingus permanent redirect išlaikyti bent metus pagal [Google migracijos rekomendacijas](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes). Serverio klaidų ir rezultato vietos nesieti su reitingo garantija.

2026-10-12 savininkas patvirtino, kad memorycasting.lt naudojo kaip ankstesnį landing page. [Peržiūros ir naujo homepage briefas](HOMEPAGE_BRIEF.md), [papildomų adresų inventorius](landing-urls.json). Pirminės šešios GSC eilutės lieka atskiras įrodymas; landing page nuorodoms GSC skaičių nepriskirti. Abu domenai įtraukti į verslo kontekstą. Vieno pagrindinio domeno ir antro domeno turinio/nukreipimo sprendimas priimamas su pilnu GSC inventoriu prieš paleidimą; automatinio DNS ar redirect pakeitimo neatlikta.

Jei matomas 2,3/5 verslo profilis priklauso MB Memocasting, prieš paleidimą savininkas peržiūri senus pristatymo/grąžinimo/pagalbos atvejus, atnaujina tikrus kontaktus ir atsako pagal faktus. Ekrane matomi klientų teiginiai nėra šio darbo patikrintos užsakymų aplinkybės; dirbtinių atsiliepimų ar įvertinimų nekurti.

Šiame etape DNS, Shopify paskyra, Google verslo profilis ir vieša svetainė nepakeisti. Adresų atkūrimas įgyvendinamas kuriant Memocasting svetainę po vietinio prekybos modulio etapo, kaip pavedė savininkas.
