# 0.9: katalogas, pristatymo pasiūlymas, finansai ir grąžinimai

Šis paketas tęsia [pilno pagrindo pavedimą](FOUNDATION_ACCEPTANCE_2026_10_12.md).
Galutinis dizainas, aptarnavimo / partnerių agentai ir gyvas paleidimas lieka
atskiruose savininko numatytuose etapuose.

## Įgyvendintas pagrindas

- Privatus katalogo valdymas: catalog teisės, kainų / pakuočių versijos su CAS,
  neaktyvūs nežinomos pakuotės priedai, priedui būtinas rinkinys. Pakeitimas
  nekeičia esamų užsakymų, kainų ar tikro likučio.
- Pirkėjo pristatymo pasiūlymas pagal adresą ir visas individualias pakuotes.
  Tiekėjo paskyra, aplinka, valiuta, paslauga, krepšelis, aktualios kainos ir
  pakuotės bei 5 min. galiojimas tikrinami serveryje. Siuntos registravimo
  komanda lieka atskira.
- requireQuote / requireTerms, quoteHash ir acceptedPolicyVersion įrašo
  patikrintą sumą ir sąlygų versiją. Pasikeitusi kaina atmetama prieš rezervaciją.
  Priimtas užsakymas kartojamas ta pačia tapatybe ir suma net pasibaigus
  pasiūlymui. Nutrūkus ryšiui, išsaugotą bandymą galima sutikrinti.
- Fizinių grąžinimų kiekis ribojamas pirminiu užsakymu, tik patikrintos prekės
  grąžinamos į parduodamą likutį. Pinigai nekinta. Visiškai grąžinus pinigus
  už neišsiųstą užsakymą, galima vieną kartą atšaukti vykdymą ir grąžinti
  fiziškai sandėlyje patikrintą likutį. Pradėtas vežėjo POST ar siuntos įrašas
  šį kelią uždaro.
- Banko / finansų CSV turi stulpelių priskyrimą, EUR / PLN sumas su tašku ir
  ISO/Z datas. Saugomas nekintantis šaltinis ir SHA. Originalai peržiūrimi
  privačiai; finansų / dokumentų / journal CSV eksportas palaiko from / to
  milisekundžių intervalą [from,to), iki 10 000 eilučių. Importas nesukuria
  mokėjimo ar deklaracijos.
- Stripe balance importas: gross / fee atskirai, Charge → PaymentIntent,
  refund / payout / bank sutikrinimas pagal pirminius faktus. Nepalaikytas
  tipas, FX ar netinkamas net/fee lieka peržiūrai. Production tikrinama
  raktą turinti Stripe paskyra. Vienas PaymentIntent negali patvirtinti
  dviejų užsakymų.
- Pasirašyti Stripe dispute faktai saugomi su būsena ir įrodymų terminu.
  Senesnis įvykis nekeičia naujesnės projekcijos. Pinigai, likutis ir ginčo
  uždarymas automatiškai neatliekami.
- Bendrame core išlieka didmenos partneriai, kainynai, MOQ/casepack,
  pasiūlymo priėmimas ir pakartotinis užsakymas. Priimtam užsakymui operatorius
  gali paruošti Stripe Checkout nuorodą. Kreditavimas ir partnerių portalas
  neįjungti.
- Operacinių laiškų ruošiniai keturiomis kalbomis, nekintantis Message-ID /
  tekstas / SHA / transportas ir vienas siuntimo bandymas. Timeout ar
  prarastas patvirtinimas reiškia unknown; tolesnis execute tik sutikrina
  transportą. SMTP priėmimas nėra gavėjo INBOX įrodymas. Reuse privatus
  COMMERCE_MAIL binding į MAIL_CORE; nauja pašto paslauga nekuriama.
- D1 viešų quote / delivery / order limitai: 60 / 20 / 10 per 10 min. vienam
  store / veiksmui / Cloudflare kliento IP. DB saugomas tik serverio druska
  maišytas hash. Production be šio ingress adapterio uždaryta; edge stebėjimas
  ir limitų derinimas tikrinami per tikrą paleidimą.
- eligibleCountries grąžina tik neuždarytas ir runtime paruoštas rinkas.
  Renderer Offer reikalauja publishOffers ir šalies buvimo šiame sąraše.

## Verslo konfigūracija

Komanda: node scripts/prepare-business.mjs --out runtime/memocasting-prepared.json.
Ji paruošia naują failą, esamo neperrašo, DB / paskyrų / teisių neįjungia.
config/memocasting-business.json turi amountUnit EUR_cents; istoriniai
baseAmountEur / amountEur ir kaštų laukai yra centai.

Įrašyti savininko MB 306026827, Molynės g. 2C siuntimo / grąžinimo adresas,
02211, +37069108251, info@memorycasting.lt, €32 / €48, pagaliukai, pasirenkami
dažai €3 ir pagrindas €10. Šablono 0 likutis reiškia neįvestą inventorių,
o ne patvirtintą sandėlio būklę. Nežinomos priedų pakuotės jų neaktyvuoja.
Užsienio kainos EUR yra pasiūlymas, rinkos uždarytos iki kainos ir kalbos
patvirtinimo. PLN kurso nėra.

Registracijos adresas dar nepatvirtintas (siuntimo adresas ir RC įrodymas
skiriasi). Tiekėjo saugos dokumentai ir mišinių instrukcijos neišgalvojami.
Šiuos faktus reikia įvesti prieš tikrą prekybą.

## Prijungimo sutartis

Stripe: nuolatinė MB aplinka, accountRef, raktas, webhook secret, HTTPS
grįžimo URL ir pasirašytų įvykių bei mažo bandymo patikra.
Siųsk pigiau: API paskyra, auth / JWT atnaujinimo tvarka, paslaugų ID, kainos
viršutinės ribos garantija, vieno POST ir rezultatų sutikrinimo sutartis,
individualios pakuotės ir tikro PDF paskirtis. Locker request ir response
laukų atitiktis dokumentuojama prieš POST; vien locker ID neužtenka.

Mail binding: POST /commerce/messages/<id>, body:
{schemaVersion,environment,storeId,id,messageId,from,to,replyTo,subject,text}.
GET tuo pačiu keliu sutikrina ankstesnį rezultatą. Atsakymas:
{id,environment,storeId,from,to,status,reference}, status
accepted / unknown / rejected; reference būtinas accepted.
Message-ID yra <id@tikro-authenticated-from-domenas>; id turi tik alnum ir
hyphen. Viešas Reply-To adresas nepaverčiamas neautentifikuotu SMTP From.

Production reikia tikrų D1 / privataus R2 / ASSETS / core grants,
COMMERCE_ABUSE_SALT, užrakintų connection ir veiksmų politikų bei atskirai
patvirtinto runtime. Tai įjungimo procedūra, ne šiame pakete atliktas deploy.

## Priėmimas

Node ir native workerd/D1/R2/Queue testai tikrina tikrą DB/transaction/binding
sutartį su provider fixture. Native papildomai: katalogo CAS, dinaminė
pirkėjo kaina, D1 limitas, fizinis grąžinimas ir vienkartinis mail priėmimas.
Tikras vežėjo POST ar klientų laiškas neatliktas.

IAB 2026-10-12: neaktyvus TEST priedas be matmenų išsaugotas su €10; banko
€39.99 šaltinis išsaugotas ir CSV eksportuotas kaip 3999 centai; 7EEF5125
gautas rinkinys patikrintas ir likutis grąžintas vieną kartą. Katalogas ir
pranešimų peržiūra: viewport 320, dokumentas 305 px.
F5BCF999 sukurtas per dynamic pristatymo pasiūlymą (€32 + TEST €7.99).
Reload išlaikė numerį / €39.99 / rezervaciją; plotis 320/320.
Tai sintetiniai duomenys, ne tikras užsakymas, tarifas ar lipdukas.

Privatūs tmp/ui-review įrodymai: catalog-actual-320-09.png,
notification-fixture-320-09.png, buyer-dynamic-reload-320-09.png.
Svetainės turinio / media / public renderer priėmimas yra atskiros savininko
svetainės sesijos kvitas.
