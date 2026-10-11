# Prekybos modulio roadmap
Aktualus [pavedimas](IMPLEMENTATION_STATUS.md). Nėra savaitinės turinio kvotos ar išgalvotų pristatymo datų. Etapo baigtis reiškia jo priėmimo įrodymą, ne visos platformos baigtį.

| Etapas | Apimtis ir rezultatas | Priėmimas / priklausomybės |
|---|---|---|
| M0. Planas | Verslo modelis, reusable modulio ribos, duomenys, API, ekranai, plėtra, tests, rollback | Šis roadmap, architektūra, acceptance, Memocasting BUSINESS/TOOLS/SEO-GEO |
| M1. Patvarus commerce pagrindas | store/įmonės kontekstas, 2 SKU/variantai, rinkų kainos, quote, stock, užsakymas, įvykių inbox/outbox, audit | restart, du store, concurrency, rollback, request retry/conflict, serverinė kaina |
| M2. Mokėjimų adapteris | Stripe Checkout, dinaminiai metodai, parašų tikrinimas, async mokėjimas, rezervacijos expiry/late pay | SDK ir Workers bandymas, klaidinga suma/valiuta/paskyra, event replay, crash recovery; sandbox tik su prieiga |
| M3. Vykdymo modulis | pakavimo būsena, carrier interface, siuntos reference/dubliavimas, label dokumentas, tracking ir išimtys | Fixture nėra live įrodymas; realus agregatorius aktyvuojamas gavus jo sutartį/testų prieigą |
| M4. Grąžinimai ir apskaitos pagrindas | atsisakymo įrašas, refund planas/įvykis, dvigubų finansinių įrašų prevencija, balansuoti įrašai ir suderinimas | pilna/dalinė suma, replay, dokumentų originalai/taisymas, unbalanced entry fail |
| M5. Bendras administravimas | tikro core identity/role sąsaja, užsakymai, likučiai, etiketės, returns, išimtys, dokumentai, apskaita | serverinė narystė; desktop/mobile, keyboard/200%/state tests; jokio naujo paralelinio auth |
| M6. B2B | companies, kainynai, MOQ/casepack, quote/proforma, sample, reorder, approved credit | kaina prieinama tik tinkamam partneriui; apmokėtas pilotas ir pakartotinis užsakymas |
| M7. Production admission | tikras D1/R2/Queue/mail/Stripe/vežėjas, observability, backup/restore, limitai | reali maža mokėjimo/siuntos/grąžinimo operacija ir inbox/banko įrodymai; mokami resursai autorizuojami pagal actual mandatą |
| S1. Memocasting svetainė | individualus dizainas, tikros nuotraukos, LT/PL/LV/EE produktai, pirkimo kelias ir visi trust/legal puslapiai | bendri builder/impeccable/media/kalbos/typography; render/HTTP/SEO/audit |
| S2. SEO/GEO turinys | pilnas bounded klausimų/URL map, individualūs briefai, media, current evidence, turinio studio importas, exact review ir publikavimas | pilna nišos aprėptis be kvotų; istorinių Shopify URL reconciliation; canonicals/hreflang/schema |
| A1. Aptarnavimo agentai | approved katalogas/užsakymo read ir riboti veiksmai, problemų eskalavimas | archetipų/protected kalibravimas, channels, teisių ir piniginių ribų bandymai |
| A2. Partnerių paieška | public research → verification → CRM → offers → actual authorized outreach → reorder | kontaktavimo teisės/šaltinių sąlygos/mandatas atskirai; susidomėjimas tik pagal tikrą atsakymą |
| A3. AI apskaita | dokumentų klasifikavimas, posting pagal patvirtintas taisykles, Stripe/banko/vežėjų sutikrinimas, ataskaitos | mokesčių taisyklių validacija, išimtys, laikotarpių uždarymas, realus pateikimo kvitas |
| M8. Antra parduotuvė | tik kitas config/katalogas/operatorius | duomenų/account/įmonės izoliacija; nedubliuotas core |
| M9. Multi-vendor (jei reikia) | atskiri nepriklausomi pardavėjai, seller onboarding, komisiniai, išmokos | atskiras Stripe Connect ir teisinio modelio sprendimas; neįjungiamas iš šio plano |

M1–M4 yra pirmo serverinio paketo apimtis; M5–M9 ir svetainės/agentų etapai nepavadinami baigtais iš to paketo tests sumos. Užbaigus pirmą paketą tęsiami įvykdomi darbai; konkrečios prieigos ir verslo faktai yra atskiri vartai.

2026-10-11 pirmas serverinis paketas įgyvendintas ir lokaliai patikrintas: 20 Node testų bei atskiras workerd/D1 kelias. Tai M1 pagrindas, M2 SDK adapteris, M3 sutartis su fixture ir M4 žurnalo pagrindas; pilni M1–M4 etapai dar neužbaigti. [Tikslios ribos ir tolesni darbai](IMPLEMENTATION_STATUS.md).

## Artimiausia darbų eilė

1. Užsakymo kontaktų/adreso ir pristatymo pasirinkimo snapshot, likučių korekcijos/partijos ir viešo katalogo projekcija. Pakuočių sujungimą tikrinti pagal realų pakavimą.
2. Documents/numbering, pasirašyti refund įvykiai, finansinių source dedup ir Stripe/payout/banko reconciliation; tai neužkuria AI agento anksčiau nei savininko numatyta seka.
3. M5 identity/membership adapteris, užsakymų/pakavimo/etiketės/išimčių ekranai ir browser priėmimas. Lygiagrečiai pasirinkto carrier API adapteris su realių prisijungimų vartais.
4. M6 partnerio/kainyno/quote/reorder domenas. M7 pasirengimas ir realūs patikros kvitai; tik po jų priimamas operacinis modulis.
5. S1/S2 svetainė, nuotraukos ir turinys, tada A1–A3 agentai. Nauja rinkos aktyvacija turi atskirą mokėjimo/siuntimo/saugos/kalbos/mokesčių patikrą.

Tai darbų seka, ne pažadas apie datas. Tęsiant pradėti nuo aktualaus main, šios būsenos ir nepriimto kelio; nekartoti jau įrodyto paketo kaip tariamai naujo darbo.

## Paviršių inventorius
Storefront: produktų katalogas, produkto pasirinkimas, krepšelis/šalis/paštomatas, checkout, mokėjimo laukimas/pavyko/nepavyko, statusas, naudojimo/pagalbos, atsisakymo forma.
Operatorius: užsakymų sąrašas ir detalė, stock/partijos, pakavimo eilė, labels batch, tracking išimtys, refunds, dokumentai, apskaitos suderinimas, B2B partneris/kainynas, automatizacijos žurnalas.
Kiekvienam dinamiškam ekranui numatyti loading/empty/error/conflict/stale/success pagal realius duomenis. UI įgyvendinimas negali būti pavadintas priimtu vien iš API testų.

## SEO/GEO ir core
Viešo runtime pritaikymas per companion repo, su tuo pačiu siteId ir dabartiniais SEO/media/mail/content kontraktais. Neperkelti užsakymų į turinio paketą. Produktų projekcija turi atskirą price/stock eligibility; redakcinis approval nepatvirtina mokesčio ar stock.

