# Vietinės versijos perdavimas · 2026-10-12

Parengtas atskiras Memocasting rendereris ir vietinis parduotuvės kelias, naudojantis bendrą commerce source be jo pakeitimų. 20 patvirtintų puslapių / 6 gidai / 30 responsive WebP. Trys Edinburgh temomis papildyti originalūs gidai yra apdaila, džiovinimo etapų planavimas ir nepavykusio liejinio pagalbos aprašas. Šaltinių taikymo ribos matomos pačiuose tekstuose; svetimos paslaugos, saugos pažadai, receptai, klientų istorijos ir vaizdai neperimti. Sitemap neperskaitytas dėl403; pilnas svetimos svetainės inventorius neapsimestas.

Paketo SHA-256: `c8340a869b1f209990540d90fa9d13e8340a006a8947854ecb7ab97c0c0b7a8c`. Importas tik oficialus; private review ir release manifest saugomi izoliuotoje studijoje, nekuriant rankinių approved hash. `CONTENT-PLAN.json` turi38klausimų sprendimus ir7rašymui dar nepribrendusius privačius planus. Dar trys nežinomi istoriniai SKU nėra paskelbti.

Faktinės patikros:

- Studio47/47, public-core54/54 ir commerce39/39; build ir TypeScript praėjo. Visų10nišų SEO smoke praėjo po bendrų discovery pakeitimų.
- Release validator:20pages30assets verified-export-not-deployed. Render checker:20pages6articles57requests0issues; HTML audit58requests0findings. Tai nėra pilnas svetainės ar produkcijos priėmimas.
- Pirmų17puslapių desktop/mobile metrikos; nauji3gidai ir jų indeksas320/390/768/1440px, vienasH1, nėra horizontalios iškyšos. Peržiūrėti tikri apdailos, etapų ir pagalbos vaizdai; CUA fullPage capture užklausos dalyje bandymų nutrūko, todėl naudotas veikiantis native screenshot kelias. Tai ne fizinio telefono ar200%zoom įrodymas.
- Realus browser pirkimo kelias: pora su dažais35EUR+4,50EURfixture, testinis order išsaugotas; neįjungtas mokėjimas503, reload išlaikė order, withdrawal prašymas išsaugotas. Jokio fiktyvaus apmokėjimo/refund.
- Izoliuota HTTP patikra13assertions: serverinė48EUR šeimos kaina su ignoruojamu client unitAmount, idempotent replay / changed409, token prieiga, neprijungtas checkout503, withdrawal, produkcijos host503, svetimas host404, origin403, bounded oversize rejection, nežinomas SKU404. Atmetamų mažų body drain pataisa pašalino pastebėtą vėlesnio request ryšio nutrūkimą. `QA_HTTP.mjs` kuria sintetinius užsakymus; pakartotinis vykdymas gali išnaudoti fixture likutį, todėl nėra automatinio nuolatinio monitoringo.
- Viena testinė pagalbos forma200 ir sintetinės Memo eilutės skaičius1 izoliuotoje D1. SMTP/voice išjungti; realus operatoriaus INBOX nepatikrintas.
- Lighthouse13.5.0 mobile local production: home90/100/100/100 (performance/accessibility/best-practices/SEO), LCP3139ms/CLS0,0024/TBT21ms; apdailos gidas94/100/100/100, LCP2340ms/CLS0,1101/TBT26ms. Gido šrifto sukeltas poslinkis yra likęs išmatuotas apribojimas, ne paslėptas field CWV PASS.
- Impeccable failų detector patvirtinimo rezultatas `[]`. Tai ne visos vizualinės ar accessibility matricos priėmimas. Paired fetched-main freshness handoff PASS; svetimų checkout/DB nelietėme.

Visi85audit kriterijai įvertinti atskirai `PHASE-1-AUDIT.json`; rezultatas nėra10/10. Trūksta pilnos keyboard/zoom/text-spacing/state matricos, timed/revoked HTTP ir privataus preview priėmimo, baigto artimiausių tinklo dizainų/alternatyvių konceptų palyginimo, realaus SMTP/INBOX ir galutinių operacinių/teisinių faktų. Šie punktai nėra įrašyti kaip PASS vien todėl, kad build praėjo.

Prieš gyvą prekybą reikia savininko tikrų produkto nuotraukų, tiekėjo medžiagų/dažų/saugos instrukcijų bei realaus bandymo, šeimos svorių/talpos, rekvizitų ir pagalbos adreso priėmimo, mokėjimo sandbox/operatoriaus/carrying integracijų, tikro pristatymo ir grąžinimo proceso, produkcijos binding/DNS/TLS bei aiškaus leidimo deploy. Šis darbas jų neįjungia. Nėra naujų paidTreg calls, DNS, tikrų mokėjimų, siuntų ar outbound laiškų.

Draft PR101 core remiasi commerce PR96. Companion renderer PR31 remiasi public main. Saugus review/merge eiliškumas:96 →101 ir suderintas31; vietinis veikimas nėra merge ar adoption. Abu worktree palikti peržiūrai. Atskirų parent commerce source ir runtime8795 nekeisti.
