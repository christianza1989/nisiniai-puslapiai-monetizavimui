# Domenai Europos prekės ženklui

2026-10-12 savininkas pasirinko **memorycasting.com** kaip tarptautinį prekės ženklo domeną, su lokalizuotu pristatymu partneriams ir būsimų partnerių paieškos agentų keliu. Tai patvirtintas norimas vardas ir paskirtis; registracija, savininko paskyros kontrolė ir DNS dar nepatikrinti. Jokio domeno pirkimo ar DNS/nukreipimo pakeitimo neatlikta. Ankstesnė .com/.eu rekomendacija žemiau paaiškina sprendimą.

Tarptautiniam vardui rekomenduojamas tinkamas .com. .eu taip pat tinkamas, ypač jei norimas .com neprieinamas; tai prekės ženklo pasirinkimas. Google .com ir regioninį .eu traktuoja kaip bendrinius domenus, .eu nesuteikia specialaus visos Europos geografinio taikymo. .lt siunčia Lietuvos šalies signalą. Kalbų turiniui rekomenduojami skirtingi URL, aiškios kalbos, hreflang ir vartotojo valdomas pasirinkimas; IP ar naršyklės kalba neturi automatiškai paslėpti kitų versijų. [Google gairės](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).

Savininko pasirinkta kryptis: memocasting.lt parduotuvė su [senais adresais](MIGRACIJA.md), **memorycasting.com tarptautinis brand ir partnerystės centras**. [Partnerių svetainės planas](PARTNERIU_SVETAINE.md). .com turėtų lokalizuotą turinį ir privatų didmenos kelią; vieno domeno turėjimo pats vardas neįrodo. LT/PL/LV/EE mažmeninės prekybos planas lieka atskiras: .com B2B pasirinkimas savaime nenusprendžia, kad visas užsienio B2C katalogas bus tame pačiame viešame host. Šių projekcijų URL nustatyti prieš storefront įgyvendinimą. Keli atskiri kiekvienos šalies domenai dabar nereikalingi. .eu apsauginiam nukreipimui tik jei savininkas nuspręs jį įsigyti; pilnų tokio pat turinio kopijų trijuose domenuose nekurti.

Lokalizacijų pavyzdžiai (planuojami, ne viešų veikiančių puslapių patvirtinimas):

| Paskirtis | Struktūra |
|---|---|
| Lietuvos parduotuvė | memocasting.lt/ ir išsaugoti /products/... bei /pages/... |
| Lenkijos partnerystė | memorycasting.com/pl/...; pl-PL, tikro pasiūlymo valiuta ir pristatymas |
| Latvijos partnerystė | /lv/...; lv-LV, patvirtintos tiekimo sąlygos |
| Estijos partnerystė | /et/...; et-EE; kalbos kodas et, šalies kodas EE |
| Angliškas tarptautinis/B2B turinys | /en/...; kalbos ir rinkos taikymas pagal tikrą prieinamumą |
| Ispanijos partnerystė | /es/...; es-ES, patvirtinta ispaniška instrukcija/pakuotė ir individualus tiekimo pasiūlymas |

Tai vienas commerce storeId, katalogas, sandėlis, MB Memocasting mokėjimų ir administravimo sistema su keliais patvirtintais host. Public puslapiai naudoja bendrą host-aware rendererį ir turinio pipeline. Kiekviena kalbinė versija turi savo canonical, reciprokinį hreflang į lygiaverčius puslapius, aiškius valiutos/pristatymo pasirinkimus. Lokalizacija nėra vien tekstų vertimas; reikia realios instrukcijos, pakuotės, pagalbos ir teisinio kelio tai rinkai.

LT ir .com lietuviškų produkto kopijų tuo pačiu metu nekuriame. Jei vėliau savininkas pasirinks visą LT perkelti į .com/lt/, reikės atskiro tikslaus URL žemėlapio, permanent redirect, GSC migracijos ir išorinių GET patikrų; tai nereikalingas pirmo atkūrimo etapas. Esama paieškos pozicija po pakeitimų negarantuojama. Memorycasting.lt ankstesnio landing page paskirtis/nukreipimai nustatomi iš abiejų domenų inventoriaus, ne iš vardo panašumo.
