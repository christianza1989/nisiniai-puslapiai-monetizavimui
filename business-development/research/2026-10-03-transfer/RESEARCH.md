# Vienos nišos perdavimo duomenų riba · 2026-10-03

Klausimas: ar dabartinis turinio eksportas pakankamas parduodamos nišos perkėlimui ir ar bendrų duomenų eksportas gali atrinkti vienos nišos įrašus? Tyrimo išvada – turinio paketas ir bendros lentelės eksportas turi skirtingas ribas. Siūlomas **BDEV-0003-P2, proposed**, konkreti jau numatyto M9 / BDEV-0003 perdavimo bandymo dalis, ne naujas core ar naujas BDEV ID.

## Faktinis pagrindas

[VISION](../../VISION.md) ir [M9](../../../agent-business-core/ROADMAP.md) jau numato perleidžiamą paketą bei vieno verslo iškėlimą. [Akmeno HANDOVER](../../../sites/akmenas/HANDOVER.md) yra vietinio rezultato ir paleidimo ribų perdavimas projekto vykdytojui; jis neįrodo pardavimo kitam savininkui. Tai ne nauja komercinė strategija, o vienos jos techninės priklausomybės patikslinimas.

[Studijos modelio](../../../content-studio/src/model.mjs) `packageForSite` tikrina puslapių siteId, patvirtintų versijų hash ir vidinius tikslus; `exportPackage` išrašo JSON ir puslapių medijos failus. [Schema](../../../content-studio/schemas/content-package.schema.json) apibrėžia turinį ir kontaktą. Ši funkcija neeksportuoja viešo rendererio, hostingo, užklausų ar analitikos lentelių. Tai jos apimties faktas, ne klaida.

Perskaitytas esamas `content-studio/output/miniekskavatoriai/content-package.json`: schemaVersion 1, 12 puslapių, vienintelis puslapių siteId `miniekskavatoriai`, 20 unikalių medijos kelių. Skaitymas ir skaičiavimas nėra naujas eksportas, failų egzistavimo, patvirtinimų hash ar paleidimo patikra. `MiniekskavatoriaiSite` importa bendras niche-sites, SEO, media, schema, tekstinių nuorodų ir analitikos dalis bei savo įrankius/CSS. Vien JSON nėra šios svetainės autonomiškai veikiantis kodas.

Viešo core `drizzle/0004_niche_leads.sql`, `0005_niche_interest_daily.sql` ir `db/schema.ts` rodo bendras lenteles su `site_id`: užklausų kontaktai/aprašas ir atskiri dienos/path/event skaitikliai. Tikrų DB neskaičiau; nepatvirtinau, kad jose yra klientų. Jei jose yra kelių nišų įrašų, visos lentelės perdavimas išneštų ir kitos nišos duomenis. Negalima to pakeisti vien pažadu, kad turinio paketas turi siteId.

## Aktualūs pirminiai šaltiniai

[D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/) dokumentuoja DB ir lentelės SQL eksportą, schema/data režimus bei faktą, kad eksportas blokuoja kitas DB užklausas. [D1 API export](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/) turi `tables`, `no_data`, `no_schema`; dokumentuotose dump parinktyse nėra eilučių `WHERE site_id` filtro. Mano išvada: lentelės atranka savaime nesuteikia vienos nišos atrankos. Tai ne teiginys, kad per-site eksportas apskritai neįmanomas ar kad mūsų runtime jau nutekino duomenis.

[Cloudflare domeno perkėlimo](https://developers.cloudflare.com/fundamentals/manage-domains/move-domain/) aprašas atskiria registratoriaus prieigą, DNS, paskyros nustatymus ir sertifikatus. DNS įrašų atkūrimas ir nauji sertifikatai reikalingi atskirai; domeno perkėlimas nėra visos mūsų programos perkėlimas. Dabartinė mūsų domeno kontrolė, registratorius ir production sąlygos šiuo tyrimu netikrintos. Nieko neperkeliu.

## Kodėl mažas bandymas vertingas

Naudos gavėjas – būsimas vienos nišos pirkėjas ir operatorius, kurie turi žinoti ką perima ir ko neperima. Pardavimo ar tęstinio platformos mokesčio dydis dar nežinomas. Mechanizmas – patikrinta iškėlimo riba leidžia pagrįsti parduodamą etapą ir įvertinti perdavimo darbo sąnaudas; techninis PASS neįrodo pirkėjo noro mokėti.

Alternatyvos: palikti viską bendrame core ir parduoti valdymą kaip platformos paslaugą (reikia tikros nuosavybės/prieigos/atsakomybės sutarties); perduoti tik domeną ir turinį (pirkėjas negauna veikiančio runtime); arba iškelti savarankišką verslą (reikia kodo teisių, integracijų, duomenų ir atkurto veikimo). Dabar nereikia kurti visų trijų. Viso core / visos DB kopija vienam pirkėjui nėra tinkamas šio bandymo pakaitalas.

Mažiausias siūlomas eksperimentas – iki 4 agento darbo valandų atskiras **tik vietinis sintetinių duomenų eksporto/atkūrimo bandymas** dviem lentelėms, vienai pasirinktai nišai ir kitai kontrolės nišai. Jis konkretintas [PILOT.md](PILOT.md). Naujos prenumeratos nereikia; 4 valandos yra stabdymo riba, ne trukmės pažadas. Esamo vykdymo/AI kaštai registruojami; perdavimo, palaikymo ir viso savarankiško verslo sąnaudos dar nežinomos.

Priėmimas: tik pasirinktos nišos sintetiniai įrašai atkuriami naujoje vietinėje DB; kitos nišos canary įrašų nėra; turinio ir veikimo apimtys dokumentuotos atskirai. Trūkstamas ar nežinomas siteId, pakartotinis importas ir pažeistas eksportas turi apibrėžtą rezultatą. Stabdymas: gyvų duomenų, paskyros, DNS, licencijos ar migracijos poreikis nepatenka į šį eksperimentą; pasiekus laiko ribą išsaugoti neužbaigtus įrodymus, ne deklaruoti PASS. Naujas įrodytas jau veikiantis per-site iškėlimo įrankis pakeistų pasirinkimą į jo patikrą, ne antrą realizaciją.

## Koordinavimas ir nežinomybės

Tikras naujausias savininko pavedimas root – naujai sesijai sukurti tris nišas; core vykdytojo naujausias nurodymas – „tęsk“. Jų 2026-10-03 site/import bei sunkaus kliento mokymosi WORKSTREAMS ribos neperimamos. BDEV-0001 lieka root. Šis pasiūlymas nėra savininko approval. Po aiškaus patvirtinimo bandymo failai būtų tik atskirame šios sesijos kataloge; bendrų schema, runtime ir studijos eksportavimo funkcijų integracija neįtraukta.

Nėra atliktas viso repo eksporto auditavimas: keli pirminiai spėti keliai neegzistavo, tada naudojau `rg --files` ir tikrus `content-studio/src/model.mjs`, viešo core `db/schema.ts` bei SQL migracijas. Neegzistuojantis spėtas API kelias nėra API nebuvimo įrodymas. Platesnė M9 integracija, tikrų kontaktų teisėtas perleidimas, rendererio licencija ir savarankiško veikimo kaštai lieka neištirti / nepatvirtinti. Tyrimas nerodo actual klientų duomenų nutekėjimo.

[SOURCES.json](SOURCES.json) · [QA.json](QA.json). Visi nauji verslai lieka pirmoje fazėje.
