# Promedical įrankių atranka

2026-10-09; promedical.lt / promedical; core f743b1cbcb09418d733fbe3c72b6968d65a72259; companion e578426610f067fd7a4db3574f754b8d06ef5426; vietinis pilno katalogo paruošimas. Mokamas kliento rezultatas – konkrečios komplektacijos Klaro įranga įstaigai. TOOLS nėra operational aktyvavimas.

| Sritis | Dabartinis darbas | Vėliau / kodėl |
| --- | --- | --- |
| Paklausa ir pirkėjai | Nemokama web paieška ir tikro įstaigos poreikio užklausa | Volume ir pirmos šalies GSC tik su faktine scoped prieiga |
| Tiekėjas ir produktai | Gamintojo katalogas, kodai, instrukcijos, root crawler | Faktinės kainos ir likučiai tik pagal gamintojo/atstovo patvirtintą kelią |
| Pokalbis ir paštas | Bendras kontaktų/formos core, sales@promedical.lt | Inbox patikra, SMTP, autoresponder root; acquisition siuntimas išjungtas |
| Pasiūlymas ir vykdymas | Konkreti užklausa ir komplektacijos patikra | Mokėjimai, atsargos ir CRM tik esant įrodytai ekonomikai |
| Matavimas ir medija | Bendras site-scoped events ir MEDIA_CORE | Actual deployment, field CWV, GSC/GA4 atskiro priėmimo reikia |

## tinyfish.web.search

- Darbas: rasti LT katalogo ketinimo ir užsienio analogų šaltinius; pradinis komercinės atrankos pagrindas.
- Provider TinyFish, discovery catalog_search → catalog_get 2026-10-09; [oficiali API](https://docs.tinyfish.ai/api-reference/search-the-web).
- Inputs: query, domain_type=web; pasirinktiniai location/language; output titles, URLs, snippets, results/page. Produktų parametrams nepakanka snippet.
- LT/lt paprašytas; atsakyme effective locale nepateiktas. Geografinio ir kalbos filtravimo kokybė nežinoma. EN užklausa tik tarptautiniams analogams.
- Kaina 0 USD/call pagal actual katalogą; 30/min ir 500/hour; šio darbo actual 2 calls, bendras 0 USD. Discovery/get nespends.
- HTTP reliability katalogo rodiklis nėra mūsų semantinio tikslumo matas. LT rezultatai parodė medicininių vežimėlių kategorijas; originalus LT puslapis patikrintas papildomai.
- Minimalūs duomenys: vieši prekių/įstaigų URL; nėra žmonių kontaktų sąrašo. Raw atsakymai privataus data/ kataloge, ne public pakete.
- Alternatyva: tiesiogiai skaityti gamintojo ir žinomų tiekėjų pirminius puslapius; tai naudota šaltinių patikrai.
- Stop: nereikalingas dubliavimas, klaidinga geografinė aprėptis, neaktualūs URL; nėra automatinio paid fallback.
- Owner root / turinio agentas; status scoped-test, actual call IDs 4a4f041b80c6416da6cf0b2c489d0bf8 ir 22af178e310c453381ee4fbef6c48453. Priėmimas – padėjo patvirtinti katalogo ir užklausos kelią, nėra volume ar revenue įrodymas.

## google-ads.google.keywords.volume (deferred)

- Darbas vėliau: atskirti mažą paieškos apimtį nuo nežinomo volume ir vertinti sinonimų grupes. Katalogo discovery/get atliktas 2026-10-09, [Google API](https://developers.google.com/google-ads/api/reference/rpc/latest/KeywordPlanIdeaService).
- Inputs: connected customer_id, keywords, geoTargetConstants, language, historicalMetricsOptions; output avgMonthlySearches/competition/bid/mėnesiniai rodikliai. Close variants gali būti sujungti.
- Kaina kataloge 0 USD su prijungta account prieiga; daily quota nuo developer access lygio; platform_eligible=false. Actual paskyra ir Lietuvos konstantos netikrintos, calls nevykdyti.
- Alternatyva dabar: realūs vieši katalogai, vartotojų klausimai ir užklausos; vėliau first-party GSC. Trūkstamas volume nėra 0.
- Minimizacija: tik nišos užklausos, jokių klientų tekstų. Trigger: actual account/owner access ir konkretus prioritetų sprendimas. Owner root; mažas bandymas – LT/lt patvirtinta pora, keli skirtingi pirkėjo klausimai, rezultatų grouping patikra. Stop nepalaikoma rinka arba neautorizuota prieiga.

## icypeas.companies.search (deferred)

- Darbas vėliau: organizacijų atranka; ne pirkimo ketinimo ir ne siuntimo leidimo įrodymas. catalog_search/get 2026-10-09, [API kainodara](https://api-doc.icypeas.com/how-works/credit-cost).
- Input query filter name/industry/location/domain, pagination.size 1–200 (default100); output leads su įmonės pavadinimu, svetaine ir kitais profiliniais faktais. Tapatybė tikrinama pagal oficialų domain.
- Kaina $0.00038/returned row, maksimalus 10-row eksperimentas $0.0038 pagal dabartinį katalogą; siūloma riba nesuteikia leidimo išleisti. Calls nevykdyti. Lietuvos ligoninių coverage netikrintas.
- Alternatyva be naujos prenumeratos: oficialūs įstaigų puslapiai ir datuoti vieši pirkimo signalai. Mažame teste atskirai vertinti organizacijos fit, realų intent, datą, contactability ir fulfilment.
- Minimalūs duomenys ir paskirtis: įstaigos/domain; asmeninių kontaktų automatiškai nerinkti. Saugojimą nusistatyti prieš eksperimentą. Siuntimas išjungtas.
- Trigger: konkreti savininko autorizuota acquisition užduotis ir scoped biudžetas. Owner root; stop jei neteisinga geografinė aprėptis, klaidinga tapatybė ar nėra tinkamo poreikio. Status deferred.

## Esami core helpers

content-studio/src/model.mjs, content-workflow.mjs ir releaseContent valdo juodraštį, revision-bound review, batch approval ir immutable release. MEDIA_CORE/saveResponsiveAsset valdo optimizuotų vaizdų šeimas. Canonical schema/content publication filtras turi likti tas pats. Katalogo faktų crawler ir produktų rendererį owns root/katalogo agentas; neteigiama, kad crawler tikslumas priimtas vien dėl HTTP skaičiaus.

Pašto, D1 formos, site events ir viešų produkto nuorodų actual priėmimą fiksuoja root. Šis turinio agentas jų neįjungė ir naujos paskyros ar subscription neprovisioned. Tools atranka atitinka BUSINESS, nepakeičia savininko atstovavimo į kontaktų pardavimo modelį.
