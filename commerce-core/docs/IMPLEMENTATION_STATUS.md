# Aktualus pavedimas ir būsena

2026-10-11. Savininkas užsakė pilną bendro prekybos modulio planą, roadmap ir pradėti įgyvendinimą pagal core taisykles. Svetainė kuriama vėliau; nuotraukos bus pateiktos tada; aptarnavimo ir partnerių paieškos agentai — po svetainės. Operatorius MB Memocasting, ne bendras MB Pinet default.

**Planas ir pirmas vietinis serverinis paketas paruošti. Visas prekybos produktas dar neužbaigtas.** Veikia katalogas/rinkų kainos, rezervacijos, užsakymai, Stripe adapteris, siuntų adapterio sutartis, atsisakymo/refund įrašai, balansuoti journal įrašai ir inbox/outbox. Priėmimo įrodymai — [ACCEPTANCE](ACCEPTANCE.md). Source: izoliuota codex/commerce-core-20261011 iš current main 7af6b9641012a30c5f95eac38a66daeff8f8cb39; [issue95](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/95), [draft PR96](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/96). Nesujungta šaka nėra visiems PC galiojantis core.

| Likęs kelias | Būsena ir trūkstamas įrodymas | Ar galima daryti dabar / konkretus kitas žingsnis |
|---|---|---|
| Pirkėjo kontaktai/adresas, paštomatas, realūs rinkų tarifai | dar nėra schema/validation/užsakymo snapshot | schema ir adapterio code galima plėsti; faktiniam tarifui ir paslaugai reikia pasirinkto API. Tai kitas M1/M3 paketas |
| Partijos/BOM ir stock administravimas | dabartinis likutis yra baigtas SKU; bendri dažų/alginato komponentai nevaldomi | galima įgyvendinti partijų ir korekcijų modelį; Memo BOM/paint cost/family package faktus patvirtinti prieš jo įjungimą |
| Stripe realus sandbox/live | SDK body/signature/async testai vietiniai, tikro API sesijos nėra | reikia konkretaus MB account sandbox credentials ir enabled methods; nesikreipti į esamą live account iš fixture |
| Refund vykdymas/provider events/disputes | įgyvendintas patvirtinto refund fakto įrašymas, ne pinigų pervedimas | plėsti pasirašytų refund įvykių ir action gateway sutartį; tikras vykdymas su account/mandate |
| Siuntų API ir PDF | tik fixture create/find/timeout; nėra realaus label arba tracking | pasirinkti agregatorių pagal be ilgalaikės vežėjo sutarties sąlygas; gauti API/testų prieigą ir įrodyti reference dedup |
| Dokumentai/apskaita | balansuotas žurnalas yra pagrindas; numeracijos/importo/reconcile/period close nėra | M4 plėtra galima lokaliai; realiai apskaitai reikia patvirtintų taisyklių, banko/provider dokumentų ir mokesčių režimo |
| Administravimo ekranai | API packing/shipping gate yra; ekrano ir bendro identity binding nėra | M5: read/membership adapteris ir persistent ekranai; UI/browser priėmimą atlikti atskirai. Neklonuoti Madbeauty auth |
| Didmena | requirements parengti; company/priceList/quote/reorder code nėra | M6 po pagrindinio pirkimo/vykdymo kelio; galima naudoti baigtus testinius produktus, neišgalvoti partnerio |
| Production/runtime, mail/backup/queue | dabartinis Worker production atmeta; nėra remote DB/R2/Queues ar tikro laiško | M7 su paskyros/config/sender/admission ir realių operacijų įrodymais |
| Memocasting svetainė ir turinys | pilnas nišos planas yra; runtime registracija/Shopify URL inventorius/UI nėra | pagal savininko seką po modulio; tada nuotraukos, tikri rekvizitai, instrukcijos ir Shopify eksportas |
| Aptarnavimo/partnerių/apskaitos agentai | suplanuotos teisės ir priėmimas; agentai nesukurti | savininko seka po svetainės; bendras calibration/runtime, protected tests ir channel receipts |

Pirmas paketas nėra signalas mažinti viso roadmap. Kiti vietiniai darbai gali būti tęsiami be naujo leidimo; konkrečios išorinės prieigos stabdo tik nuo jų priklausantį activation. Gyvos operacijos, DNS, outreach ir mokesčių pateikimas šiame pakete neįjungti.

