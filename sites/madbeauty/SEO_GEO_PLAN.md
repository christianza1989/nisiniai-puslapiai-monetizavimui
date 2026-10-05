# Madbeauty SEO / GEO planas ir roadmap

2026-10-05. PROPOSED / RESEARCH_COMPLETE, runtime NOT IMPLEMENTED. Naujas savininko sprendimas: pilnas vietinis frontend prototipas su dummy data prieš realaus backend prijungimą. SEO projektuojamas kartu. [Tyrimas](../../research/madbeauty-seo-2026-10-05/RESEARCH.md), [šaltiniai](../../research/madbeauty-seo-2026-10-05/SOURCES.json), [produkto planas](PLATFORM_PLAN.md), [prototipo darbai](PROTOTYPE_ROADMAP.md), [URL politika](URL_POLICY.json).

## Tikslas ir ribos

Klientas ieško „veido masažas Vilnius“ ir gali patekti tiesiai į naudingą tos paslaugos specialistų katalogą. Puslapis turi padėti pasirinkti ir atlikti dabartiniame etape tikrai veikiančią užklausą / registraciją. Projektuojame galimybę atsirasti paieškoje, ne pažadą Google pozicijai ar indeksavimui.

Vienas puslapis gali atsakyti į kelias natūralias to paties ketinimo užklausas. Keyword aprėptis nėra URL skaičius. Ne kiekvienas filtro mygtukas kuria Google puslapį: paslauga + tikra vieta gali būti stabilus ketinimas; šiandien 17:15–18:45 už 31–39 € yra vartotojo laikina būsena.

GEO čia yra generatyvinės paieškos matomumas. Vietos / miesto duomenys papildomai palaiko local SEO. AI citavimo ar „autoritetą 10/10“ rodiklio neišgalvojame.

## Dvi duomenų aplinkos nuo pradžių

- Private prototype: fictional fixture IDs / media / kainos / laikai, demo banner, lokalus arba autentifikuotas preview, visiems atsakymams noindex ir privatus access control, nėra production sitemap ar LLM katalogo. Meta robots nėra duomenų apsauga.
- Production: tik patvirtinti realūs teikėjo duomenys / nuotraukų teisės, patvarus tikras veiksmas, host / siteId / revision / publishAt / pašalinimo vartai. Fixture ar preview režimas fail-closed neleidžia public import / discovery / schemas apie tariamus tikrus meistrus.
- Demo metu SEO testų fixture gali imituoti production politiką izoliuotai; tikras preview vis tiek lieka noindex. Testo sitemap nėra produkcinis sitemap.

## Informacijos hierarchija ir URL

| Puslapio tipas | Siūlomas pastovus URL | Kokia nauda / kada public index |
|---|---|---|
| Homepage | `/` | Tikras pasiūlymas ir katalogo atradimas |
| Paslaugų indeksas | `/paslaugos/` | Suprantama tikros pasiūlos klasifikacija |
| Paslaugos hub | `/paslaugos/veido-masazas/` | Kas pasirenkama ir kuriuose realiai aptarnaujamuose miestuose |
| Miesto hub | `/miestai/vilnius/` | Tikras mieste prieinamų paslaugų katalogas |
| Paslauga + miestas | `/paslaugos/veido-masazas/vilnius/` | Realūs teikėjai, konkrečios procedūros, palyginimas ir užklausos kelias |
| Paslauga + miesto rajonas | `/paslaugos/veido-masazas/vilnius/naujamiestis/` | Tik jei pakankama savita vietinė vertė ir pasiūla; ne automatinė kiekvieno rajono kopija |
| Tikras specialistas / salonas | `/meistrai/<stable-slug>/` arba `/salonai/<stable-slug>/` | Vienas tikras subjektas, aiškus profilio ir vietos ryšys |
| Gidų hub / straipsnis | `/gidai/`, `/gidai/<intent-slug>/` | Vienas tikras pasirinkimo / pasiruošimo klausimas |
| Paieškos darbo paviršius | `/paieska#paslauga=...&miestas=...&data=...` | Naudingas vartotojui, pati `/paieska` noindex, ne sitemap |
| Kliento / meistro / operatoriaus sritys | `/mano/`, `/meistrui/`, `/valdymas/` ir jų vaikai | Autorizuoti privatūs keliai, ne Google pasiūla |

URL mažosios raidės, vienas slug / trailing-slash susitarimas, geografijos priklausomybė miestas → rajonas, ne vardų eilutės be ID. Prototipo alias map atskiras nuo istorinių domeno redirect sprendimų; [history](history/ASSESSMENT.md) nekeičiamas automatiškai.

## Indeksavimo politika

1. Valdomas indexable katalogų registras, ne visų taksonomijos reikšmių Cartesian product. Kiekvienas kandidatas turi intent, serviceId, cityId / districtId, realių profilių projekciją, contentRevision, būseną ir eligibility reason.
2. Indeksavimo vartai: galiojanti paslauga / vieta; realūs publikuotini teikėjai; tikras dabartinio etapo veiksmas; kainų / trukmių / vaizdų kilmė; pakankama pasirinkimo ar vietos vertė; savitas intent; techninis crawl/canonical/schema priėmimas. Demo ir nepatvirtinta pasiūla vartų nepraeina.
3. Nėra Google reikalaujamo magiško „3 meistrų“ / „1000 žodžių“ slenksčio. Operatoriui reikia dokumentuoti, ar sąrašas leidžia prasmingai pasirinkti; vienintelis profilis gali būti naudingas, tačiau ta pati vieno profilio kopija dešimtyje rajonų savaime netampa dešimčia gerų katalogų.
4. Skirtingos realios procedūros turi atskirą serviceId. „Facial“ / veido procedūra nėra automatiškai veido masažo sinonimas. „Gelinis lakavimas“ ir bendras „manikiūras“ gali būti skirtingo lygmens intent; sujungti tik patikrinus tikrą pasiūlą ir skaitytojo užduotį. Sinonimai / gramatinės formos gyvena vieno puslapio tekste, ne naujuose dublikatuose.
5. Rajonų, Kobido ir kitų specializuotų tipų kandidatai plečiami tik su savo realia pasiūla, vertės pagrindimu ir atradimo nuoroda. Kainos ribos, stars thresholds, coordinates, lytis ir kelių filtrų kombinacijos pagal nutylėjimą UI-only; atskiras indeksavimo sprendimas nėra automatinis.
6. „Šiandien“ / „Rytoj“ pradžioje UI-only. Ateityje galima nagrinėti stabilų urgent landing tik jei yra realus kalendorius, savitas pirkimo klausimas ir pakankamas aktualus pasirinkimas. Nėra puslapio kiekvienai datai ar valandai; laisvų vietų pažadas negyvena stale metaduomenyse.

## Kaip filtrai veikia kartu su SEO

Pasirinkus paslaugą ir miestą, sistema gali atverti registruotą `/paslaugos/veido-masazas/vilnius/`. Pridėjus datą / valandas / kainos ribą, pasirinkimai saugomi URL fragmente, pvz. `#data=2026-10-06&nuo=17:00&iki=20:00`; žiniatinklio serveris gauna tik bazinį katalogo kelią. Google negauna atskiro datuoto puslapio kiekvienai kombinacijai.

Bazinį HTML serveris pateikia kaip aktualų patvirtintos pasiūlos katalogą; klientas pagal fragmentą užklausia laisvų laikų API. Tai ta pati vieša bazinė informacija žmonėms ir botams, ne cloaking ar specialus bot-only tekstas. Paieškos state neturi žmogaus vardo, telefono, email ar reservation token. Naudojami mygtukai / select trumpalaikei būsenai; tik indeksuojami hub / katalogų / profilių keliai turi normalias atradimo `a href` nuorodas.

Kai kombinacija neturi patvirtinto SEO katalogo, vartotojas pereina į `/paieska#...`, ne į išgalvotą indexable katalogą. Vienas noindex paieškos paviršius riboja crawl erdvę. Hash taikomas filtrams, ne paginacijos numeriams ar bazinių dokumentų canonical.

Jei atsiras query-string adapteris / ankstesni variantai, jis turi atskirą parametrų allowlist ir ribas; nežinomos kombinacijos nepatenka į sitemap. Lygiavertis tracking / sort dublikatas gali turėti canonical į tikrą bazę; privačiai / neindeksuotinai darbo paieškai taikomas noindex. Canonical nėra noindex pakaitalas. Ne nustatyti prieštaringų robots ir canonical tikslų visiems query URL vienu regex.

## Naudingas paslaugos miesto puslapis

Pavyzdys „Veido masažas Vilniuje“:

1. H1 ir trumpas tikslus paaiškinimas; aiškus paslaugos / miesto pasirinkimas. Rezultatai anksti puslapyje, ne po 1500 žodžių esė.
2. Realūs specialistai: patvirtinta vieta, atliekamos procedūros variantas, tikra kaina / `nuo` sąlyga, trukmė, portfolio ir prieinamas veiksmas. Laisvas laikas tik priimtame kalendoriaus etape.
3. Naudingas palyginimas: klasikinis veido masažas vs konkretus kitas patvirtintas variantas, kas įeina, priedai ir trukmės; neišgalvoti klinikinio efekto ar kvalifikacijų.
4. Vietos pasirinkimas: rajonai / susisiekimas / accessibility tik su tikrais duomenimis. Ne generinė pastraipa apie Vilniaus istoriją.
5. Kainų / trukmės suvestinė iš to paties matomo pasiūlos šaltinio. Imties dydis, data ir apimtis matomi; vieno teikėjo kaina nėra „Vilniaus rinkos vidurkis“. Paketai / kuponai / konsultacija neįtraukiami į vienos procedūros minimumą tyliai. Nežinomas priedas nesukuria fiktyvios galutinės kainos.
6. Keli trumpi tikri klausimai: kaip skiriasi procedūros, ką patikrinti prieš rezervaciją, kaip atšaukti pagal konkretaus teikėjo sąlygas. Gidas skirtas išplėstam atsakymui; nereikia kopijuoti viso gido į kiekvieną miestą.
7. Aiškios nuorodos į tikrus profilius, service hub, city hub ir susijusį gidą. Nėra visų kitų miestų / visų mūsų domenų footer nuorodų sienos.

Tekstas ir duomenų palyginimas yra redaguojami, peržiūrėti komponentai. AI gali parengti originalų brief / atsakymą iš patvirtintų faktų, bet nežinomą kainą, vietą ar specialisto įgūdžius palieka nežinomus. Autonominis puslapių planuotojas pasiūlo kandidatus su įrodymais; vien SEO keyword nėra publikavimo vartas.

## Turinio klasteriai

| Klasteris | Komercinis katalogas | Atskirų naudingų gidų kandidatai |
|---|---|---|
| Nagų priežiūra | Manikiūras / gelinis lakavimas + realiai aptarnaujamas miestas | Kas įeina į kainą; seno lako nuėmimas kaip rezervacijos priedas; kaip skaityti darbų portfolio |
| Veido masažai | Veido masažas + miestas; konkretus variantas tik su pasiūla | Kaip palyginti teikėjo nurodytus variantus; ką paklausti prieš vizitą; trukmės ir priedų palyginimas |
| Plaukai | Konkreti paslauga + miestas | Kaip teisingai pasirinkti paslaugą pagal teikėjo kainyną; konsultacija ir galutinės kainos ribos |
| Antakiai / blakstienos | Konkreti procedūra + miestas | Kas įeina į procedūrą; papildomos paslaugos ir pasiruošimo klausimai |

Tai aprėpties roadmap, ne patvirtintas public pasiūlos sąrašas. Live prioritetas lieka BUSINESS ir realių teikėjų įtraukimas. Pirmi trys gidai turi skirtingą užduotį ir peržiūrėtus originalius assets; gydymo / kontraindikacijų teiginiai reikalauja aktualių pirminių šaltinių ir tinkamos peržiūros, ne bendro AI užtikrinimo.

## Technical SEO / turinio gyvenimo ciklas

- SSR: H1, esmė, patvirtinti rezultatų profiliai ir normalios nuorodos iškart HTML. Laisvų laikų UI gali būti papildomas dinaminis sluoksnis; JS-only tuščias shell nėra katalogo rezultatas. Bot ir žmogus gauna tuos pačius viešus faktus.
- Metadata: konkretus title / description / canonical / Open Graph / `lang=lt`; title nepažada šiandienos laiko ar mažiausios kainos, jei metaduomenų aktualumas to nepalaiko. Lietuvių kalbos diakritikai turinyje, slug normalizacija atskirai.
- Canonical: bazinis katalogas self; sinonimų URL equivalence map / 301 tik tikram vienodam intent; jokio masinio 301 į homepage. Tracking parametrams bazinis target, internal links į švarų canonical.
- Pagination: `/paslaugos/veido-masazas/vilnius/?page=2` su savo canonical, realiu turiniu ir `a href` previous / next; deterministinis default sort. Ne visus puslapius canonical į pirmą. `page=1` normalizuojamas į bazę; out-of-range 404. Load more gali egzistuoti tik greta crawlable puslapių.
- Empty: nepatvirtintas / neegzistuojantis clean catalog ir absurdiškas geo / service derinys 404 tame URL. Vartotojo live availability paieškos nulis yra 200 noindex darbo paieškoje arba filtrų būsena esamame kataloge; neprarasti service/city SEO vien todėl, kad šiandien nėra laiko.
- Seno patvirtinto katalogo pasiūla laikinai išnyko: 200 noindex tik jei lieka prasmingas sąžiningas puslapis; pašalinamas iš discovery ir sitemap, operatoriaus peržiūra. Ilgalaikis panaikinimas 404/410 arba tikro semantinio replacement redirect; negeneruoti soft404 su tuščia keyword pastraipa.
- Actual paslaugos / profilio pašalinimas: negali likti search, schema, sitemap ir LLM projekcijoje. Slug rename tik su to paties tikro entity ID ryšiu; revocation/cache invalidation testas prieš live.
- Sitemap: atskirti catalog / providers / editorial dalis prireikus, vienas host; tik indexable patvirtinti dabartiniai canonical URL. `lastmod` reikšmingo turinio ar profilio pakeitimo data, ne kiekvieno kalendoriaus slot perjungimas. Pagination gali būti atrandama nuorodomis be visų jos URL privalomo sitemap.
- Robots / noindex: naujos neindeksuojamos darbo paieškos URL turi būti crawlable, kad noindex būtų perskaitytas; API/privati sritis neturi būti turinio atradimo kanalas. Login ir serverio teisės yra apsauga. Preview autentifikuotas / vietinis, noindex kaip papildomas saugiklis. Esamas core `Allow /` turi būti peržiūrėtas įgyvendinant marketplace, ne nukopijuotas aklai.
- Tik LT kalba pradžioje. `hreflang` tik su realiais atskirai peržiūrėtais vertimais ir reciprocity, ne šimtai automatiškai išversto miesto esė.

## Schema ir pasitikėjimo turinys

| Paviršius | Siūloma semantika / ribos |
|---|---|
| Platforma / operatorius | WebSite / Organization su tikru MB Pinet operatoriumi; ne visų salonų LocalBusiness |
| Katalogas | CollectionPage / ItemList ir BreadcrumbList iš matomo patvirtinto sąrašo; ne Product katalogas ar rich-carousel pažadas |
| Salonas / meistras | Tikras atitinkamas BeautySalon / LocalBusiness arba Person su realiais duomenimis; profilio tipas pasirenkamas pagal pagrindinį objektą, ne kiekvienam URL automatinis ProfilePage |
| Paslauga | Service ir, jei tikslūs faktai, Offer su realia kaina / valiuta / apimtimi; nepridėti fake stock ar appointment Event kiekvienai valandai |
| Atsiliepimai | Tik įgyvendinti tikri matomi mūsų renkamos trečiųjų teikėjų reviews pagal aktualias guidelines. Jokio dummy ar imported rating; žvaigždžių negarantuoti |
| Gidas | Article su tikru Organization ar tikru autoriumi, peržiūros ir publikavimo datomis, originaliu teminiu image |
| DUK | Naudingas matomas tekstas; Google FAQ rich result nuo 2026-05-07 neberodomas, todėl ne augimo prielaida |

Reikalingi apie / kontaktai, atrankos ir profilių tikrinimo metodika, redakcija ir actual autoriaus profilis, nuotraukų ir atsiliepimų politika, pranešti klaidą / pašalinti profilį, privatumas / slapukai / naudojimosi bei rezervavimo sąlygos. Galutinis teisinis tekstas atitinka faktinį procesą ir runtime, ne „jau viską siunčiame SMS“ demo. Netikrų ekspertų, diplomų ir atliktų darbų nėra.

## GEO / AI atradimas

Tikslūs entity ID, pastovi paslaugų semantika, patvirtintas adresas / trukmė / kainos apimtis ir matomi atnaujinimai padeda žmogui ir informacijos gavimo sistemoms. Esmė prieinama tekstu, nuotraukos turi semantinius alt, gido išvados su kontekstu ir aktualiais pirminiais šaltiniais. Nėra dirbtinio AI-only teksto ar prompt injection.

Googlebot ir Bingbot viešas crawl per realų CDN/WAF patikrinimą; OAI-SearchBot paieškos prieiga atskirai nuo GPTBot training pasirinkimo. Jokio visų botų privataus account access. `llms.txt` / full naudoja tik tą patį eligible viešą turinį; Google jų reitingams nenaudoja. Dinaminių provider entity adapteris turi prisijungti prie tos pačios projekcijos, ne atskiro nepatvirtintų draft sąrašo.

AI agentams naudingi semantic controls, prieinamas calendar pasirinkimas ir aiškus booking status. Tik tikras priimtas availability / booking API gali patvirtinti vizitą; ateities AI pats negeneruoja laisvų vietų. Specialus naujas AI commerce protokolas nėra šio etapo būtinas dependency.

## Matavimas ir prioritetų peržiūra

Po tikro launch: GSC page / query clicks, impressions, indeksavimo būklė; atskiras aktualus generative AI impressions report, jei matomas paskyroje; Bing AI citations / grounding duomenys pagal prieinamą actual report. Negeneruoti tariamo AI CTR iš report, kuriame tik impressions. Referrer nėra visų AI citatų apskaita.

Per canonical katalogą / paslaugą / miestą: realūs landing visits → tinkamos užklausos → teikėjo patvirtinimas → įvykęs vizitas, šaltinio / duplication taisyklės, support sąnaudos. Demo events turi atskirą namespace ir neįeina į paklausą. PII nelaikyti analytics URL / payload. Atskirai tiekėjų paraiškos ir pirkėjai.

Pirma sutaisyti indexing / faktų / kontaktų gedimus; tik po to spręsti dėl nišos paklausos. Naujas rajono / paslaugos kandidatas pagrindžiamas realia pasiūla, distinct intent, query / inbound signalais ir naudingu turiniu. Ne kiekvienas lankytojo filtras savaime išleidžia SEO puslapį.

## Darbų roadmap ir vartai

| Etapas | Darbas | Priėmimas |
|---|---|---|
| S0 — atlikta | Pirminiai šaltiniai, rinkos puslapiai, šis planas ir URL policy | Dokumentų patikra; ne runtime PASS |
| S1 — kartu su maketu | Taksonomija / route registry / typed demo model / metadata ir indexability policy | Peržiūrėtos intencijos, privatus demo, nėra prieštaringų canonical |
| S2 — pilnas prototipas | Visi [PROTOTYPE_ROADMAP](PROTOTYPE_ROADMAP.md) keliai, 3 gido layouts, mobile, states ir fixtures | Paspaudžiami keliai ir per-template SEO, noindex preview; ne live booking |
| S3 — SEO adapterio prototipas | SSR inventory, schema projection, sitemap / robots, bounded filtering ir pagination | Izoliuoti SEO-01–SEO-16 scenarijai, core regresijos prieš shared sujungimą |
| S4 — tikri duomenys / F1 | Patvirtinti specialistai, tikras užklausos kelias, pašalinti dummy, contact / media rights | A–Z local ir launch vartai, production approved supply projection |
| S5 — indeksuojamas pilotas | Tik atrinkti eligible katalogai / profiliai, GSC / Bing, actual crawl / metrikos | DNS/HTTPS/host/metadata/revocation, inbox ir privacy actual įrodymai |
| S6 — F2 live booking | Priimtas kalendorius ir AV-01–AV-14, aktualus laikų UI | Paklausos / vykdymo plėtros sprendimas, atomic booking; pats prototipas šio etapo neįjungia |
| S7 — plėtra | Nauji miestai / paslaugos / rajonai, originalus turinys, periodinė kokybės peržiūra | Realūs rezultatai ir originali vietinė vertė, ne automatinis 10 tūkst. URL planas |

## Priėmimo katalogas — dabar visi PLANNED / NOT RUN

| ID | Scenarijus / tikėtinas įrodymas |
|---|---|
| SEO-01 | Private preview neturi indexable HTML / assets / sitemap / LLM; auth ir noindex actual |
| SEO-02 | Dummy provider netampa production profiliu, ItemList, schema ar viešu turiniu |
| SEO-03 | Patvirtintas service/city SSR grąžina tikrus matomus profilius, 200, self canonical ir vieną H1 |
| SEO-04 | Nėra public route / sitemap kandidato be supply, intent ar approval vartų |
| SEO-05 | Visi laiko / arbitrary kainos / sort pasirinkimai lieka bounded UI state; param fuzz nekuria neribotų atradimo URL |
| SEO-06 | Sinonimo / tracking duplicate turi teisingą alias/canonical; service/district skirtumas nenormalizuojamas į kitą intent |
| SEO-07 | Pagination 2 self canonical, crawlable next/previous, page1 normalization, out-of-range 404 |
| SEO-08 | Nėra Google-only teksto, JS-off HTML turi esmę ir profilių discovery |
| SEO-09 | Schema atitinka matomą profilių / kainų / autoriaus turinį; zero imported/dummy ratings |
| SEO-10 | Revocation / slug rename / pasiūlos išnykimas išvalo tinkamą search/schema/sitemap/LLM ir cache |
| SEO-11 | Nėra robots blokavimo kartu su tikėjimusi perskaityti noindex; preview neapsaugotas tik robots |
| SEO-12 | Visi gidai, trust/legal ir autoriaus kelias, contextual external / internal links peržiūrėti |
| SEO-13 | Tikri originalūs / teisių turintys images, MEDIA_CORE responsive WebP, dimensions / alt / Article image actual |
| SEO-14 | Keyboard / mobile / loading / error / empty, Lighthouse su realiais assets; field CWV atskirai po launch |
| SEO-15 | GSC/Bing actual host crawl ir duomenys, no invented AI metrics; demo events nepaklausa |
| SEO-16 | Tikro veiksmo formos / booking metrikos; PII nepatenka į viešą URL / LLM / analytics |

Lighthouse planinis tikslas mobile Performance >=95, Accessibility / Best Practices / SEO po 100 kiek įmanoma; balai nepažadėti. Actual field CWV tikslai p75 LCP <=2.5s, INP <=200ms, CLS <=0.1; Lighthouse neįrodo field INP ar verslo paklausos.

## Bendro core integracijos ribos

Naudoti esamą host-aware metadata, patvirtintos versijos / laiko filtrą, MEDIA_CORE ir audito įrankius. Marketplace katalogų / provider / filtrų / paginacijos adapteris yra naujas darbas, ne jau veikianti core funkcija. Peržiūrėtuose public niche-seo / niche-sites / network config madbeauty registry nematytas; generic SEO dokumentų galimybė neprilygsta booking katalogo įgyvendinimui. Prieš shared schema / renderer keitimą atskiras WORKSTREAMS langas, abiejų repo sąsajos, `test:core` / `test:seo-smoke` ir marketplace actual scenarijai. Šiame tyrime shared failai neredaguoti.
