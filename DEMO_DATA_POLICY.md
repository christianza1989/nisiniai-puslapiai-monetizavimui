# Produkto sąsaja ir testiniai duomenys

Savininko 2026-10-05 nurodymas: demonstraciniai gali būti duomenys, profiliai ir grafikai; nuolatiniai puslapiai ir tekstai kuriami kaip galutiniam produktui. Skaityti kuriant savininko užsakytą platformos maketą ar veikiančią platformą. Sutartis neprideda paskyrų ar prekybos prie įprastos pirmos fazės nišos.

## Vienas produktas, keičiami duomenys

- Navigacija, footer, pagalba, teisiniai tekstai, formos, meta title ir CTA nekuriami kaip „demo“, „preview“, „būsimos sistemos“ aprašymai. Produktinis tekstas turi atitikti įgyvendintą elgseną; nežadėti neveikiančios funkcijos.
- Fiktyvūs duomenys ateina iš atskiro seed/adapterio. Tie patys komponentai ir duomenų kontraktai aptarnauja realius, testinius, tuščius ir klaidos atvejus; šaltinio keitimas nereikalauja perrašyti puslapių.
- Privatus testavimas turi vieną aiškią aplinkos žymą / atskirą kūrėjo valdiklį, kad fiktyvūs meistrai nebūtų palaikyti realiais. Tai nėra kiekvieno produkto teksto „demo“ variantas. Laikai ir rezervacijos patvirtinimas remiasi atitinkamo backend atsakymu.
- Testinės tapatybės, rezervacijos, atsiliepimai ir vaizdai atskiriami namespace ir kilmės registru. Production atmeta testinius įrašus; išjungtas seed negrąžinamas kaip realių duomenų fallback. Testavimo puslapiai noindex, be viešo sitemap/schema/LLM įrašų.
- Datos laikrodis ir seed centralizuoti; ne kopijuotos pasenusios datos komponentuose. Grafikai laikosi realių trukmės, buferių, pamainų ir persidengimo taisyklių.
- Kiekvienai svarbiai sąsajai reikia tikro puslapio, rolės, būsenų, veiksmų ir desktop/mobile patikros įrašo. Ekranų skaičius ar pervadintas bendras panelis nėra pilnos sąsajos įrodymas.

## Pavyzdinio katalogo kokybė

Madbeauty konkretus reikalavimas: bent 40 įvairių fiktyvių meistrų iš skirtingų miestų/profesijų, kiekvienam individualus portretas ir bent du aktualūs darbų/interjero vizualai. Individualumas vertinamas pagal matomą vaizdą, ne pavadinimą ar skirtingą to paties paveikslo crop. Kilmė privačiame manifeste; generuoti darbai nėra tikro salono portfolio. Naudoti MEDIA_CORE ir responsive WebP šeimas.

Pradiniame katalogo vaizde parodyti įvairius, paiešką atitinkančius įrašus su tikra testuojama registracija. Neprijungtas kalendorius / nėra vietų yra atskiras tikrinamas atvejis; jo neišspręsti fiktyviu laiku. Empty/loading/error/conflict būsenos turi padėti tęsti kliento darbą.

## Madbeauty apimties išimtis

2026-10-05 savininkas tiesiogiai paprašė veikiančios meistro registracijos ir kliento rezervacijos, vėliau apribojo testavimo registraciją el. paštu. Leidžiamas vietinis patvarus backend, paskyros, paslaugos, grafikai ir rezervacijos; ankstesnis frontend-only brief šio pavedimo neriboja. Priėmimas: [backend kriterijai](docs/MADBEAUTY_BACKEND_ACCEPTANCE.md). Kitų nišų fazės nekeičiamos.

Testinis pašto capture nėra tikras pristatymas ar el. pašto nuosavybės įrodymas. Viešas deploy, DNS, mokami tiekėjai ir klientų kampanijos nėra šios vietinės užduoties dalis. Produktinių tekstų paruošimas nėra teisinių faktų ar paleidimo įrodymas.
