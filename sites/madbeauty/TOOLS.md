# Madbeauty įrankių pasirinkimas

SiteId `madbeauty`; domain `madbeauty.lt`; 2026-10-10; BUSINESS snapshot 2026-10-06 su savininko 2026-10-10 visų grožio paslaugų apimties patikslinimu; source main SHA `d4ea8bf7384b70c4ea62a344001e3f8158812c56`; fazė: acquisition core planas, ne live kampanija. [Pilotas](ACQUISITION_PILOT_PLAN.md), [core roadmap](../../agent-business-core/acquisition-plan/ROADMAP.md).

Mokamas rezultatas: vartotojas moka teikėjui už realią procedūrą. Dabartinio nemokamo Madbeauty piloto pajamos 0 €; šio etapo tikslas tikri aktyvūs teikėjų profiliai. Hosted onboarding, reali pasiūla ir ekonomika dar turi būti priimti.

| Sritis | Darbas / nauda | Dabar / vėliau | Priežastis |
|---|---|---|---|
| Demand / buyers | Vartotojų konkrečių vizitų poreikis | Vėliau | Pirma reikia tikros pasiūlos |
| Suppliers / facts / price | Atrasti ir patikrinti grožio teikėjus | Dabar planas; scoped test po vartų | Piloto provider_signup tikslas |
| Conversation / email / contact | Kvietimas ir tikras atsakymas | Adapterio priėmimas prieš live | Core turi draft, neturi accepted sender |
| Offer / fulfilment | Registracija, profilis, kreipimosi kelias | Būtina prieš siuntimą | HTTP200 homepage nėra pilnas onboarding |
| Measurement / media | Attribution ir aktyvavimo funnel | Dabar projektuoti | Neprilyginti laiškų skaičiaus pajamoms |

## Candidate: serper.web.search per Treg

- Purpose / phase / result: M3 atradimas pagal visas aktualaus Madbeauty katalogo grožio paslaugas ir bangos vietovę; kandidatų sąrašas, ne pirkimo ketinimas.
- Provider / source: Treg catalog_get 2026-10-10; [Serper dokumentacija](https://serper.dev/playground), [kainos](https://serper.dev/#pricing).
- Inputs → outputs / matching: q, gl=lt, hl=lt, ribotas num/page → organic URL; originali svetainė patvirtina paslaugą, vietą ir entity. Snippet vienas netinka kvalifikavimui.
- Coverage: LT kalbos/vietos parametrai žinomi; mūsų Vilniaus ir atskirų grožio kategorijų kokybė nematuota.
- Cost / quota / authorization: kataloge USD0.001 už HTTP200 net ir be organic; siūlomas 10 užklausų data test USD0.01. Modelis/fetch/operatoriaus darbas neįskaičiuoti. Tiekėjo 50qps nėra mūsų nustatytas limitas; paskyros kvota tikrinama. User pavedė planą, paid execution čia neautorizuotas.
- Reliability: vendor rezultatų formatas žinomas; mūsų quality nėra verified.
- Data: raw cache kataloge forbidden; adapteris nesaugo raw, atskirai priima minimalų receipt ir originalių šaltinių leidžiamus faktus. PII tik kvalifikuotam contact tikslui pagal retention politiką.
- Alternative: savininko pateikti oficialūs URL / rankinis leidžiamas importas, esamas PublicResearch patikrai.
- Fallback / stop: tuščias ar netinkamas rezultatas → nėra lead; nėra automatinio mokamo fallback virš cap.
- Expansion / owner: core maintainer ir Madbeauty operatorius; po 20 kandidatų audito, ne vien sėkmingo API statuso.
- Experiment: iki10 queries/20 unique candidates, ≥80% tikra kategorija+miestas,100% priimtų su originaliu šaltiniu.
- Status: candidate. Tik read-only katalogas; jokių realių mokamų paieškų.

## Candidate: openmart.businesses.search per Treg

- Purpose / phase / result: papildomas local discovery tik jei Serper aprėptis netinkama.
- Source/date: Treg katalogas 2026-10-10; [API](https://app.openmart.com/api-docs), [pricing](https://www.openmart.com/pricing).
- Inputs/output/match: query + limit → local businesses; match_score=0 atmesti, originali veikla/vieta tikrinama.
- Coverage: LT realiai neišbandyta; vendor katalogas nėra mūsų coverage įrodymas.
- Cost/limits/auth: USD0.00894/call kataloge; 5 calls USD0.0447 data only; reported20rps nėra pilot cap. Atskirai tikrinti account allowance; paid calls šiame plane neatliekami.
- Reliability/data: dokumentuotas unrelated fallback pavojus; saugojimo/licencijos taisyklės patvirtinamos prieš adapterio raw retention. Tik minimalūs faktai su kilme.
- Alternative/fallback: Serper + originalūs URL; zero-match nėra tinkamas teikėjas, quota/error → stop.
- Expansion/owner/test: operatorius priima tik po mažo palyginimo su rankomis sužymėta ta pačia auditorija; matuoti unique useful candidates ir actual spend.
- Status: deferred, tik katalogas.

## Candidate: tomba.companies.emails.list per Treg

- Purpose/phase/result: kvalifikuoto juridinio salono domeno viešam generic kontaktui papildyti, ne masiniam email sąrašui.
- Source/date: Treg katalogas 2026-10-10; [API](https://docs.tomba.io/api), [pricing](https://tomba.io/pricing).
- Input/output/match: normalized domain, type=generic,limit=10 → adresai ir provenance; tikrinti originalią svetainę. Confidence nėra sutikimas ar pristatymo garantija.
- Coverage: LT domenų rezultatai neišbandyti. Fizinių meistrų nereikia automatiškai enrichinti asmeniniais adresais.
- Cost/limits/auth: USD0.0089 netuščią iki10 slots puslapį; didesnės apimties mokestis pagal prašomų slots grupes, ne vien rastų adresų skaičių; tuščias pagal katalogą free. 5 tokie puslapiai USD0.0445. Account plan limit nežinomas, tikrinti prieš use; paid test neatliktas.
- Reliability/data: tik vendor schema, mūsų accuracy neverified; minimalus adresas/source/check time, licencija/retention patvirtinama prieš saugojimą.
- Alternative/fallback: oficialus kontaktų puslapis be naujos prenumeratos; nepatvirtintas adresas → no send.
- Expansion/owner/test: tik jei originalūs kontaktai nepakankami, operatorius tikrina mažą atrinktų domenų imtį; 100% priimtų kontaktų turi identity ir channel policy įrodymą.
- Status: deferred, ne numatytasis privalomas įrankis.

## Candidate: shared acquisition runtime + accepted mail transport

- Purpose/phase/result: M4–M9 grafikas, review, outbox, atsakymai, Case ir signup funnel.
- Source/date: [architektūra](../../agent-business-core/acquisition-plan/ARCHITECTURE.md), esamas [draft modulis](../../agent-business-core/OUTBOUND_ACQUISITION.md), 2026-10-10.
- Input/output/match: scoped campaign/prospect → approved attempt/receipt → tikras reply/Case; naujas provider objective būtinas.
- Coverage: LT turinys ir Europe/Vilnius konfigūracija; hosted runtime/model/mail adapterio aprėptis priimama atskirai.
- Costs/limits/auth: duomenų+modelio+transporto+serverio/operatoriaus sąnaudos; kol nėra konkretaus cap ir leidžiamo transporto live disabled. Jokių naujų prenumeratų šiame plane.
- Reliability/data: local draft ir synthetic tests patikrinti ankstesniame PR; produkcinis grafikas, mail ir attribution neverified. Secrets ne Git, minimalūs scoped kontaktai, audit ir suppression.
- Alternative/fallback: research/draft ir manual review; [Hostinger policy](https://www.hostinger.com/support/1583510-is-mass-mailing-supported-at-hostinger/) neleidžia default unsolicited transport. Opt-in kanalas, jei nėra tinkamo cold transporto.
- Expansion/owner/test: core maintainer infrastruktūra, operatorius offer/recipients, Madbeauty backend maintainer onboarding. Synthetic full flow, owner inbox, duplicate/timeout/refusal/tenant ir hosted profile acceptance prieš P2.
- Status: local preparation exists; production integration planned/blocked by unfulfilled gates.

## Review

Įrankiai aptarnauja teikėjų prisijungimą, ne fiktyvią mokamą platformos apyvartą. Treg padeda atrasti; jis nepakeičia leidimo kontaktuoti, tikro pasiūlymo, originalaus šaltinio ar transporto. Iliustracinės 20 Serper +5 Openmart +5 Tomba užklausos būtų USD0.1092 pagal katalogo vienetus, be modelių/transporto ir tik netuščio Tomba scenarijaus; tai aritmetinis pavyzdys, ne įjungtas biudžetas. Expansion sprendimai remiasi actual quality/spend/aktyvacija; praktiniai shared core pataisymai registruojami upgrade journal, planas nepateikiamas kaip įgyvendinta integracija.
