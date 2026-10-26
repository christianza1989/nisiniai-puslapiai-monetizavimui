# Vienas mokestis klientui, kelios siuntos užsakymui

Savininkas paprašė neriboti paštomato perkant kelis rinkinius: klientas moka vieną pristatymą, papildomų dėžių siuntimą dengia pardavėjas. Administravime kiekvienai atskirai pakuotei reikia atskiros registravimo užduoties, vežėjo ID ir PDF. Mokamos siuntos priėmimo bandymui neperkamos.

- [x] Customer single_parcel opt-in politika: vienos sunkiausios, tada didžiausio tūrio tikros produkto pakuotės tarifas, kiekis tarifo nedaugina. Kurjerio/paštomato/adreso ir exact cart/quote validation išlieka.
- [x] Legacy vienos registracijos ir naujo plano atskirų pakuočių keliai. Additive0029 su unikaliomis aktyviomis plano vietomis; neleidžiama ta pati pakuotė dukart arba maišyti skirtingus planus.
- [x] Dalinis įvykdymas neužbaigia viso užsakymo; neaiškaus provider atsakymo nekartoti, jau patvirtintos pakuotės neperpirkti. Visų etikečių surinkimas.
- [x] Operatorius gali kiekvienai pakuotei gauti kainą, paruošti registravimą ir atsisiųsti PDF, arba visus rinkinius sudėti į vieną realiai išmatuotą dėžę.
- [x] Esama administravimo tipografika, fields/actions ir responsive struktūra; aiški „Pakuotė X iš N“, atskira vežėjo kaina, išsaugota kliento suma. Desktop/320 px peržiūra ir galutinės LT copy saviredakcija.
- [x] Native/D1 concurrency/restart/idempotency/partial failure, UI ir carrier transport regresija; teigiamas 2/3 rinkinių variantas ir nemokamo pristatymo kuponas.
- [ ] Siauras native CAS aktyvios LT delivery politikos pakeitimas, esami užsakymai nekinta. Tikslus SDK, esami bindings/cron/mail ir hosted priėmimas.

Issue277; bazė CORE0095288e / PUBLIC806fe9e6. Svetimi media, outputs, journal ir skills-lock išsaugomi.

Vykdymo metu savininkas pateikė atskirą realaus mokėjimo klaidą. Patikrintas Stripe LIVE0,64 € bandymas: du nepavykę 3D Secure autentifikavimai; mokėjimas incomplete. CSPstyle-src self ateina iš Stripe three-ds-2-fingerprint dokumento, o memocasting.lt/cart CSP antraštės neturi. Svetainės CSP neplatinama, 3DS neapeinamas. Laukiamas konkretus savininko atsakymas, ar banko patvirtinimo langas pasirodė. Tai atskira mokėjimo diagnostika, ne siuntimo kiekio priežastis.

Vietinis admin priėmimas: vienam mokamam fixture užsakymui paruoštos dvi atskiros pakuotės, dvi registracijos, fixture_1/fixture_2, du private PDF source įrašai su „Pakuotė1iš2“ ir „Pakuotė2iš2“. Pirmas lipdukas paliko ready, antras užbaigė labelled. Desktop/320px kontrolės, kainos ir tekstai patikrinti, konsolės klaidų nėra. Vietinis krepšelis išlaikė Omniva terminalą keičiant2į3, pristatymas abiem atvejais472minor (68,72€ ir100,72€). Viskas be tikro vežėjo/pašto/mokėjimo API.

273 vienetiniai testai PASS. Pilno verify pirmas native etapas atskleidė per plačiai sustabdytą seną kurjerio bundle automatiką; apribota tik naujai subsidijos/paštomato politikai.14paveiktų testų ir native smoke PASS. Pakartotinis pilnas wrapper išlaikė273PASS, tačiau išryškėjo senas refund smoke response.bodyUsed priklausomybės gedimas. Native fixture pataisyta skaitant kiekvieną HTTP atsakymą iškart vieną kartą ir naudojant command ID. Galutinis visas native smoke PASS atskirai; originalūs failed wrapper failai išsaugoti ir nevadinami bendru PASS. Dry-run PASS.

Savininkas vėliau pats užbaigė tą patį realų0,64€ mokėjimą: Stripe Succeeded, lokali produkcijos order būsena paid/allocated/pending, PaymentConfirmed outbox done; OrderPlaced ir PaymentConfirmed pašto įrašai accepted. Inbox gavimas ir GA4 purchase nėra šio fakto pakaitalas; order_analytics/purchase įrašo šiam užsakymui nėra, todėl pajamų matavimo priėmimas iš jo neišgalvojamas. Ankstesni3DSpranešimai išliko istorijoje, svetainės CSP nekeičiama.

Papildoma savininko pataisa: slapukų pasirinkimo uždarymas nebefokusuoja poraštės mygtuko automatinio banner atveju; rankinio atidarymo fokusas grąžinamas su preventScroll. Įgyvendinama companion PUBLIC tame pačiame leidinyje, peržiūra po compiled build.
