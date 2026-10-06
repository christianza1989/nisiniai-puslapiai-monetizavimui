# Facebook agentas: bendras core ir PhoneBridger pilotas

2026-10-07 · v2 · Būsena: PLANAS, gyvi FB adapteriai dar nepriimti. V1 perdavimo įrodymai išsaugoti; v2 papildo originalų Page turinį, Page dalyvavimą grupėse ir pelno peržiūrą.

Savininko pavedimas: parengti pilną įgyvendinimo planą, tada išbandyti PhoneBridger versle. Šis dokumentas yra aktualus FB darbų roadmapas. [Ankstesnis planas](FB_ACQUISITION_PLAN.md) saugo architektūros ir autorizacijos kontekstą; [modulio sutartis](agent-business-core/FACEBOOK_MODULE.md) aprašo esamą kodą. Naujai neužsakomi 30 nepriklausomų botų ar antras CRM.

Produkto tyrimas ir tikrinimo ribos: [RESEARCH](research/facebook-agent-phonebridger-2026-10-07/RESEARCH.md). Pirmo verslo auditorijos, pasiūlymai ir ekonomika: [PHONEBRIDGER-PILOT](research/facebook-agent-phonebridger-2026-10-07/PHONEBRIDGER-PILOT.md).

Page kalendorius, turinio/distribucijos/komentarų ir ekonomikos sutartis: [PROFIT_ENGINE](research/facebook-agent-phonebridger-2026-10-07/PROFIT_ENGINE.md). Skaityti jį kuriant aktyvų Page ar platesnį FB augimo kanalą;16 PhoneBridger originalių briefų yra ten. Tai detalus priedas, ne antras CRM/roadmapas.

## Rezultatas, kurį statome

Agentas augina konkretaus verslo Page originaliu naudingu turiniu, palaiko jo diskusijas ir dalyvauja tinkamose grupėse kaip Page, kai tai leidžiama. Jis taip pat randa leistinus konkretaus poreikio signalus ir nukreipia į tinkamą veiksmą. Tikslas — pakartojamai pelningas kliento kelias: tinkamas susidomėjimas → išbandymas/užklausa → pirkimas → actual naudojimas ir aptarnavimas. Reach/likes/comments rodo sklaidą, tačiau neįrodo pelno. Vertiname pardavimo įnašą po acquisition, media, AI, support, fulfilment ir grąžinimų sąnaudų.

Vienas paskyros koordinatorius aptarnauja visą tinklą. Nišų specialistai yra pagal poreikį paleidžiamos užduotys su savo faktais, ne atskiros prisijungusios FB paskyros. Asmeninio profilio naršyklę valdo vienas vykdytojas. Page API pokalbiai turi atskirą eiliškumą ir tiekėjo ribas. Niša turi savo įjungimą, kanalus, pasiūlymą, biudžetą ir matavimą.

## Ką faktiškai turime

Pažymėta tik perskaityta implementacija ir datuoti ankstesni įrodymai. Šiame pavedime runtime testai pakartotinai nevykdyti.

- [x] Esamas `facebook/` modulis su per-site policy, grupių metaduomenimis, signalais, patvaria ruošimo eile ir GUI.
- [x] `0009_facebook`: RLS ir paskyros lease / epoch koordinavimo pagrindas; ankstesnė izoliuota QA — 2026-10-01.
- [x] Ribotas Codex CLI juodraščio generavimas, kontaktų / žinių / instrukcijų aktualumo patikros.
- [x] Esamos `Business`, `Case`, `CaseSource` sąsajos; nereikia atskiro FB klientų registro.
- [x] Faktinis siuntimo endpointas grąžina kontroliuojamą 503, kol transportas neprijungtas.
- [x] PhoneBridger 2026-10-07 HTTP tyrimas: gyvas katalogas, `siteId=phonebridger` integracijos dokumentuose, `hello@phonebridger.com`, pardavėjas MB Memocasting. Tai patvirtinta šio verslo išimtis iš MB Pinet / info@pinet.lt default.
- [ ] Aktualiame veikiančiame agentų core patikrinta PhoneBridger `Business` registracija, žinių projekcija ir kanalo įjungimas.
- [ ] Nuolatinis FB šaltinių rinkimas, gyvas paskyros vykdytojas, Page webhook / transportas, išorinio veiksmo kvitai.
- [ ] Kliento aktyvacija / pirkimas / išlaidos susieti su tikru FB bandymu.

Esamas 20/d. draft limitas yra mūsų darbo kvota, ne Meta leidimas ar siuntimo norma. Istorinis testų PASS neperkeliamas į naujo transporto priėmimą.

## Kanalai ir realios priklausomybės

| Kanalas | Paskirtis | Dabartinė būsena | Įgyvendinimo vartas |
| --- | --- | --- | --- |
| Asmeninis profilis / grupės | Aktualūs klausimai, naudingi komentarai, tinkamų grupių atranka | Savininkas anksčiau autorizavo įprastus veiksmus; gyvas adapteris neįgyvendintas | Atskirai patvirtinta konkretaus automatizavimo / duomenų naudojimo teisė, grupės taisyklės, esama prisijungusi sesija |
| Verslo Page / kitų grupės | Atpažįstama verslo tapatybė, naudingi komentarai ir leidžiami originalūs įrašai | Page participation UI galima grupėse, kurios priima Pages; mūsų adapteris nepriimtas | Konkretaus Page/grupės narystė, action/format/rules, exact actor ir actual transporto teisės; Pages API nėra universalus grupių publishing API |
| Asmeninis Messenger | Pokalbis konkretaus žmogaus paprašytu klausimu | Nėra Page API pakaitalas | Konkretaus pokalbio teisė ir tinkamas leidžiamas transportas; nėra masinių DM |
| Verslo Page įrašai / komentarai | Originalios demonstracijos, atsakymai į savo Page aktyvumą | Tikslinis adapteris | Tikra valdoma Page, aktualios programos teisės ir provider dokumentai |
| Page Messenger | Atsakymai į tinkamą inbound, kvalifikavimas, tęstinumas | Tikslinis adapteris | App / token / webhook patikra, konkretaus gavėjo scope ir aktualus siuntimo langas |
| Svetainės forma / beta / parduotuvė | Poreikio ir mokamo rezultato patvirtinimas | PhoneBridger turi savo gyvą svetainę; FB atribucija nepriimta | Susieta įvykių sutartis, privatumas, tikras serverinis kvitas |

Meta savo pirminiame [paaiškinime apie scraping](https://about.fb.com/news/2021/04/how-we-combat-scraping/) atskiria paprastą prieigą nuo automatizuoto rinkimo be jos leidimo. Savininko mandatą turime, tačiau jis neišsprendžia platformos teisių. Dabartinėmis priemonėmis nuolatinio asmeninio collector leidimas lieka UNVERIFIED. Todėl architektūra turi sąlyginį personal adapterį ir nepriklausomą oficialų Page kelią. Naršyklės MCP savaime šių teisių nesuteikia.

Jei personal kelio vartas neišspręstas, jo collector / join / comment / DM lieka OFF. Galima statyti ir testuoti juodraščius iš leistinų įvesčių bei atskirai priimti Page kelią. Tai nėra teiginys, kad grupių automatika jau veikia. Netinkamas kanalas nestabdo kitų įgyvendinamų vietinių darbų. Nesprendžiame to anti-detect naršyklėmis, slapukų eksportu ar limitų apeidinėjimu.

## Agentų funkcijos viename runner

| Funkcija | Įvestis ir išvestis | Ko jai neduodame |
| --- | --- | --- |
| Koordinatorius | Aktualus mandatas / policy, paskyros eilė, pauzės, limitai, adapterio kvitai | Teisės keisti produktą ar savarankiškai kelti biudžetą |
| Bendruomenių tyrėjas | Leistini šaltiniai → grupių kandidatai, taisyklės, aktualumas | Asmenų sąrašų ir viso inbox eksporto |
| Page turinio planuotojas | Aktualus pasiūlymas, realūs klausimai / assets → slenkantis30d. originalių postų kalendorius ir creative hipotezė | Fiktyvių buyer signalų originaliam Page postui sukurti |
| Routeris | Minimalus signalas → siteId, buyer / supplier / referral / support / unknown | Spėjimo, kad profesija ar grupės narystė įrodo pirkimo ketinimą |
| Nišos specialistas | Patvirtinti faktai ir leistinas kontekstas → naudingas atsakymas, vienas CTA | Kitų nišų klientų, paskyros tokenų, nepatvirtintų pažadų |
| Patikra | Teiginiai, leidimai, pasikartojimai, tikslas → vykdyti / blokuoti / reikia fakto | Galimybės savo balu panaikinti trūkstamą teisę |
| Pokalbio funkcija | Tikras susietas inbound → atsakymas arba esamas Case / job | Šaltų DM serijų vien dėl rasto viešo įrašo |
| Bandymų analitikas | Tikri įvykiai ir sąnaudos → tęsti / keisti / stabdyti rekomendacija | Leidimo pakeisti kainą, grąžinti pinigus ar įjungti mokamą reklamą |

Deterministiniai vartai tikrina kanalą, siteId, versijas, blokavimą ir biudžetą. Modelis naudojamas prasmės / atsakymo darbui. To paties modelio antras atsakymas nėra nepriklausoma kalibracija.

## Per-nišos konfigūracija

Planuojama suderinama esamos policy plėtra, ne jau veikiantis JSON/API. Migration keitimai kuriami vėliau savo PR; istorinių migracijų nekeisti.

| Konfigūracijos grupė | Reikalavimas |
| --- | --- |
| Tapatybė | Vienas stabilus siteId ↔ esamas business_id ↔ dabartinis canonical host; jokio naujo verslo vien dėl domeno alias |
| Publikavimo tapatybė | Konkretus PageID/profile actor pagal target; Page ownership, grupės Page acceptance ir membership tikrinami atskirai |
| Faktai | Revision-bound approved žinios, atskiras turinio ir kontaktų hash, pasiūlymo versija, kalba, vykdymo būsena |
| Kanalai | Atskiri research / collect / join / comment / personal-DM / Page-publish / Page-reply leidimai; default OFF |
| Mandatas | Savininko autoriza, action scope, paskyra/Page, galiojimas ir atšaukimas; ne kiekvieno įprasto atsakymo approval |
| Šaltinio teisės | Konkretaus kanalo / grupės patikrintos sąlygos, evidence ir reviewedAt; unknown nepaversti allowed |
| Darbo ribos | Globali paskyros kvota + mažesnė site kvota; modelio kvota, laiko langai, signalų galiojimas, aktyvių pokalbių riba |
| Pinigai | Naujų subscription / ads spend=0; aiškus esamo CLI naudojimo limitas; mokėjimas ar biudžeto padidinimas turi savo autoriza |
| Bandymas | experimentId, auditorija, offerId, CTA URL, pradžia / pabaiga, tęsti / stop kriterijai |
| Originalus turinys | Post purpose, format, assets/rights/review, publishAt/timezone, providerPostId/permalink; atskira paskirtis nuo signal reply |
| Saugoma būsena | Pause, suppression, retention, audit ir prieigos politika; nelaikyti tokenų studijos/public pakete |

Įjungimas turi reikšti priimtą kanalą, ne vien `enabled=true`. Viena nuoroda tarp asmeninio FB ID ir Page PSID nesukuria siuntimo teisės. Naujos nišos išlieka defaultoff; šis FB modulis nekeičia jų F1 apimties.

## Vieno darbo kelias ir veiksmo saugumas

1. Priimti leistiną šaltinį su URL / laiku / source scope; nežinomas paskelbimo laikas lieka nežinomas.
2. Deduplicate, atmesti pasibaigusį / jau atsakytą / ne mūsų nišos / nekontaktuotiną signalą.
3. Maršrutizuoti į vieną pagrįstą nišą. Ambiguous signalas negeneruoja kelių tinklo reklamų.
4. Užkrauti aktualų approved faktų snapshot, kontaktą, produkto būseną ir vieną pasiūlymą.
5. Parengti atsakymą. Pradėti nuo atsakymo į klausimą, atskleisti ryšį su produktu, CTA tik kai naudingas ir leidžiamas.
6. Patikrinti tikslų recipient/thread, naujausią kontekstą, teises, refusal, policy, žinių versijas ir account lease.
7. Išsiųsti tik priimtu adapteriu. Vienas externalActionId / idempotency key; nėra aklo retry po timeout.
8. Suderinti provider/UI kvitą. `prepared` nėra `sent`; `sent` nėra `delivered`; atsakymas nėra pardavimas.
9. Tik projekto adresuotą tikrą inbound perkelti į esamą CaseSource. Viešas svetimas klausimas lieka signalas.
10. Susieti rezultatą ir sąnaudas; atšauktas mandatas / pasikeitęs pasiūlymas blokuoja senus darbus.

Esama ruošimo būsena išlaikoma: queued → drafting → prepared, arba blocked / cancelled / uncertain. Būsimas dispatch turi atskirą būsenų registrą: ready → dispatching → sent / failed / uncertain; reconciliation užbaigia tik pagal tikrą kvitą. Nepervadinti dabartinių draftų į išsiųstus veiksmus.

Paskyros lease turi būsimą acquire/renew/release vykdymą ir fencing. Po lease praradimo senas worker nebesiunčia. Skirtingi kompiuteriai naudoja vieną autoritetingą koordinavimo saugyklą; vietinis WORKSTREAMS nėra runtime lock. UI naršyklėje savininko rankinis darbas turi suspenduoti worker, o ne varžytis su juo.

## Duomenys, izoliuotas kontekstas ir tęstinumas

- Naudoti esamą FB registry ir CaseSource deduplikavimą. Kanalų record ID yra scoped ir environment-aware; Page webhook pakartojimas nesukuria antro Case.
- Saugoti minimalų signalo faktą, originalo nuorodą, laiką, teisės pagrindą ir sprendimą. Nesiurbti visų grupių archyvų, dalyvių ar asmeninių pokalbių.
- To paties žmogaus atsisakymas stabdo tinklo veiksmus per tą pačią paskyrą, tačiau kitų nišų agentams neatveria jo pokalbio. Atskirti suppression nuo marketing consent.
- Public įrašas / UI tekstas / prisegtas failas yra nepatikima įvestis; negali keisti sistemos instrukcijų, biudžeto, tapatybės, tool scope ar paslapčių.
- Retention pasiūlymas: nepasirinkti signalai iki 7 d.; neįvykdyti draftai iki 30 d.; tik reikalingi bandymo auditai iki 90 d. Tai būsimos produkto ribos, ne patvirtinta teisinė išvada. Actual pokalbių / Case / order retention suderinti su esamu core ir konkretaus verslo paskirtimi prieš live.
- Pašalinimas aprėpia FB records, draftų kopijas, modelio trace ir eksporto failus; dabartinis Case retention savaime jų nevalo. Privalo būti deletion testas ir minimalus teisėtai būtinas suppression įrašas.
- Žmogui paprašius email tęsinio, naudoti to site esamą MAIL_CORE ir tik prašytą klausimą. FB agentas neįjungia voice ir neperima PhoneBridger commerce / fulfilment.

## GUI, kur matysis visas procesas

Esamą `/operator/facebook-ui` plėsti, ne kurti antrą dashboard.

| Vaizdas | Ką operatorius mato |
| --- | --- |
| Bendra būsena | Paskyra/Page, visi site toggles, dabartinis mode, global pause, lease savininkas ir paskutinė sėkminga patikra |
| Kanalai / grupės | Tikra URL, tema/kalba, patikrintos taisyklės, narystė, kiekvieno veiksmo teisė, apribojimo priežastis |
| Page kalendorius | Originalo briefas ir preview, planned/scheduled/published, exact actor, datos, moderation/blocked priežastis ir tikras permalink |
| Signalai | Kodėl buyer / support / referral, šaltinio laikas, expiry, niche fit ir excluded reason |
| Veiksmų eilė | Originalo nuoroda, draftas, fact/policy versijos, siūlomas CTA, kvota, receipt / uncertain ir reconciliation |
| Pokalbiai | Tik leistinas scoped thread, next action, tikro inbound Case nuoroda, refusal/pause |
| Bandymas | Funnel su denominatoriais, D7 naudojimas, tikri pirkimai/refund, laiko bei pinigų sąnaudos |
| Turinio rezultatai | Creative/format/tema, actual platform metrics su laiku/apibrėžimu, kvalifikuotas srautas, pardavimai, support ir įnašas; unknown atskirai |
| Patikros | Priėmimo scenarijai, paskutinis įrodymas, aktualūs blockers ir kalibravimo versija |

Pauzė yra tikras serverio vartas, ne vien pilkas mygtukas. Site perjungimas išvalo seną kontekstą; live ir test duomenys vizualiai ir technologiškai atskirti. Paskyros kredencialų nėra URL/localStorage/modelio prompte. Pakanka vieno darbuotojo tab; per-nišos analitika nereikalauja 30 FB tabų.

## Kalibravimas ir autonominis gerinimas

Pradinis rinkinys: 80 sintetinės arba teisėtai naudojamos, minimizuotos ir pažymėtos situacijos. 60 naudojamos kūrimui, 20 laikomos nuo mokymo atskirtai patikrai. Padengti lietuvių/anglų klausimus, kelias nišas, aktualų pirkėją, tiekėją, irrelevant, pasibaigusį signalą, refusal, nukopijuotą ankstesnį atsakymą, iOS/screen-extension nesuderinamumą ir prompt injection.

Priėmimas: deterministiniai critical vartai 100% scenarijų; nė vieno cross-site nutekėjimo ar neteisėto veiksmo; held-out buyer precision ≥90%, bet false-negative rodiklį ir unknown coverage rodyti atskirai. Kopijos vertinimas: teisingumas, naudingumas, aktualumas, afiliacijos atskleidimas, vienas proporcingas CTA. Nevertinti vien modelio paties sau suteiktu balu.

Agentas gali siūlyti / lokaliai gerinti atrankos taisykles, retrieval ar tekstus pagal CORE_IMPROVEMENT ir scoped PR. Pakeitimas gauna baseline, held-out palyginimą, versiją ir rollback. Jis pats nesuteikia platformos teisių, nekeičia kainų, prisiimamo vykdymo, duomenų paskirties ar spend. Plėtra remiasi tikrais rezultatais; sintetiniai fixture neišmokomi kaip klientų paklausa.

## Įgyvendinimo roadmapas su priėmimo vartais

Checkbox uždaryti tik su datuotu įrodymu ir commit. M0 paruoštas; M1–M8 yra būsimi darbai, ne veikiančios API. Pirma M1+M2 sutartis ir vietinis pilnas kelias, tada vienas M3 transportas. M4 planuoklis ir M5 matavimas gali būti kuriami lygiagrečiai savo suderintose failų srityse. M6+M7 priėmimas taikomas konkrečiam naudojamam kanalui: nereikia laukti neįgyvendinamo personal collector, kad priimtume Page šaką. Nepaleidžiama šaka lieka OFF ir neuždaryta. M8 — po realaus bandymo išvadų.

### M0 — faktinė bazė ir planas

- [x] Perskaityti esamą FB modulį, acquisition instrukcijas ir ankstesnį QA.
- [x] Patikrinti PhoneBridger gyvą home/shop/catalog/reviews ir source launch deklaraciją.
- [x] Sudaryti bendrą planą, konkretaus produkto pilotą ir kriterijus.
- [x] Aiškiai atskirti jau implementuota / dokumentuota / current read-only patikrinta / nepriimta.

### M1 — vienas verslo ir kanalo kontraktas

- [ ] Patikrinti tikrą PhoneBridger Business/siteId/contact/projection, ne sukurti dublikatą.
- [ ] Užfiksuoti produkto paskelbtą versiją, tikro telefono suderinamumo įrodymus, žinomus ribojimus ir aktualų katalogo edition.
- [ ] Užregistruoti savininko esamą mandatą, paskyrą ir konkrečių kanalų teisių evidence; personal/Page atskirai.
- [ ] Parinkti 3–5 realiai apžiūrėtas tinkamas bendruomenes; užrašyti taisykles ir trijų sprendimų priežastis: naudoti / atidėti / atmesti.
- [ ] Parinkti realią valdomą PhoneBridger Page, parengti jos brand/contact/CTA/pinned-start/inbound kelią; nedaryti prielaidos, kad ji egzistuoja.
- [ ] Kiekvienai pasirinktai grupei patikrinti Page participation, membership, exact actor ir post/comment/link/format vartus; profilio nenaudoti Page draudimui apeiti.
- [ ] Užfiksuoti app-only pirmą pasiūlymą, beta CTA ir experiment limits; kaina tik iš serverio catalog.

Priėmimas: vienas faktų/teisių manifest, kiekvieno kanalo ON/OFF priežastis, nė vieno naujo live veiksmo vien dėl config. Trūkstant personal teisių, tęsti vietinį ir galimą Page kelią.

### M2 — vietinis end-to-end kelias ir GUI

- [ ] Nedidelė esamos policy migracija, atskiri action capabilities ir mandatas; defaultoff išlaikytas.
- [ ] Signalas → routeris → approved žinios → draftas → patikra → simulated receipt → aiškiai sintetinis inbound fixture CaseSource.
- [ ] Originalus content job → asset/claim review → scheduled post → simulated receipt → comment fixture → scoped reply; nereikia fiktyvaus buyer signal.
- [ ] Būsimo dispatch registras atskirai nuo dabartinio preparation status.
- [ ] D1/commerce adapterio ir agentų CaseSource dedup kontraktas; neprisiimti, kad PhoneBridger jau yra agentų runtime klientas.
- [ ] GUI bendra/persite pauzė, provenance, action reason ir funnel; 390 px ir desktop patikra.
- [ ] Page kalendorius/preview, grupių Page/profile matrica ir creative contribution ekranas tame pačiame GUI.
- [ ] Secret, prompt injection, cross-site, auth, data deletion ir backward-compatibility testai.

Priėmimas: tik izoliuoti test duomenys; operatoriui matomas pilnas kelias; nepasikeitę kitų nišų policy ir klientų duomenys.

### M3 — vienas patikimas transportas

- [ ] Pirmiausia priimti vieną prieinamą teisėtą kanalą. Oficialiam Page: token scope, webhook signature/challenge, recipient identity, event dedup ir current provider policy.
- [ ] Priimtam Page post formatui actual publish/schedule/media/completion receipt; originalo permalink ir komentarų inbound/reply, ne vien Messenger.
- [ ] Jei personal adapteris leidžiamas: vienas browser lease su fencing, exact page/thread recheck ir žmogaus darbo suspend; nekopijuoti slapukų.
- [ ] Idempotency + durable outbox + receipt; timeout → uncertain → check-only reconciliation.
- [ ] Retry tik patvirtintai neįvykdytam retryable darbui; provider limit / restriction → pause/backoff.
- [ ] Lease renewal, restart recovery, kelių kompiuterių konfliktas ir session expiry.
- [ ] Nedidelis autorizuotas realaus kanalo self-test su tikru kvitu ir savo duomenų cleanup; ne klientų kampanija.

Priėmimas: actual kanalo kvitas, one-write ir retry įrodymai; Page nėra personal kelio priėmimas. Užblokuotas kanalas neperjungiamas slapta į kitą.

### M4 — šaltiniai ir darbo planuoklis

- [ ] Collector tik leidžiamiems šaltiniams; source-specific cursor, timestamp, expiry ir rules refresh.
- [ ] Nėra bendro grupių scrape endpoint pagal seną tutorial; actual API/capability patikrinta.
- [ ] Bounded runner: tinkamų darbų tick, paskyros ir site fairness, server-side kvotos, laiko limitas ir cost ledger.
- [ ] Social content ir provider scheduled job turi vieną scheduling autoritetą; publishAt/asset/offer pasikeitimo, pendingmoderation ir restart scenarijai.
- [ ] Viral inbound triage ir backlog: atskira proactive ir inbound kvota, actual support nepasimeta turinio eilėje.
- [ ] Webhook greitai durable-ack, pokalbis apdorojamas atskirai; cron nenaudojamas kiekvienam chat reply.
- [ ] Local PC miego / išjungimo elgsena aprašyta; nepažadėti 24/7 be actual host. Cloud worker optional atskiras sprendimas.
- [ ] Retention ir suppression išbandyti visame FB pipeline.

Priėmimas: originalo duomenų teisės ir aktualumas, restart nepraleidžia ar nedubliuoja darbo, pause patikimai galioja visiems tick.

### M5 — PhoneBridger landing ir tikrų rezultatų matavimas

- [ ] Atribucijos kontraktas su PhoneBridger source savininku: campaign/action pseudonymous ID, realus UTM saugojimas, formos ir checkout serverinis susiejimas.
- [ ] Nešališkas device-fit kelias: Windows+Android, reali beta, leidimai, fizinio setup klausimas.
- [ ] Beta download atskirtas nuo install/pair/first-control; D7 naudojimas tik su aiškiu opt-in įrodymu arba vartotojo atsakymu.
- [ ] Patikrinti katalogo realią CTA bei demo fallback; reklamai naudojami tik realaus produkto įrodymai.
- [ ] Paid-live webhook/receipt/order outcome read-only feed su site isolation; test orders nepakliūva į funnel.
- [ ] Refund/dispute/fulfilment sąnaudos ir actual marža; supplier/inventory/payout unknown žymimi aiškiai.
- [ ] Creative/campaign/action atribucija, insights apibrėžimai/laikas, acquisition/media/AI/worktime kaštai; first/last/assisted/unattributed nepadvigubina sale.

Priėmimas: viena užklausa / aktyvacija / pardavimas skaičiuojami tik kartą, atribucija neapsimeta tikslia ten, kur duomenų nėra.

### M6 — kalibracija ir shadow

- [ ] 80 situacijų rinkinys, held-out dalis, expected gates ir actual rezultatai.
- [ ] Bounded shadow su leistinomis įvestimis, nesiunčiant komentarų / DM/postų. Pradinis iki7d. nėra tuščio laukimo reikalavimas: vartus/coverage pasiekus baigti anksčiau su įrodymais; dėl datos vartai neužsidaro.
- [ ] Peržiūrėti false positives / negatives, nereikalingus CTA, pasikartojimus, kalbą ir pending unknown.
- [ ] Patvirtinti saugius originalius reply variantus ir 3 realaus produkto vizualus; ImageGen tik iliustracijai, ne įrodytam veikimui.
- [ ]16 originalių Page briefų su auditorija/use-case/asset/fact/CTA; pradinei4/sav. kadencijai actual priimti formatai, ne fiktyvūs produkto įrodymai.

Priėmimas: critical tests PASS ir held-out atrankos kokybė; shadow neskelbiamas demand testu. Tai kalibravimo etapas, ne nuolatinis rankinio approval reikalavimas.

### M7 — pirmas kontroliuojamas live bandymas

- [ ] Tik PhoneBridger ir priimti kanalai; kitų nišų toggles OFF.
- [ ] Grupės:14d. poreikių testas / D21 paskutinio dalyvio D7. Page:28d. originalaus turinio testas / D35 paskutinio dalyvio D7. Kanalai vertinami atskirai, jokio naujo ads/subscription spend.
- [ ] Kiekvieno leidžiamo įprasto veiksmo receipt ir factual context; nereikalauti savininko patvirtinti kiekvieną komentarą.
- [ ] Daily savikontrolė, refusal/complaint/restriction pause, reikšmingų kliūčių pranešimas.
- [ ] D7/grupiųD21/PageD35 peržiūra; aktuali Page messaging teisė tikrinama kiekvienam tęstiniam atsakymui.
- [ ] Weekly learning: content/kanalo profit review, viena gerinimo hipotezė ir kontrolė; ne winner paskelbimas iš likes ar dviejų sale.
- [ ] Tęsti / keisti / stabdyti sprendimas pagal konkrečius veikiančio produkto ir mokėjimo įrodymus.

Priėmimas: atsiskaityta už kiekvieną signalą ir realų veiksmą; nėra launch/sales/10/10 deklaracijos iš sintetinių duomenų.

### M8 — pakartojimas ir kitų nišų įjungimas

- [ ] Pakartoti laimintį auditorijos / pasiūlymo derinį antrai kohortai; įvertinti support ir grąžinimus.
- [ ] Pridėti antrą nišą su savo BUSINESS/ACQUISITION, kanalų teisėmis ir faktų projekcija.
- [ ] Patikrinti paskyros fairness, bendrą suppression ir scoped CRM; ne daugiau tabų kaip pakaitalas izoliuotumui.
- [ ] Dokumentuoti core/skill pamokas pagal CORE_IMPROVEMENT; vienos nišos copy netampa bendru šablonu.
- [ ] Creator/referral ar nuosavos bendruomenės testas tik pagrindus actual poreikį/teises/sutartį; nedauginti tuščių grupių ir fake cross-Page engagement.

Priėmimas: įrodytas perkėlimas į kitą verslą, ne vien PhoneBridger hardcode; naujų nišų plėtra tik pagal jų paklausą.

## Priėmimo scenarijų checklist

Visi žemiau NOT RUN šiam naujam transportui. Kiekvienas turi testID, exact commit/config, expected/actual ir privatų kvitą arba sanitized test artifact.

- [ ] FB-01 Nauja niša neturi nė vieno enabled kanalo.
- [ ] FB-02 PhoneBridger identity/contact išimtis nesuteikia Memocasting rekvizitų kitoms nišoms.
- [ ] FB-03 Neaiški platformos/grupės teisė užblokuoja konkretų veiksmą.
- [ ] FB-04 Global/site pause tarp draft ir send neleidžia siųsti.
- [ ] FB-05 Du PC ir du site vienoje paskyroje negali vienu metu atlikti browser write.
- [ ] FB-06 Lease praradęs worker negali vykdyti vėluojančio action.
- [ ] FB-07 Timeout po galimo send nesukuria pakartotinio komentaro ar DM.
- [ ] FB-08 Session/captcha/checkpoint/restriction stabdo kanalą be apeidinėjimo.
- [ ] FB-09 Webhook replay / out-of-order sukuria vieną susietą inbound ir tvarkingą thread.
- [ ] FB-10 Page identifikatorius/pokalbio langas nesuteikia asmeninio Messenger teisės.
- [ ] FB-11 Viešas klausimas, click ir synthetic nepavirsta tikra gauta užklausa.
- [ ] FB-12 Refusal atšaukia pending darbus ir neleidžia rašyti iš kitos nišos.
- [ ] FB-13 Prompt injection nepakeičia instrukcijų, identity, facts ar spend.
- [ ] FB-14 Stale price / kontaktas / offer / knowledge edition prieš send blokuojami.
- [ ] FB-15 iOS, Windows lango perkėlimas ar nežinomas suderinamumas nėra žadama palaikoma funkcija.
- [ ] FB-16 UI site switch / auth failure išvalo svetimus duomenis, tokens neatsiranda prompte ar public.
- [ ] FB-17 Retention/deletion pašalina susietas FB kopijas, izoliuoja kitų site duomenis.
- [ ] FB-18 Paid-live outcome yra serverinis ir unique; test/refund atskirti, totals/currency nesugalvoti.
- [ ] FB-19 Tracking unavailable / no-consent kelias neprasimano aktyvacijos ar atribucijos.
- [ ] FB-20 Kasdienio limito / biudžeto pasiekimas sustabdo darbą, failed model attempts suskaičiuojami.
- [ ] FB-21 Payout/supplier/native licence nežinomybių agentas nepaverčia delivery pažadu.
- [ ] FB-22 Esami formos / pašto / kitų nišų / SEO kontraktai nepakeisti arba prasmingai regresiškai patikrinti.
- [ ] FB-23 Page-denied / nepatvirtinta grupė ir wrong actor užblokuoja Page-as-group write; profilio fallback neapeina draudimo.
- [ ] FB-24 Originalus Page postas kuriamas content job, ne fake buyer signal; post/reply/Messenger teisės atskiros.
- [ ] FB-25 Scheduled/submitted/pendingmoderation/visible status turi actual receipt; restart ir timeout nesukuria antro post.
- [ ] FB-26 Stale price/fact/asset/rights blokuoja scheduled post; publishAt pakeitimas nepalieka dviejų schedule autoritetų.
- [ ] FB-27 Kritinė tikra patirtis nepaslepiama dėl reputacijos; reply leidimas nesuteikia delete/hide.
- [ ] FB-28 Fake social proof, duplicate broadcast ir engagement bait atmesti; prasmingas klausimas neblokuojamas vien dėl comment CTA.
- [ ] FB-29 Viral spike išlaiko dedup/caps/site fairness/support ir matomą backlog be neriboto spend.
- [ ] FB-30 Unknown/deprecated insights lieka unknown, metrikų periodai ir unique reach nesuplakami.
- [ ] FB-31 Vienas sale per first/last/assisted nesuskaičiuojamas kelis kartus; unknown source nevadinamas tiksliu FB CAC.
- [ ] FB-32 Revenue/holder turnover nėra profit; currencies/tax/refund/support/media/AI/partner costs pateikiami nuosekliai, nežinomybės neužmaskuotos.
- [ ] FB-33 Social post/media nepublikuoja website Article release, actual accepted formatas patikrintas; WebP nėra Meta formato įrodymas.
- [ ] FB-34 Proactive vieno thread cap netrukdo tikram autorizuotam reply; tylos bump ir nepakviesti DM neatliekami.

## Nemokamo starto ir veikimo sprendimas

Pradėti esamu vietiniu Python/DB core, esamu operator GUI ir esamu Codex CLI. Nereikia n8n/Clay/Phantombuster subscription. Provider API / modelio prieiga, vietinio kompiuterio laikas ir hostingas nėra neribotai nemokami; ledger tai rodo. Mokamos reklamos ir naujos prenumeratos default 0. Page adapteriui vis tiek būtina actual platformos prieiga, ne pirkinių krepšelis naujam įrankiui.

Pirmas kodo inkrementas: M1 kontraktas + M2 vietinis signalas → draftas → patikra → fixture → GUI, po to vienas priimtas transportas. Neskubėti kurti visų adapterių prieš pirmą serverinį kelią. Šio plano užbaigimas neįjungia FB paskyros ir neturi pakeisti jau veikiančio PhoneBridger produkto.
