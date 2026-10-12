# Vietinis prekybos pagrindo priėmimas

2026-10-12. **LOCAL_SHOP_CODE_VERIFIED; PRODUCTION_NOT_READY.** Sutartos
pirmos parduotuvės nuo tiekėjų prieigų nepriklausomos žinomos kodo spragos
užbaigtos. Bendras prekybos modulis ir Memocasting pirkėjo sąsaja patikrinti
kartu. Tai vietinis funkcijų priėmimas; visos svetainės 85 kriterijų auditas,
galutinis dizainas, našumas ir vėlesni agentai šiuo kvitu nepriimami.

## Tikslūs šaltiniai

- Kanoninis vykdomo kodo commit / modulis 0.12.1:
  `be32c223b2e45168b52a5eeec2d111006fe98214`, [PR 96](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/96).
- Svetainės PUBLIC:
  `a82c6da55ff53df895a5c6600adba421b51fbe37`, [PR 31](https://github.com/christianza1989/niche-public-core/pull/31).
- Svetainės CORE galutinis priėmimo commit:
  `2c90a8f697e78aff9de401e5f20da3b8f7c7df47`, [PR 101](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/101).
  Kanoninio kodo merge išsaugotas `0f1d8324a6825b76c23bb8df8e85f58a04b4f8fe`.
- Patvirtinto 88 puslapių paketo SHA256:
  `e69b16f2c764ad51d075f6700af9ad97ad9f1a7fb2248c30552f68efb9afa9c6`.
- Caller manifest ir root failų baitai sutampa: checkout UI
  `7c4e09a790d40ed5f287805584e789948ac44b2f59d370b48655008b1056e89c`,
  klientas
  `7c5f07e33eacc8c9b42b55060d9014a3497f7ddd8d916abe4bc992298b7c557e`.

Vėlesni šio priėmimo dokumentų / žurnalo commit nekeičia čia patikrinto
vykdomo kodo ir neperrašo caller manifest. Main integravimas lieka atskiras.

## Priimti keliai ir įrodymai

| Sritis | Vietinis rezultatas |
|---|---|
| Prekybos backend | 117 Node testų; native workerd / D1 / R2 / Queue su 22 migracijomis; formatas ir Worker dry-run 766,20 KiB gzip / 21 assets PASS |
| Atkuriamas šaltinis | Exact be32c223 Git archive tik commerce-core, be runtime: clean npm ci ir pilnas verify 117 / native22 / build PASS; npm audit 0 radinių. ZIP SHA256 `6f8efb5331e0c6fb2b9e3b5b9cd2ae3e7f709fa80b7d2ca2bd32af18ec2693a3` |
| GitHub | Exact be32c223 preflight SUCCESS; PUBLIC CI nepateikė checks, todėl jam CI PASS neteigiamas |
| Caller ir svetainė | 80 PUBLIC testų, TypeScript ir build PASS. Exact PUBLIC archive build be gretimo privataus core PASS; priklausomybės pakartotinai naudotos, clean PUBLIC npm-ci neteigiamas |
| Krepšelis / užsakymas | Actual browser kelių SKU / kiekių pakeitimas, pašalinimas, reload, create-clear, naujos prekės po seno order, retry / recovery. Empty 0→1→0, sumos užrakinimas ir gimtosios kalbos katalogo nuoroda visomis LT / PL / LV / ET |
| Pirkėjo kvitas | Naujas testinis order / reload išlaiko originalų adresą, LT šalį, pristatymą ir 3650 centų. Neprijungto mokėjimo paaiškinimas ir išsaugotas atsisakymas matomi visomis kalbomis |
| Partijų kokybė | Actual UI order normaliai FEFO paskirtas į tikrą sintetinę FinishedStock partiją; canonical karantinas sukelia buyer fulfillmentBlocked keturiomis kalbomis. Fake allocations nenaudoti. Po bandymo tik tos partijos karantinas panaikintas per CAS |
| Rezervacijos pabaiga | Canonical expire savo sandbox / testiniu laikrodžiu: keturiomis kalbomis neutralus neapmokėtas statusas, pabaigos paaiškinimas ir jokio mokėjimo mygtuko. Originali suma / snapshot nepakeisti |
| Istorija / migracija | Own svetainės DB migruota be reset iki22; ankstesnis A908 order išlaiko11650 centų ir SHA256 `1d24cf0cced080c358e94276194ee555c7c58e8f8108a6b0a752454b3496a4f5` |
| Operatorius / dokumentai / siuntos | Ankstesni actual order / catalog / CSV / return / private PDF / B2B / packed→fixture booking→tracking keliai ir native finansinių / outbox / backup scenarijai. Naujos partijos receipt / quarantine / checked release actual UI PASS |
| Vaizdas | Pakeistos hold / expired būsenos320px ir expired1280px: vienas H1, 0 nukirptų valdiklių. Root partijų UI320px scrollWidth305, valdiklių0. Tikras200% ir reduced-motion nėra šio kvito PASS |
| Turinys / URL | Svetainės final267HTTP patikros:88puslapiai,24gidai,0rodymo radinių. Paketas neperrašytas; bendras85kriterijų auditas lieka NOT_COMPLETE / LOCAL_AUDIT_INCOMPLETE |

Privatūs root įrodymai: `tmp/verify-0121.log`,
`tmp/source-restore-0121-be32c223/source/commerce-core/restore-verify.log`,
`tmp/finished-stock-012.png`. Svetainės sesijos `sites/memocasting/qa/`:
`shop-buyer-012.json`, `shop-migration-012.json`, `shop-final-snapshot-0121.json`,
`shop-order-012.json`, `shop-expiry-012.json`, `shop-traced-fixture-012.json`,
`shop-hold-012.json`, `shop-hold-release-012.json`,
`shop-expired-lt-0121.png`, `shop-held-et-mobile-012.png`. Tai tik sintetiniai
kvito duomenys, ne realūs klientai ir ne Git atkuriami runtime failai.

## Paleidimo vartai

Programinis pagrindas paruoštas pagal [0.12 migravimo sutartį](CONTINUATION_0_12.md)
ir [0.9 prijungimo runbook](CONTINUATION_0_9.md). Tikram paleidimui reikės:

1. Nuolatinės MB Stripe paskyros, jos faktinių sandbox / live adapterių,
   HTTPS webhook ir autorizuoto mažo patikros kvito.
2. Siųsk pigiau IT autentifikacijos / bandymų prieigos, kainos neviršijimo ir
   lost-response sutarties, tikrų locker / kelių pakuočių / PDF bandymų.
   Tiekėjas jau patvirtino, kad atskiros vežėjo sutarties ir mėnesinio/API
   mokesčio nereikia; tikri siuntimo tarifai nėra testiniai pasiūlymai.
3. Faktinių SKU / komponentų likučių ir galiojimo, tiekėjo instrukcijų,
   priedų supakuotų matmenų, registracijos adreso bei dokumentų politikos
   patvirtinimo. Testinė inventorizacija negali pakeisti šių duomenų.
4. Tikro pašto siuntėjo / transporto ir pristatymo kvito, production core
   identity / grants, HTTPS / D1 / R2 / Queue / backups ir domeno diegimo
   patikros. SMTP accepted nėra INBOX įrodymas.

Visi production vartai uždaryti. Tikrų mokėjimų, siuntų, klientų laiškų,
leidimų išplėtimo, deklaravimo, DNS ar deployment neatlikta. Didmenos
partnerių paieškos, aptarnavimo ir apskaitos agentų runtime kuriamas vėliau.
Šis kvitas neteigia, kad iki realios prekybos liko vien du API raktai.
