# traktoriupadangos.lt — istorijos panaudojimo sprendimas

Agento peržiūra 2026-09-30. Duomenų mėginys: `audit.json`, patikrintas 2026-09-30T11:48:43.163Z. Šis dokumentas keičia tyrimo ir būsimo URL planavimo sprendimus; viešas turinys ir redirects šiuo darbu nepakeisti.

## Išvada

Ankstesnė domeno tematika atitinka mūsų traktorių padangų nišą. Istoriją verta panaudoti kaip senų ketinimų ir URL tyrimo šaltinį. Viso katalogo atkūrimas pirmoje fazėje netinka: dabar turime informacinį pilotą, o istorinių prekių, kainų, atsargų ir tiekimo pažadų negalime patvirtinti. Naujas naudingas turinys lieka pagrindas; archyvo buvimas nėra patvirtintas SEO pranašumas.

## Ką iš tikrųjų patikrinome

- 2013-01-06 root mėginio title įvardija traktorių ir žemės ūkio padangas. Teksto labai mažai, todėl jis patvirtina tematikos užuominą, o ne pilną pardavimo eigą. [Archyvo mėginys](https://web.archive.org/web/20130106114750/http://www.traktoriupadangos.lt/).
- 2015-02-22 `/kitos-zut-padangos` HTML title ir H1 nurodo kitų žemės ūkio technikos padangų kategoriją. Turinys apima kombainų ir traktorių temą. [Archyvo mėginys](https://web.archive.org/web/20150222064215/http://traktoriupadangos.lt/kitos-zut-padangos).
- 2020-08-12 root HTML turi padangų, gamintojų ir prekių sąsajos požymių; inventoriuje yra produktų ir kategorijų keliai. Tai ankstesnio katalogo įrodymas, o ne dabartinės mūsų prekybos, partnerystės ar atlikto pirkimo patvirtinimas. [Archyvo mėginys](https://web.archive.org/web/20200812204805/https://traktoriupadangos.lt/).
- Naujausias atrastas 2026-02-13 root atsakė HTTP 200, bet iš jo negauta skaitomo title ar turinio. Dabartinės ar naujausios temos būklė **neįvertinta**; tuščias atsakymas neįrodo parkingo, spam ar švarios istorijos. [Archyvo mėginys](https://web.archive.org/web/20260213124234/https://www.traktoriupadangos.lt/).

Metiniai root mėginiai apima 2013–2026 metus, tačiau nėra nenutrūkstama visos svetainės istorija. Bendras CDX mėginys pasiekė 301 eilutės ribą; išsaugoti 300 unikalių saugių HTML URL, pirmenybę teikiant papildomai turinio užklausai su 138 eilutėmis. Nuskaityti keturi HTML dokumentai, trys turėjo skaitomą metadata ar tekstą. Naršyklės išvaizdos ir ankstesnio checkout veikimo netikrinome.

## URL ir turinio sprendimai

Mašininiu formatu sprendimai laikomi `url-decisions.json`. Sprendimo peržiūra nėra redirects įgyvendinimo įrodymas.

| Kelias | Sprendimas pirmam etapui | Ką dar reikia patikrinti |
| --- | --- | --- |
| `/` | Palikti dabartinį originalų nišos homepage tame pačiame kelyje. | Po paleidimo matuoti tikrą paieškos srautą ir užklausas. |
| `/traktoriu-padangos` | Kandidatas savitam pasirinkimo ir užklausos puslapiui senu adresu; kol kas atidėti. | Perskaityti konkretų seną snapshot ir sulyginti su homepage bei esamu parinkimo gidu, kad neatsirastų ketinimo dubliavimas. CDX įrašas vienas semantikos nepatvirtina. |
| `/kitos-zut-padangos` | Atidėti: kategorija platesnė už pirmo piloto siaurą pasiūlymą. | Prasmingas naujas puslapis tik turint atskirą kliento klausimą, originalų turinį ir tinkamą pasiūlymą. |
| `/produkto-kategorija/traktoriu-padangos/` ir `/shop/` | Neatkurti kaip veikiančios parduotuvės; atidėti antrai fazei. | Gyvas lygiavertis katalogas, tikri duomenys ir konkretaus istorinio puslapio ketinimo peržiūra. Į homepage ar informacinį gidą automatiškai nenukreipti. |
| `/kontaktai/` | Galimas 301 į dabartinį `/kontaktai`, bet kol kas tik pasiūlymas. | Perskaityti konkretų mėginį, patikrinti slash normalizavimą ir gyvą kanoninį tikslą. Ankstesnio operatoriaus rekvizitų nekopijuoti. |
| `/paslaugos` | Atidėti; seno pasiūlymo ir mūsų pajėgumo nepatvirtinome. | Faktai apie tai, ką iš tikrųjų galime suteikti, ir atskiras URL ketinimas. |
| `/autochemija` | Neatkurti pirmai traktorių padangų fazei. | Gretima tema nepagrindžia šio piloto puslapio; be lygiaverčio tikslo palikti 404. |
| `/cart/`, `/my-account/`, `/adv_count.php`, `/ads.txt` | Neatkurti kaip SEO turinio ir nenukreipti į homepage. | Jei vėliau kuriama prekyba ar reklama, šie adresai vertinami pagal tikrą techninę funkciją. |

Produktų, gamintojų, žymų ir `products-per-page` variantų masiškai nekuriame. Senas modelio pirkimo puslapis ir bendras padangų patarimas turi skirtingą ketinimą. Išsaugoto inventoriaus detalumas leidžia prie šių adresų grįžti vėliau; jis nesukuria šimtų privalomų publikacijų.

## SEO nauda ir ribos

Istorijos tyrimas kainavo 0 EUR mokamoms paslaugoms, naudojo viešą Archive.org sąsają ir ribotą vietinį vykdymą. Galima praktinė nauda — išvengti nereikalingai prarastų prasmingų adresų ir atkurti naudingą tos pačios paskirties atsakymą. Šiam domenui nauda dar **neišmatuota**: dabartiniai referring puslapiai, jų aktualumas, organinis srautas, Google manual actions ir turinio pernaudojimo teisės nežinomi.

Seno turinio ir vaizdų nekopijuojame be teisių. Naujo teksto publikavimo data nėra archyvo data. Domeno ankstesnis operatorius, jo atsiliepimai, kainos ir klientai netampa MB Pinet faktais. Archyvinė medžiaga lieka tyrime ir nepatenka į viešų ar balso agento dabartinių verslo faktų šaltinį.

Prieš įgyvendinant konkretų 301 reikia tikrinti to paties ketinimo, dabar patvirtintą ir publikuojamą 200 tikslą tame domene, be redirect loop. Google rekomenduoja nereikšmingų senų adresų nenukreipti į homepage; pašalintam turiniui tinka 404 arba 410. Tai perkėlimo gairės, ne seno domeno reitingų atkūrimo garantija. [Google URL perkėlimo gairės](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

## Toliau

Pirma paleisti patikrintą informacinį pilotą su tikrais kontaktais ir matavimu. Archyvo atidėti sprendimai nepristabdo pirmos fazės. Gavus realių užklausų ir dabartinių nuorodų įrodymų, pirmiausia peržiūrėti siaurą `/traktoriu-padangos` ketinimą ir konkrečius lankomus senus URL; prekybos katalogą plėsti tik pagrindus antrą fazę.
