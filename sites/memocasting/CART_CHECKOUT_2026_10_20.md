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
