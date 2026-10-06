# Facebook augimo ir pelno sistema

2026-10-07 · v2 plano papildymas pagal savininko peržiūrą. Tai planuojami darbai, ne veikiantys Page/grupių adapteriai. Aktualus [roadmapas](../../FB_AGENT_ROADMAP.md), [produktas / kanalų tyrimas](RESEARCH.md) ir [pilotas](PHONEBRIDGER-PILOT.md) lieka bendras kontraktas.

## Ką taisome pirmame plane

Pirmas planas buvo stipresnis darbo eilės ir atsakymų į rastus poreikius srityje negu nuosavo Page augimo srityje. Jame nebuvo pilno Page kalendoriaus, originalių įrašų eksperimento, Page tapatybės grupėse, aktyvios komentarų diskusijos, kūrybos sąnaudų ar atskiro Page kanalo sprendimo. Vienas 14 d. grupių testas negali vienodai priimti viso organinio Page augimo kanalo. Naujame variante šios dalys turi konkrečius darbus ir atskirus rezultatus.

Pelną laikome tikslu, kurį tikriname actual kohortomis. Populiarus įrašas gali padėti auditorijai ir pardavimams, tačiau jo populiarumas ir pelningumas yra dvi atskiros būsenos. Algoritmo reach ar garantuoto viral rezultato agentas nežada.

## Penki susieti darbo keliai

| Kelias | Agentas daro | Mokamo rezultato ryšys |
| --- | --- | --- |
| Nuosavas verslo Page | Planuoja ir publikuoja originalias demonstracijas, patarimus, palyginimus, konkrečias diskusijas | Sukuria tikslinę auditoriją, demo/beta/pirkimo kelią ir grįžtantį susidomėjimą |
| Dalyvavimas kitų grupėse | Tinkama verslo Page, jei leidžiama; naudingi klausimų atsakymai ir atskirai leidžiami originalūs įrašai | Pasiekia konkrečius poreikius ir didina atpažįstamą produkto tapatybę |
| Komentarai ir inbound | Atsako į klausimus, paaiškina ribas, kvalifikuoja poreikį ir palaiko prasmingą viešą diskusiją | Pašalina kliūtis išbandyti/pirkti; realūs klausimai tampa kitu naudingu turiniu |
| Bendradarbiavimas | Randa tinkamus desk-setup kūrėjus / bendruomenių partnerius ir rengia konkretų bendrą pasiūlymą | Atskiras attributable sales/referral bandymas, sutartis ir actual sąnaudos |
| Produkto grįžtamasis ryšys | Grupuoja įdiegimo/kompatibilumo/vertės kliūtis, perduoda source savininkui ir matuoja pataisos rezultatą | Padidina aktyvaciją ir naudojimą, mažina support/refund; neišleidžia produkto pakeitimo savarankiškai |

Nuosavą grupę kurti tik radus pasikartojantį bendruomenės poreikį ir pajėgumą moderuoti. Pradinis kriterijus: bent10 realių žmonių patvirtina norą naudoti tokį formatą. Tai bandymo slenkstis, ne prognozė. Nereikia tuščios grupės kiekvienai nišai. Marketplace, Shops, creator payouts ir paid ads turi savo product/region/eligibility vartus; jų nelaikyti dabar veikiančiu nemokamu software pardavimo kanalu. Pirminės pajamos — produkto pardavimas svetainėje.

## Page tapatybė grupėje

Meta [grupės prisijungimo pagalba](https://www.facebook.com/help/ipad-app/401492893195007) patvirtina, kad Pages gali jungtis, jeigu administratoriai jų nedraudžia. Tai UI funkcija; ji neįrodo galimybės tą patį automatizuoti per Pages API.

Siūlomas prioritetas: atpažįstama konkretaus verslo Page ten, kur ji priimama, su aiškiu ryšiu su produktu. Asmeninį profilį naudoti tik atskirai tinkamu ir autorizuotu keliu; neperjungti jo vien tam, kad apeitume Page draudimą ar moderation. Tikriname tokią sąlygų matricą:

| Laukas | Reikšmė |
| --- | --- |
| siteId / PageID / groupID | Tiksli niša, konkretus valdomas Page ir konkreti grupė |
| Page management access | Tikras šio Page valdymo lygis, ne bet kurios Page tokenas |
| Page participation | allowed / denied / unknown pagal aktualią grupę ir UI |
| Membership | not_requested / requested / approved / limited / rejected / removed |
| Publication rights | Atskiri post/comment/link/media/event vartai, rules edition ir inspection time |
| Target actor | Asmeninis profilis arba konkretus PageID; tikrinti prieš kiekvieną write |
| Transport | Actual leidžiama UI/API galimybė; method scope ir platformos teisės |

Narystės patvirtinimas, dalyvavimo leidimas ir post moderation yra skirtingi. `Submitted`/`pending moderation` nereiškia visible post. Page narystė neimportuoja visos grupės ar nesuteikia DM teisės jos dalyviams. Grupės tiesioginių žinučių negalima painioti su Page Messenger.

## Page paruošimas prieš turinį

- [ ] Pasirinkti tikrą valdomą PhoneBridger Page arba parengti jos sukūrimą konkrečiam autorizuotam live etapui. Jokio spėjimo, kad ji jau yra.
- [ ] Logotipas, viršelis, trumpas tikras produkto aprašas, canonical website, tikras kontaktas ir vienas tinkamas CTA.
- [ ] Pinned pradžios įrašas: kam produktas, patikrinta demonstracija, Windows+Android ribos, beta ir pirkimo kelias.
- [ ] Trumpa pagalbos / dažnų klausimų eiga, aktualių faktų retrieval, atsakymo kalba ir pause/escalation.
- [ ] Page health/recommendation/publishing permissions inventorius, jeigu šie duomenys actual prieinami.
- [ ] Post IDs, reply transportas, statistikų gavimas ir atribucija; missing metrics rodyti UNKNOWN.

Vienam verslui vienas pagrindinis Page, jei toks pagrįstas. Visų tinklo Page nekurti be poreikio; per-site modulis gali būti OFF arba pasirinkti kitą kanalą. Nuosavos Pages neskatina viena kitos fiktyviais like/comment ir nekeičia personažo į nepriklausomą klientą.

## Originalaus turinio sistema

Meta2026 [originalumo gairių paaiškinimas](https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/) teikia prioritetą originaliai kūrybai ir mažina menkavertės kopijos platinimą. Praktinė išvada mūsų verslui: filmuoti/parodyti savo realų patikrintą produktą, kurti savą naudingą pasakojimą ir atsakymus į tikrus klausimus. Šis šaltinis negarantuoja mūsų reach ar pajamų.

Agentas turi verslo kontekstą, turinio piliorius, auditorijos stadiją, assets ir30d. slenkantį kalendorių. Kalendorių atnaujina kas savaitę pagal realius klausimus / kohortos rezultatus, ne aklai generuoja pusmetį vienodų reklamų. Turinio core bendros fakto/peržiūros/media kilmės taisyklės naudojamos, tačiau FB social asset/post nėra automatiškai svetainės Article release. Svetainės gidų kalendorius išlieka atskiras.

Pradinis Page planas: **4 originalūs įrašai/sav.**, jei yra tikri assets ir darbo biudžetas. Dvi trumpos demonstracijos, vienas patarimas/palyginimas ir vienas konkretus diskusijos klausimas. Tai eksperimento kadencija, ne algoritminė taisyklė. Nebūtina visų formatų API prielaida: nepriimtas video transportas neleidžia fake Reel; galima pradėti priimtu photo/text keliu su aktualiu scope.

| Turinys | PhoneBridger kampas | Tikslas / CTA |
| --- | --- | --- |
| Problemos demonstracija | Tas pats konkretus veiksmas pasiekiant telefoną ranka ir naudojant PC pelę | Suprasti mechanizmą; demo, jeigu nori pamatyti daugiau |
| Realus naudojimas | Savo Android ekranas be privačių duomenų ir PC klaviatūra | Patikrinti, ar šis scenarijus aktualus žmogui; beta |
| Alternatyvų sprendimas | Kada užtenka scrcpy/Phone Link ir kada verta testuoti PhoneBridger | Nešališkas device/use-fit; ne išgalvota „greičiausias“ lentelė |
| Setup pamoka | Vienas tikras pairing/permission/return veiksmas | Sumažinti aktyvacijos kliūtį; setup guide |
| Konkretus klausimas | „Kurį telefono veiksmą dažniausiai atliekate nenutraukę darbo PC?“ | Naudingi realūs scenarijai; CTA neprivalomas |
| Produkto pokytis | Patikrinta actual release pataisa, ko žmogui ji padeda | Sugrįžti bandyti tik jei update tikras |
| Vartotojo patirtis | Patikrintas naudotojo setup, leidimas naudoti jo mediją / tekstą | Pasitikėjimas; jokių sample review kaip realaus testimonial |

Naudinga diskusija gali rinkti reakcijas ir komentarus. Nenaudoti „rašyk+“, „tag3“, dirbtinio ginčo ar fiktyvių komentarų vien algoritmo signalui. Meta [engagement-bait paaiškinimas](https://about.fb.com/news/2017/12/news-feed-fyi-fighting-engagement-bait-on-facebook/) ir2025 [spam/fake-engagement pakeitimai](https://about.fb.com/news/2025/04/cracking-down-spammy-content-facebook/) pagrindžia šią ribą. Tikras patarimo / patirties klausimas lieka tinkamas turinys.

Nenurodyti visuotinės magijos „nuorodą tik komentare“ ar „Reels visada laimi“. Link placement / native content / tiesioginio CTA variantai yra matuojami bandymai. Kelios grupės gauna joms naudingą, taisykles atitinkantį turinį; viena kopija nedauginama į visą tinklą.

## Content-job ir publikavimo kontraktas

Siūlomi laukai, ne jau veikianti DB/API: siteId, PageID, contentId, experimentId, audience, purpose, format, creativeVersion, actual offerEdition, assets/rights/hash, factual review, publishAt+timezone, allowed channel, target identity, CTA/destination, caps, providerPostId/permalink ir status. Grupinis variantas turi savo target/group/rules ir aiškų derivation ryšį su originalu.

Esami signal/draft job nepaverčiami Page originaliais postais be signalo. Plėsti esamą FB moduli atskira `content_job` paskirtimi, ne kurti fiktyvų buyer signalą tam, kad tilptų į dabartinį `/actions`. Naujų laukų/action kinds/endpointų patikra priklauso būsimos implementacijos PR.

Planuojama eiga: idea → planned → assets_ready → reviewed → scheduled → dispatching → submitted/pending_moderation → confirmed_published arba blocked/failed/uncertain/cancelled. API creation, viešas matomumas ir insights yra atskiri receipts. Naudoti vieną scheduling autoritetą — mūsų durable runner arba actual provider schedule, ne abu vienu metu. Restart/timeout/publishAt pakeitimas negali išpublikuoti dublikatų.

Asset planas: originalas ir kilmė, tinkamas frame/crop, šriftų dydis telefone, subtitrai/alt jeigu formato kanalas juos palaiko, peržiūrėtas preview ir actual provider accepted media. MEDIA_CORE WebP taikomas svetainei; FB transportui eksportuoti actual priimamą formatą, ne daryti prielaidą, kad WebP/post/video vienodai palaikomi. ImageGen galima naudoti brand iliustracijai; vaizdu nesugalvoti fizinio veikimo, klientų ar rezultatų. Šis planas negeneruoja video/assetų ir neprijungia jų publikavimo.

## Diskusijų palaikymas, kai postas pritraukia žmones

Komentarų routeris skiria: konkretus produkto klausimas, tinkamas buying intent, support, patirtis/atsiliepimas, neutralus bendravimas, partneris, spam/abuse ir unknown. Ne kiekvienas „gražu“ tampa sales job. Naują klausimą apie produktą atsakyti viešai, jei tai padeda ir kitiems; privačių užsakymo faktų neviešinti.

Agentas atsako į klausimą ir, jei reikia, užduoda vieną tikslų tęsinį. Nuoroda į atitinkamą setup ar shop tik tinkamame momente. Nėra automatinės sales nuorodos kiekvienam like/komentarui. DM tik per tikrą tinkamą kanalą/scoped invitation; komentaras „domina“ savaime nesuteikia neribotos Page žinučių serijos.

Realus kritinis atsiliepimas nepaslepiamas vien dėl reputacijos. Moderation veiksmai turi actual taisykles ir atskiras capabilities; delete/hide nėra numatytas paprasto reply leidimo priedas. Spam/harassment eskaluoti pagal taisykles, actual support defektą perduoti esamam site Case.

Viral spike: durable inbound eilė, dedup, bounded atsakymų kvota, provider limits, backlog amžius ir triage. Pradinis site darbo cap20 prasmingų viešų inbound atsakymų/d., atskirai nuo iki3 proactive komentarų/d. Tai mūsų limitai, provider gali leisti mažiau. Viršijimas nesukuria neatskleisto neriboto modelio/spend. Svarbų buying/support klausimą prioritizuoti; likusiems UI rodo pending ir current service state. Nepažadėti konkretaus response SLA be actual runtime.

Tą patį thread leidžiama tęsti pagal tikrą naują klausimą. Piloto „iki1 į originalų thread“ ribojimas taikomas naujam proactive pitch, ne visam autorizuotam inbound pokalbiui. Tai v1 plano pataisa.

Šios kanalų kvotos nėra sudedamos: visi turinio ir atsakymų darbai telpa į bendrą mažesnį paskyros/site/modelio/laiko/pinigų limitą. Piloto paruošimo riba yra iki 20 modelio bandymų per dieną, įskaitant nesėkmingus. Prieš runner priėmimą nustatyti ir medijos kūrimo ribą. Likęs darbas laukia eilėje; support ir tinkamo pirkėjo klausimai turi rezervuotą pajėgumą.

## Kaip optimizuojame pelną

**Kūrybos ir kanalo tikslas:** daugiau pelningų tikrų klientų per ribotą agento darbo laiką. Taip pat matuojama tikro support kokybė ir pagalba aktyvuotis, kad agentas neignoruotų naujų pirkėjų vien todėl, kad jų atsakymas negeneruoja naujo sale.

Pardavimo įnašas = actual pajamos minus nuosekliai apskaityti payment/tax/refund/fulfilment/support kaštai. Eksperimento įnašas = jam pagrįstai priskirtų pardavimų įnašas minus acquisition/AI/media/partnerių kaštai ir aiškiai įvertintas darbo laikas. Net software turi support sąnaudas. Hardware apyvarta nėra visa marža. Kaštams nežinomiems rodyti intervalą/prielaidą; neskelbti pelningo laimėtojo be pakankamų faktų.

PhoneBridger dabartinė app licencija yra vienkartinis pirkimas. Nepriskirti jai mėnesinės prenumeratos ar numanomų pakartotinių pajamų. Prieš didinant turinio gamybą apskaičiuoti, kiek lieka iš tikro pardavimo ir kokia didžiausia acquisition sąnaudų riba palieka pasirinktą teigiamą įnašą. USD pajamas ir EUR darbo sąnaudas lyginti tik aiškiai užfiksuotu kursu/laikotarpiu. Vienkartinis pradinis asset kaštas ir pasikartojantis savaitinis darbas rodomi atskirai; pilotui tenkantis bendras kaštas neišnyksta dėl to, kad agentas naudojamas kitose nišose.

Reach/plays/watch/comments/share yra diagnostika. Followers ir laikai nėra buyers, įrašų impressions nesumuojami kaip uniqueaudience. Kiekviena metrika turi platformos apibrėžimą, laikotarpį, retrievedAt ir scope. Panaikinta/privati/unavailable metrika yra UNKNOWN, ne0. Organic ir paid rezultatai nesuplakami; paid biudžetas kol kas0.

| Pamatyta | Agentas daro |
| --- | --- |
| Didelis reach, mažai tinkamų užklausų | Tikrina auditorijos/use-case fit ir vieną CTA; nekartoja vien dėl populiarumo |
| Mažas reach, keli tikri pelningi klientai | Išsaugo siaurą kampą; tikrina, kur dar teisėtai pasiekti panašių poreikių |
| Daug beta downloads, menka aktyvacija | Tiria įdiegimą/leidimus ir tikrą vertę, pateikia product feedback |
| Aktyvacija gera, mažai pirkimų | Tiria vertės/pasiūlymo/mokėjimo kliūtį; kainos nekeičia savarankiškai |
| Pardavimai su dideliu support/refund | Mažina sklaidą netinkamiems devices/use-cases; taiso faktus/produkto kelią |
| Keli laimintys content variantai | Kuria naują originalų tos temos variantą, testuoja vieną pakeitimą ir išlaiko kontrolę |

Kas savaitę agentas įvertina aukščiau esančius funnel ir kaštus, užfiksuoja vieną gerinimo hipotezę ir pakeičia vieną pagrindinį kintamąjį: auditoriją, use-case, hook, formatą arba CTA. Neskelbti „statistiškai laimėjo“ iš dviejų pirkimų.20% turinio slotų siūloma laikyti naujiems kampams,80% — jau pagrįstiems/naudingo turinio tęstinumui; tai planuotojo orientyras, ne bandit algoritmo veikimo deklaracija.

Attribution: first/lasttouch ir assisted keliai atskirai, campaign/creative/action ID be PII.14d. grupių ir28d. Page tyrimo langai yra eksperimento horizontai, ne teiginys, kad platforma leidžia tiek dienų follow-up. Sale su nežinomu source neįtraukiamas į tikslų FB CAC; gali būti rodomas atskiroje unattributed skiltyje. Savideklaruotas „radau FB“ nėra įrodytas konkretus post.

Priskirtas pardavimas nėra įrodytas papildomas pardavimas dėl mūsų veiksmo. Kai yra pakankama imtis ir tinkamas palyginimas, vertinti baseline/kontrolinį laikotarpį arba turinio variantą, užfiksuoti kitų kanalų ir produkto pakeitimus. Organinės auditorijos negalima laikyti atsitiktinai paskirstyta vien dėl dviejų skirtingų postų. Mažame pilote išvadas vadinti preliminariomis, o priežastinį pelno prieaugį — UNVERIFIED, jeigu jo negalime pagrįsti.

Pelno peržiūrą papildyti kaštų jautrumu: ar išvada išlieka, jeigu support laikas ir grąžinimai didesni? Pelną plėsti tik pakartotai stebint tinkamą outcome; nėra algoritminio automatinio visų nišų įjungimo.

## PhoneBridger pirmų4savaičių turinio briefai

Tai16 pasiūlytų originalių įrašų, ne jau patvirtinti assets ar garantuotas kalendorius. Prieš kiekvieno review patikrinti actual funkciją/faktą. Short demonstracijų trukmė/crop parenkami pagal priimtą channel spec, ne hardcoded „optimalias sekundes“.

| Savaitė | Demonstracija1 | Demonstracija2 | Naudingas postas | Tikra diskusija |
| --- | --- | --- | --- | --- |
|1 | PC pelė pereina į vieną Android šalia monitoriaus ir grįžta | Konkretus atsakymas klaviatūra, be privačių duomenų | Ar reikia mirror, ar valdyti šalia stovintį telefoną? Alternatyvos ir ribos | Kuriam telefono veiksmui dažniausiai tenka nutraukti PC darbą? |
|2 | Tikras pairing ir approve su neprivačiu demo identifikatoriumi | Telefonas pasirinktoje padėtyje; tik testuota geometry | Pirmo setup ir Android leidimo pagalba | Kaip jau laikote telefoną prie darbo vietos? |
|3 | Wi-Fi/USB kelio iliustracija tik pagal actual release ir ribas | Dažnas realus tos savaitės beta klausimas → atsakymo demonstracija | PhoneBridger/scrcpy/DeskDock pasirinkimas pagal tikrą naudojimą | Kas trukdė išbandyti: įdiegimas, suderinamumas ar neaiški vertė? |
|4 | Aktualiai ištaisytas defektas, tik jei pataisa tikrai išleista | Actual patikrintas vieno ar kelių telefonų use-case | App-only ir holder: kada laikiklio nereikia | Kurią patikrintą darbo eigą parodyti kitą? |

Nėra realaus asset/fakto → pakeisti į įgyvendinamą naudingą formatą arba atidėti, ne išgalvoti release, klientą ar testą. Iš dažnų klausimų planuoti naudingus svetainės gidus per CONTENT_CORE; Page kopija turi savą konkretų formatą/CTA, ne vien automatinį article link.

## Papildomas GUI

- [ ] Page kalendorius su kiekvieno site realiu publishAt, turinio paskirtimi, preview ir actor.
- [ ] Iš eilutės atidaryti assets / originalą, current factual review, ready/blocked priežastis, eventual post permalink.
- [ ] Grupės matrica: Page/profile galimybė, narystė, rules, moderation būsena, leidžiamas formatas.
- [ ] Komentarų/inbound inbox su prioritetu, scoped reply ir backlog; ne visi social engagement kaip Case.
- [ ] Creative lentelė: reach/watch/meaningfulquestions/qualifiedvisits/activation/orders/refunds/actual contribution/time; source nežinomybės matomos.
- [ ] Weekly learning: kontrolė, viena hipotezė, pasiūlytas variantas ir rollback; paskyros/provider health atskirai.

## Įgyvendinimo ribos ir papildomi priėmimo vartai

Viskas žemiau NOT RUN. Papildomi FB-23–FB-34 įtraukiami į bendrą roadmapą.

- [ ] Page-first pilnas vertikalus kelias:16 originalių briefų → bent vienas priimtas post formatas → publication receipt → actual komentaro inbound → scoped reply → measured conversion.
- [ ] Originalus Page content job neprivalo turėti fiktyvaus buyer signalo.
- [ ] OwnPage/groups-asPage/personal kiekvienas turi savo action scope; wrong actor ir Page-denied group užblokuoti.
- [ ] Scheduled/pendingmod/visible/deleted būsenos turi evidence ir nesukuria dublikatų.
- [ ] Faktų/medijos/kainos pakeitimas sustabdo stale scheduled post iki re-review.
- [ ] Kritinis legit komentaras išlieka; moderation nepriskiriama reply teisei; duplicate/bait/fake social proof atmesti.
- [ ] Viral inbound cap ir fairness nesustabdytas aktyvus support, neviršyti provider/budget; backlog matomas.
- [ ] Page įrašų kohorta įvertinta atskirai nuo grupių kontaktų; pirkėjo ir partnerio keliai atskiri.
- [ ] Original/social assets neapsimeta website release; Meta formatas priimtas actual, o ne WebP prielaida.
- [ ] Unknown/partial insights, source attribution, currency ir contributor costs neleidžia fake profit score.

Kuriame galimybę autonomiškai organizuoti šiuos darbus sutartose ribose, o ne nuolatinį per-post approval ritualą. Source teisių / credentials / mokėjimo faktai tikrinami prieš atitinkamą live kanalą. Šis dokumentas tų prieigų nesukuria.
