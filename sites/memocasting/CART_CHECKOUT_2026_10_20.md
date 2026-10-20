# Krepšelis ir atsiskaitymas viename puslapyje

Savininko2026-10-20 pavedimas: profesionaliai sutvarkyti /cart ir pirkimą atlikti šiame žingsnyje. Išlaikyti baltą/Manrope/rožinę Memo tapatybę. Režimas – praktiškas užsakymo užbaigimas; be scrollytelling, išgalvotų nuolaidų, pristatymo terminų ar mokėjimo logotipų.

## Apimtis ir patikra

- Esami /cart, /checkout ir /uzsakymas keturiomis kalbomis lieka tame pačiame native checkout adapteryje; neliečiami turinio paketai ar publikavimo datos.
- Tik pasirinktos prekės, patvirtintos iliustracijos, serverio kainos, kiekio keitimas/pašalinimas ir aiški tuščia būsena. Kontaktai, pristatymas bei sąlygų sutikimas vienoje formoje. Dešinėje stabili santrauka, mobile natūrali seka,44pxvaldikliai/16pxinput/aiškusfocus.
- Vienas „Tęsti į apmokėjimą“ veiksmas atlieka serverio quote→idempotent order→Stripe mokėjimo atvėrimą tame pačiame /cart. Kortelių numeriai tik Stripeiframe. Galutinė mokėjimo tiesa tik pasirašytame serverio įvykyje; onComplete tik perskaito būseną.
- Tikras pendingorder/token atkūrimas, pasenusios kainos, quoteadreso neatitikimas, tinklo nutrūkimas, dubliuotas submit ir storagefailure išsaugomi per canonical CommerceClient. Išlaikyti legacy hosted sesijų atkūrimą, nekeisti jau sukurtos sesijos tipo.
- Realūs tuščias/pasirinktas/validation/loading/error/orderrecovery/embeddedmountdisposal scenarijai; Node regresijos ir actual desktop/mobile390/320,4kalbų tekstų peržiūra. Testinė DB ar kvitas nėra LIVE mokėjimas.

## Tikra pradinė būsena

HTTPS storefront-context2026-10-20: Stripe LIVE verified, shippingQuotesConnectedtrue; shippingConnected/documentReady/productionReady/publishOffersfalse, eligibleCountries[]. Seniausi priimti savininko/provider faktai – piniginė0€, papildymas atidėtas ir automatinio APIapmokėjimo priėmimas neužbaigtas. Šio UI pavedimo metu neapeiti vartų, neaktyvuoti mokamų siuntų ar fiktyvių dokumentų. Konkrečius likusius go-live veiksmus pateikti po nepriklausomo parengimo.

## Failų ribos

Ši sesija: canonical commerce-core/public/checkout-ui.mjs ir susijusios UIregresijos; PUBLIC nativecheckout adapteris, scopedcheckoutCSS/siteprops ir peržiūrėtasSDKimportas. Shopopokalbis01a12c60 atskirai suderina stripe-adapter/service/http/client bei jų regresijas, be LIVEdeploy/DB/admissions. Tikslius sourceSHA ir priėmimą pridėti po patikros.

Tipografijos planas: esami Manrope400/600; H1iki42px, fieldsettitle22px, body/labels/input16px, secondary14px. Be naujų šriftų; pagrindinis veiksmas tamsus, rožinisfocus; kainos su tabularnumerals. Desktopmax1160px, columns1.2fr/0.8fr; mobilevienastulpelis, be horizontalausoverflow ar uždengiančio plaukiojančio CTA.

## Įdiegtas krepšelis · 2026-10-20

Canonical UI87b2b461 ir empty-copy809540e6; shopo feature03f9532 priimtas kaip e66bbade (tik README/WORKSTREAMS konfliktai suderinti išsaugant abi istorijas). Backend0.18.0 deploy9da50085; vien esamo tos pačios MB Stripe paskyros pk_live papildymas privačioje COMMERCE_CONNECTIONS sukūrė c572a4a3. Rakto reikšmė neįrašyta į Git/tekstus. Senas pasuktas Stripe raktas, webhook, Sendparcel read-only ir bookingfalse išsaugoti. Naujos kredencialų teisės nesukurtos.

PUBLIC1a9eb656 su exact canonicalSDK809540e6, aktyvus frontend8fcc5bd5-9389-4830-9d4a-3dd36e3b75ad nuo13:28:31Z. Tik pasirinktos prekės, nuotraukos, +/-/remove ir tuščia būsena; kontaktai/adresas/delivery bei dešinė santrauka; vienas quote→create→embedded payment veiksmas. Senų hosted Session nekeičia. Classic numatytas režimas išsaugotas kitoms svetainėms. Stripe.js oficialus endive adresas ir createEmbeddedCheckoutPage(fetchClientSecret,onComplete), tik token-bound trijų laukų atsakymas; pasirašytas webhook lieka paid tiesa.

Patikra:179Node/fullnative24/D1/R2/restart/buildPASS;14UIregresijų (įskaitant dvigubą submit, užrakintus laukus, prarasto create atkūrimą ir klaidingą quote sumą), PUBLIC127testai,3renderercontract testai, tsc/lint/build/dryrunPASS. Actual local quote32+4,50=36,50EUR buvo tik izoliuotas sandbox, jokių LIVE orderių ar charge. Desktop1280/mobile390 ir320: matomos pasirinktos eilutės, kiekis ir tuščia būsena,16pxinput/44pxvaldikliai ir nėra horizontalios slinkties. Hosted pagrindinis vaizdas ir mobile išsaugoti privačioje qa/memocasting-cart-20261020. Actual Stripe iframe/paid LIVE nepriimtas, nes production checkout tebėra uždarytas; renderer fixture nėra šio priėmimo pakaitalas.

Actual Worker bindings/observability tiksliai išsaugoti abiejuose servisuose (frontend pasikeitė tik release annotation). D1configHash053a25a2 prieš/po sutampa, products2/inventory2/orders0/documents0/journal0/sequences0. DB/migracijų/serijų/admissions/cron/DNS/mail/turinio leidinio ir92datų nekeista. Native turinys3367ef65 ir paketas5a0183d6 išsaugoti.

Vietinė native peržiūra atskleidė pakartojamą Wrangler custom-domain route host rewrite: loopback relay503 commerce_external_host. Pataisytas tik preview launcher – atskiras ignoruojamas memo-preview.json be routes, production wrangler.json nekeičiamas; relay200,2regresijos. Upgrade77232c48. UIupgrade0eea5e73, PUBLICforeignscopea23e8fe2; main merge ir kitų PC adoption neteigiami.

## Konkreti likusi prekybos aktyvacija

Hosted context po13:25: StripeLIVEverified ir embeddedCheckoutConfiguredtrue; shippingQuotesConnectedtrue, bet shippingConnected/documentReady/productionReady/publishOffersfalse. /markets visur checkoutEnabledfalse; policyVersion memocasting_terms_v1 nesutampa su immutable terms page revisionHash. Delivery išvestis paslėpta kol rinka uždaryta. Todėl UI negali pradėti tikro mokėjimo; tai ankstesnė operacinė būsena, ne tariamai priimtas paidCheckout.

Shopo2026-10-20 read-only peržiūra: papildomo savininko VAT/address/series fakto dokumentams neprašyti. Jau patvirtintų juridinės buveinės,306026827, nePVM ir MCWEB/MCWEBK/MCWEBP pakanka invoice_non_vat sutarties konfigūravimui. Reikia atskirai priimti operational/document policy, tikrą R2/font ir automatinių PDF darbų parengimą. Juridinės buveinės nepainioti su dispatch/returns adresu. Kiekvieną atveriamą rinką sieti su dabar publikuotu tos kalbos immutable terms hash, realiu carrier serviceId ir sender; kitų rinkų automatiškai neatverti. Senų order snapshot nekeisti.

**Atnaujintas tiekėjo faktas:** originaliame savininko Gmail thread2026-10-19 08:22 Goda aiškiai patvirtino „Automatinis apmokėjimas įjungtas“. Chrome perskaityta2026-10-20; naujo laiško nesiųsta. Nepakankamo piniginės likučio atveju registracija neįvyksta, užsakymas lieka neapmokėtas Mano krepšelis; /rest-api/orders/infos state5 reiškia užregistruotas/neapmokėtas, ne paid/confirmed.0sukurtas su automatiniu bandymu maždaug kas2min,1ongoing,2confirmed,3rejected,4canceled,6pending,8paymentcanceled. Tai išsprendžia ankstesnį laukiamą billing activation patvirtinimą, bet ne savininko atidėtą piniginės papildymą. Dabartinis piniginės balansas šiame cart pakeitime iš naujo neskaitytas; ankstesnis0 nėra naujo balanso įrodymas. Mokama siunta/topup/kreditas neaktyvinti.

Pašto gateway/actual SMTP gavimas ir reali automation/consumer eiga atskiri nuo productionReady formulės. Jokio fake LIVE receipt, testinio tarifo ar užsakymo vartų apėjimo. Tolimesnį pilną prekybos įjungimą vykdyti pagal DEPLOYMENT runbook, su tikru piniginės finansavimu, reviewed exact konfigūracija ir pasirašyto mokėjimo priėmimu.

Rollback: prieš veiksmą vėl perskaityti actual settings. Frontend ankstesnis e5197461; backend ankstesnis67d8fdd8 arba9da50085 (0.18 iki publickeybinding), priklausomai nuo reikalingo kodo režimo. Vien UI rollback nekeičia naujo optional publickey lauko; neperrašyti paskyros/Sendparcel jungties senais vien Stripe bulk duomenimis, neatgaivinti anksčiau atšaukto rakto ir neatkurti senos DB. Privatūs original/next binding payload ir read-only D1 kvitai išsaugoti.
# Activated LT checkout

2026-10-20: the subsequent [sales activation](SALES_ACTIVATION_2026_10_20.md) records the current enabled production state, resolved native carrier/Stripe/mail defects and precise real-payment limits. Earlier pending dependencies below are historical checkpoints, not the current storefront admission.
