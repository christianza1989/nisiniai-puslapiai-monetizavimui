# Laiptų pasiūlymo prielaidos · 2026-10-04

Statusas **evidence_only_no_new_proposal**. Klausimas: ar greitas internetinis laiptų pasiūlymas gali pakeisti objekte patikrintą gamybos ir montavimo apimtį? Ribotas esamos nišos vykdymo tyrimas, ne naujas BUSINESS sprendimas.

## Sprendimas ir esamas įgyvendinimas

[BUSINESS](../../../sites/laiptucentras/BUSINESS.md) jau atskiria kliento registruojamą poreikį nuo gamintojo matavimo, projekto ir sandorio. [Ankstesnis tyrimas](../../../sites/laiptucentras/RESEARCH.md) StairBox naudoja kaip užsienio modelio analogą; senas matavimo gido 403 rezultatas nepakeičiamas šios dienos kitų puslapių prieiga.

Esama `laiptucentras/supplier.md` instrukcija reikalauja atskirti konstrukciją, pakopas, turėklus, apdailą, matavimą ir montavimą; tikrinti teritoriją ir atsakomybę, nesuderinti inžinerinio sprendimo pačiam. Viešo core `laiptucentras-quote-check.mjs` bei komponentas išlaiko unknown/included/excluded ir aiškiai nereitinguoja kainos, saugos ar gamintojo. Tai šaltinio peržiūra, ne naujas vykdymo ar GUI testas.

Šie vartai jau apima nustatytą klausimą. Naujo kainų skaičiuotuvo, matavimo agento ar tiekėjų integracijos nesiūlau; esamiems failams pataisų neatlikau. [IDEAS](../../IDEAS.md) ir pending BDEV-0002 / BDEV-0003-P1/P2 nekeičiami.

## Aktualūs pirminiai įrodymai

[Roberto laiptai](https://robertolaiptai.lt/laiptu-gamyba/) tikslią kainą sieja su konsultacija ir matavimu, pristato savo projektavimo, gamybos ir montavimo kelią. Tai teikėjo teiginiai, ne mūsų sutartis ar pajėgumas.

[StairBox projektavimo kelias](https://www.stairbox.com/design) prieš greitą kainą reikalauja išmatuoti angą; po užsakymo numato pristatymą arba atsiėmimą. Internetinis konfigūratorius nėra mūsų objekte atlikto matavimo įrodymas.

[StairBox sąlygos](https://www.stairbox.com/terms-and-conditions.html) gamybą sieja su kliento įvestais dydžiais ir brėžinių patikra vietoje. Standartinis pristatymas aprašytas tik žemyninėje JK, prie saugaus iškrovimo taško; tai nėra montavimas Lietuvoje. Šis puslapis neatstoja aktualaus individualaus tiekėjo patvirtinimo ar mums galiojančios sutarties. Teisinio jo taikymo Lietuvos klientui nevertinau.

[Metalinių laiptų pasiūlymas](https://www.stairbox.com/metal-staircases.html) aprašo komplektą surinkimui objekte, įvesties matmenis, konstrukcijos duomenis, survey dokumentą ir brėžinius. Survey dokumento pateikimas savaime neįrodo specialistų atvykimo pas mus. Reklaminio paprasto surinkimo teiginio neperkeliu į mūsų pažadus.

Tai pasiūlos ir vykdymo sąlygų įrodymai. Nežinomi mūsų mokėtojas, priimtos užklausos atlygis, realūs sandoriai ir noras pirkti; JK kainų ar techninių normų į LT modelį neperkėliau.

## Mažiausias praktinis vertinimas

Dabar tęsti esamą pirmos fazės planą yra paprasčiau nei kurti naują modulį. Kai teisėtai gaunami pirmi du tikri savo klientų pasiūlymai, esamo apimties palyginimo ir rankinės peržiūros pakanka atskirti: kieno ir kada tikrinti matmenys, kokiam objektui / versijai kaina, kas matuoja / projektuoja, kokia gaminio ir apdailos apimtis, kas pristato / montuoja, ar tiekėjas aptarnauja vietovę. Neaišku lieka neaišku; agentas gali parengti trūkstamų duomenų klausimus aktyvaus mandato ribose.

Iki 30 minučių dviejų pasiūlymų tokiai peržiūrai – planavimo prielaida, ne pamatuotas našumas. Naujos prenumeratos nereikia; darbo ir AI naudojimo kaštus reikia registruoti. Nėra dabartinio pasiūlymų rinkimo ar siuntimo piloto. Partnerio priimta tinkama užklausa yra esama būsima mokama vertė; visas gamybos krepšelis nėra mūsų pajamos.

Priėmimas: išlieka objekto / pasiūlymo versijos, patikrintų ir kliento nurodytų matmenų skirtumas, apimties bei teritorijos neaiškumai; iš dviejų nevienodos apimties sumų nepaskelbiamas automatinis laimėtojas. Stabdyti / patikslinti, jei trūksta šių faktų, pateikiamas vien kitos rinkos katalogo įkainis ar reikalingas profesionalus objekto įvertinimas. Pasiūlymų nebuvimas neįrodo rinkos paklausos nebuvimo. Vykdytojo nenoras mokėti ir neigiama tikra ekonomika keistų BUSINESS modelį; dabartiniai šaltiniai jo nekeičia.

Du ateities vertinimo pavyzdžiai, **nevykdyti**: (1) kliento matmenimis paremtas JK komplekto pasiūlymas negali būti automatiškai sutapatintas su LT pasiūlymu po matavimo ir su montavimu; (2) tiekėjo survey failas neturi automatiškai tapti patvirtinto atvykimo įrašymu. Naujo testavimo kodo nėra.

## Savininko sprendimai ir ribos

Perskaitytas tiesioginis savininko pavedimas core sesijoje autonomiškai tęsti kalibravimą ir mokymąsi; jo vietinio įgyvendinimo kvitas yra vykdytojo rezultatas, ne šios sesijos naujų bandymų approval. Root naujausias pavedimas – trijų nišų sesija. Tos sesijos tikrame savininko pranešime „Metalo-tvoros.lt nedaryk kolkas“ patvirtintas atidėjimas; šios nišos neperimu. Autoelektriko / pastolių užbaigimo žinutės nėra mūsų paklausos įrodymai. Naujas mūsų eksperimentų patvirtinimas nerastas.

Rašymo ribos – tik savo business-development tyrimas ir STATE. Keturi pirminiai HTML puslapiai perskaityti. Sekretai, klientų inbox, DB, paskyros, DNS ir gyvos kampanijos neliesti. [SOURCES](SOURCES.json) · [QA](QA.json). Savininkui naujo pasiūlymo ar nepasikeitusios būsenos nekartoju.
