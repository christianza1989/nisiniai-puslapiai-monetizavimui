# Memocasting verslo faktai ir modelis

## Nauji savininko faktai ir Europos modelis · 2026-10-21

Poros pilna savikaina su darbu, medžiagomis ir pakavimu patvirtinta 10 EUR. Vieneto kainos: alginato pakelis 6 EUR, gipso pakelis 1 EUR; porai po vieną, šeimai po du. Kibiras 1 EUR, dėžė 0,30 EUR, įrankiai 0,10 EUR, instrukcija 0,10 EUR, dažai apie 0,10 EUR. Medžiagų / pakuotės suma porai 8,60 EUR, šeimai 15,60 EUR. Šeimos darbo savininkas kol kas neskaičiuoja. Tyrime atskirai naudojama 2 EUR darbo prielaida ir 17,60 EUR ekonominė šeimos savikaina; tai ne naujas savininko patvirtintas kaštas. Šie faktai papildo ankstesnius nežinomus šeimos komponentų ir dažų kaštus.

Savininkas aprašė ankstesnį nemokamų rinkinių bandymą su Kauno vestuvių vedėju: jaunavedžių rankų liejimas gyvai prieš svečius. Atneštų pardavimų duomenų nepateikta. Pageidaujama kryptis: kitų šalių vedėjai / organizatoriai bei programą vedantys muzikantai perka rinkinius, kuria turinį, o stipriausi gali tapti vietiniais pardavėjais ir šalies atstovais su lokalizuota svetaine / sistema.

Papildomai svarstomas savininko valdomas visos Europos DTC verslas: jo prekės laikomos išoriniuose 3PL sandėliuose, šie vykdo jo pardavimus. Tai nėra tas pats, kas platintojas, nuperkantis atsargas savo vardu. Savininko pristatymo tikslas ne daugiau kaip 4 darbo dienos; plane vertinamas visas laikas nuo apmokėto užsakymo pagal darbo dienų ribas. Konkrečių užsienio maršrutų SLA ar mokesčių režimas dar nepatvirtinti.

[Kainų ir partnerių tyrimas](PRICING_RESEARCH_2026_10_21.md): 23 pasiūlymai / 14 produktų grupių, 9 ES šalys ir UK; siūlomos bandymo kainos, ne faktiniai parduotuvės pakeitimai. [3PL ir automatizavimo planas](EU_FULFILLMENT_2026_10_21.md): LT, vieno ES sandėlio ir kelių vietų palyginimas, pirminiai kandidatai, 20 vnt. ekonomika, 4 d. d. kriterijus ir serverinis vykdymas. [Įrankių atranka](TOOLS.md) papildyta be mokamų calls ar operacijų įjungimo.

Toliau esantys senų datų įrašai yra istorija, ne dabartinio checkout / vežėjo / Stripe būsenos patikra. Šis kainodaros tyrimas neatnaujina visų operacinių sistemų priėmimo. Gyvos 32 / 48 EUR kainos nepakeistos; nei nauji sandėliai, nei teritorijos / siuntos neaktyvuoti.

## Istoriniai verslo faktai

Patvirtinta savininko 2026-10-11: MB Memocasting, ne PVM mokėtoja; Stripe turima, vežėjo sutarties nėra; seni produktų vaizdai bus pateikti vėliau.
Porai: 32 €, alginato pakelis 6 €, 1200 g gipso 1 €, kibiras 1 €. Savininkas 2026-10-14 patvirtino, kad balti dažai įeina į rinkinį; atskiro 3 € dažų pasirinkimo nebėra. Savininko 2026-10-15 patvirtinta supakuota siunta su dažais: 2,2 kg, 20×20×17 cm.
Šeimai: 48 €, 2 alginato ir 2 gipso pakeliai. Savininkas 2026-10-14 patvirtino, kad balti dažai taip pat įeina į šį rinkinį. Savininko 2026-10-15 patvirtinta supakuota siunta su dažais: 4,5 kg, 25×25×20 cm. Matmenys atskirai patikslinti iš pradinio vienetų apsirikimo. Gipso pakelio kaina/masė ir kibiras šeimai nepatvirtinti; dažų kiekis ir savikaina nežinomi. Rinkinių kainos nepakeistos.

Modelis: DTC LT/PL/LV/EE ir Europos reseller didmena. Savininko patvirtintas išsiuntimo ir grąžinimo adresas Lietuvoje — Molynės g. 2C, Vilnius 02211. Šis adresas savaime nepatvirtina juridinio registracijos adreso ar vežėjo sąlygų. Pilna BOM, klasifikacija/sauga, pakuočių EPR, PVM/SVS/EX ir carrier sąlygos nepatvirtintos. Nereikšti fiktyvių atsargų, reviews, baby produkto ar teiginių apie klientų skaičių.

Ankstesnis 2026-10-11 tyrimas: 4 šalys volume ir validated SERP, 0,3724 USD iš konkrečiai autorizuoto 1 USD. LT pagrindinis kit query 170, PL1000 vid./mėn., latest data2026-08; null LV/EE ≠0. Raw source saugomas lokaliai, ne Git. Paklausa užsakymams/reorder dar nematuota.

Mokamas rezultatas: tikras rinkinys su vietine instrukcija ir įvykdytu pristatymu. Plėtrą matuoti įvykdyto užsakymo marža, broku/refund, partnerio apmokėjimu ir pakartotiniu užsakymu, ne tekstų/agentų kiekiu.


## Savininko patikslinta apskaita ir rekvizitai · 2026-10-15

Juridinis registracijos adresas: Pupinės g. 10-55, Vilnius, Lietuva. Tai atskira paskirtis nuo išsiuntimo / grąžinimo Molynės g.2C. Pašto kodas naujame patvirtinime nepateiktas ir nepridėtas iš spėjimo.

Pradinei LT prekybai pasirinkta paprasta poros ir šeimos rinkinių kibirų apskaita. Po999 yra savininko nustatytas laikinas apskaitos kiekis, ne fizinio perskaičiavimo ar žaliavų patikros įrodymas. Šiems dviem produktams lotTrackingRequired:false; partijų, galiojimo datų ir BOM forma nereikalinga. Kitų parduotuvių partijų režimas nekeičiamas.

Tikra produkcijosD1 priėmė2produktų katalogo revizijas ir2optimistines/idempotentines likučio korekcijas. Po operacijos abiejų available999; finished_lots/finished_allocations/orders0. Tai inventory priėmimas; checkout tebėra atskirai uždarytas iki tikro mokėjimų ir pristatymo prijungimo. PL/LV/EE prekybos kainos ir pristatymas dar neautorizuoti, todėl aktyvūs produktų prices tik LT32/48EUR.

Siųsk pigiau integracija jau egzistuoja Sendparcelv1 adapteryje. Godos2026-10-12 IT laiškas patvirtina password APIkeyheader, atskirusstaging/productionraktus, v1quotes→product.id→product_id, vienąužklausąpersekundę ir20min kainos laiką. API key ir tikrų paslaugų/kainų priėmimas dar nepatvirtintas. Laiško protokolo patvirtinimas nėra sukurta ar apmokėta siunta.


## Patikrintas Stripe ryšys ir dokumentų adresas · 2026-10-15

Savininkas pakeitė dedikuotą Stripe LIVE raktą. Tikra paskyros patikra ir svetainės serverio atsakymas patvirtina MB Memocasting LIVE ryšį; senasis atskleistas raktas nebegalioja. Naujas raktas ir gavėjo paslaptis saugomi tik privačiai. Tai patvirtintas ryšys, o ne atliktas mokėjimas.

Oficialioje Lietuvos pašto paieškoje Pupinės g. 10, Vilnius grąžintas vienas rezultatas — 02206. Savininko patvirtintas butas55 išsaugotas. Registracijos adresas dokumentams normalizuotas kaip LT, Pupinės g.10-55, Vilnius02206; Molynės g.2C, Vilnius02211 tebėra atskiras išsiuntimo/grąžinimo adresas. Šaltinis https://www.post.lt/pasto-kodu-ir-adresu-paieska, faktinis UI rezultatas ir ekrano kvitas išsaugoti privačiai.

Siųsk pigiau API užklausa IT specialistei išsiųsta; šio tikrinimo metu naujo atsakymo ar rakto negauta. Pristatymas ir galutinis užsakymų priėmimas tebėra išjungti. Operacijų bei dokumentų leidimai neįjungti vien dėl Stripe ryšio.
