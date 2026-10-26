# Memocasting Europos logistika ir užsakymų automatizavimas

2026-10-21. Papildo [kainodaros / partnerių tyrimą](PRICING_RESEARCH_2026_10_21.md). Savininko tikslas: jis gamina ir parduoda pats, atsargas pristato užsienio sandėliui, šis vykdo užsakymus. Klientai turi gauti prekes per ne daugiau kaip 4 darbo dienas; plane tai vertinama nuo priimto apmokėto užsakymo, su aiškia dienos užsakymų riba. Joks toks pažadas svetainėje šiuo darbu neįjungtas.

## Siūlomas modelis

**Memocasting tiesioginė prekyba + išorinis užsakymų vykdymas (3PL)**. Prekės ir santykis su pirkėju lieka tavo verslui; sandėlis teikia logistikos paslaugą ir neperka tavo 20 rinkinių perparduoti. Tai skiriasi nuo šalies platintojo, kuris pats nuperka atsargas ir parduoda savo vardu.

Vedėjų kanalas tinka kartu: jie renginiuose kuria paklausą ir gauna sutartą atlygį už priskirtus įvykdytus pirkimus, o tavo sandėlis išsiunčia. Kitas variantas – vedėjas perka rinkinius savo paslaugai. Tiems patiems vienetams nemokėti ir pilnos perpardavimo maržos, ir automatiškai visų affiliate komisinių.

Pradėti nuo LT gamybos / rezervo ir **vieno bandomojo ES sandėlio**, pasirinkto pagal tikrų pirkėjų geografiją ir terminus. DE yra kandidatas Vokietijos paklausai, PL – alternatyva kai jos pasiūlymas patvirtina maršrutus. Šalis nėra savaime geriausia dėl žemėlapio centro. Sandėlis kiekvienoje šalyje pradžioje suskaidytų nedidelę atsargą, padaugintų apskaitą ir papildymus. Antrą vietą pridėti tik ten, kur pirmoji nebeatitinka termino arba ekonomikos.

Europa nėra vien ES: UK, Šveicarijos, Norvegijos ir kitus muitinės / mokesčių maršrutus vertinti atskirai. Iš DE negalima žadėti 4 darbo dienų visam žemynui.

## Trijų variantų palyginimas

| Modelis | Kas išlieka tavo darbas | Privalumas | Ką reikia patvirtinti |
| --- | --- | --- | --- |
| Viskas iš LT | Gamyba, paruošimas, išsiuntimas ir grąžinimai | Mažiausiai suskaidytų atsargų ir užsienio administravimo | Kiekvieno maršruto bendras terminas ir kaina 2,2 / 4,5 kg siuntoms |
| LT + vienas ES 3PL | Gamyba, papildymas, pardavimai ir išimtys | Vietinis / regioninis išsiuntimas, vienas pilotas | 20 vnt. priėmimas, tikras SLA, API, visos sąnaudos ir mokesčių režimas |
| Keli 3PL sandėliai | Gamyba, atsargų paskirstymas ir daugiau apskaitos | Galima priartinti atsargas prie konkrečių pirkėjų | Pardavimų tankis, papildymo pajėgumas, kiekvienos šalies pareigos ir pelningumas |

Vienas profesionalas gali aptarnauti kelias šalis iš vieno sandėlio, bet tai neįrodo vienodo pristatymo laiko. Lokalizuotų svetainių skaičius neprivalo sutapti su sandėlių skaičiumi. Pirma galima viena daugiakalbė parduotuvė, vėliau vietiniai domenai pagal verslo poreikį.

## Keturių darbo dienų tikslas

Bendras laikas = užsakymo / mokėjimo priėmimo laukimas + paruošimas + laukimas iki vežėjo paėmimo + vežimas iki gavėjo. Užsakymas po dienos ribos, savaitgalis ir vietinė šventė gali perkelti pradžią. Rodyti tikrą numatomą gavimo datą pagal šalį, pašto kodą, atsargą ir kalendorių; jei skaičiavimas neatitinka 4 d. d., to pažado nerodyti.

DPD LT nurodo, kad standartinis užsakytas paėmimas vyksta kitą darbo dieną, paėmimo diena laikoma nuline, o terminai yra preliminarūs. Puslapyje yra pašto kodų skaičiuoklė. Vadinasi „4 d. d. tranzitas“ nėra automatiškai „4 d. d. nuo pardavimo“. Konkrečių LT → DE / FR / ES adresų skaičiavimai šiame tyrime negauti ir neįvardijami kaip patikrinti. LV / EE vieši 1–2 d. d. laikai taip pat neapima visų mūsų užsakymo etapų. [DPD LT pirminis šaltinis](https://www.dpd.com/lt/lt/pagalba/naudingi-patarimai/pristatymo-terminai/).

Būsimas sandėlio susitarimas turi apimti užsakymų dienos ribą, tos pačios / kitos darbo dienos išsiuntimą, konkrečius kurjerio produktus ir pašto kodus, švenčių / sezono išimtis, praradimą / vėlavimą ir reagavimą. „Išsiunčiame tą pačią dieną“ nereiškia „pristatome tą pačią dieną“. Siūlomas vidinis tikslas – bent 95 % užsakymų pristatyti per 4 darbo dienas, bet tai mūsų bandymo kriterijus, ne jau įrodytas rezultatas ar garantija.

Prieš reklaminį paleidimą atlikti reprezentatyvias kontrolines siuntas su tikrais gavėjais ir leidimu apmokėti siuntimą, matuoti priėmimą → perdavimą → pirmą kurjerio skenavimą → pristatymą. Pradinis mažas bandymas patikrina kelią, bet neįrodo viso sezono 95 % patikimumo. Stebėti p95 ir vėlavimų dalį tęstinėje prekyboje; turėti brangesnį express pasirinkimą ten, kur jis realiai padengia terminą, o ne neribotą bendrą pažadą.

## Pirminiai sandėlių kandidatai

2026-10-21 vieši tiekėjų duomenys, ne gauti pasiūlymai ir ne nepriklausoma paslaugų kokybės patikra. Su tiekėjais nesusisiekta ir sutartys nesudarytos.

| Kandidatas / šaltinis | Viešai matoma | Ribos Memocasting bandymui |
| --- | --- | --- |
| [FLEX](https://www.flexfulfillment.eu/de/) | Starter 0 EUR/mėn.; apdorojimas 1,49 EUR / užsakymui su medžiagomis; 14,99 EUR/m³/mėn.; DE / FR / PL sandėliai, API ryšiai pagal užklausą | Kurjeris atskirai; tikslios 20 vnt., sandėlio minimumo, medžiagų dydžio ir custom API sąlygos nepatvirtintos. Tiekėjas nurodo tipinį 100+ užsakymų/mėn. profilį |
| [StartFill](https://startfill.com/pricing/) | Lite: 1,70 EUR pirmam vienetui, medžiagos nuo 0,48 EUR, priėmimas 0,39 EUR, 22,90 EUR/m³/mėn.; skelbia be mėnesio / užsakymų minimumo | **Mažiausiai 1 m³ sandėliavimo**; kurjeris papildomai; standartinis išsiuntimas 1–2 d. d. Individualaus mūsų dydžio ir API pasiūlymo nėra |
| [Quivo](https://quivo.co/faq/) | DE / AT / FR tinklas; mokama programinė įranga, fulfillment ir siuntimas skaičiuojami atskirai; DE puslapyje 85 EUR startas | 1,90 EUR pirmo pick pavyzdys nėra visas mūsų pristatymas; mažos partijos, SLA ir tikra programos kaina tikslintinos |
| [Omnipack](https://omnipack.com/pricing) | PL vykdymas, individuali kainodara pagal kiekį / prekes / maršrutus; [viešai aprašytas API](https://omnipack.com/pl/) | Nėra patvirtintos 20 vnt. kainos ar minimalaus užsakymų kiekio. Puslapio terminų reklama nėra mūsų SLA |

Mažam pilotui pirmiausia verta tikslinti FLEX ir StartFill rašytinį pasiūlymą, lyginti ne antraštinį pick mokestį, o visą vieneto kainą ir terminą. StartFill 1 m³ minimumas aiškiai rodo, kodėl „be minimalaus užsakymų skaičiaus“ nereiškia „jokių minimalių sąnaudų“. Didesnio srauto atveju į palyginimą įtraukti Quivo / Omnipack. Nė vienas čia dar nepasirinktas vykdymui.

## 20 vienetų ir tikros sąnaudos

Patvirtinta supakuoto poros rinkinio siunta 2,2 kg / 20×20×17 cm, šeimos 4,5 kg / 25×25×20 cm. **20 poros rinkinių = 44 kg ir 0,136 m³**, šeimos 20 = 90 kg ir 0,250 m³, dar prieš didesnę transportavimo dėžę / paletę bei tarpelius. Būtina patvirtinti, ar dabartinė dėžė gali būti transportinė: neapmokestinti abiejų pakuočių kaip to paties veiksmo, bet neišmesti tikrai reikalingos išorinės apsaugos.

20 vnt. laikymas nėra 20 pardavimų per mėnesį prognozė. 20 rinkinių prie 5 pardavimų per dieną baigiasi per 4 dienas. Papildymo taškas = pardavimai per dieną × visas gamybos / atvežimo / priėmimo laikas + saugos atsarga. Saugos dydį ir papildymo partiją nustatyti pagal faktinį pardavimą bei atsargų priėmimą; kurjerio pristatymas sandėliui dar nereiškia, kad jo WMS jau leidžia parduoti atsargą.

XLSX „Sandėlis“ pateikia vieno poros rinkinio užsakyme pavyzdį: 20 vnt. partija, 20 užsakymų/mėn., partijos atvežimas 40 EUR, DE kurjeris 4,50 EUR, LT kurjeris 9 EUR, LT papildomas paruošimas 0,50 EUR, neto pristatymo įplaukos 4 EUR, užsienio administravimas 50 EUR/mėn. **Visi šie dydžiai yra prielaidos, ne tiekėjų tarifai.** StartFill vieši baziniai paslaugų dydžiai imami atskirai; jų atitikimas šiam produktui dar nepatvirtintas. Vienkartinis API parengimas / mokesčių registracija neįtraukti.

Pagal šį pavyzdį LT logistika 9,50 EUR / užsakymui, DE 3PL 12,715 EUR, įskaitant mėnesio sąnaudų paskirstymą. Tokiomis prielaidomis 20 užsakymų/mėn. **DE nėra pigesnis**. Fiksuotų sąnaudų atsipirkimo kiekis apie 170 užsakymų/mėn., jei vieneto tarifai ir 20 vnt. partijos atvežimo kaina liktų tokie patys. Tai matematinė jautrumo riba, ne universalus 3PL apsimokėjimo slenkstis: tikros kainos, didesnės partijos ir laiko sutaupymas rezultatą keičia. 3PL gali būti pasirenkamas dėl termino, net jei nėra pigesnis.

Visos neto sumos turi būti perskaičiuotos pagal realią tiekėjo sąskaitą ir PVM atskaitos teisę; neatskaitomas PVM padidina kaštą. Esant 44,90 EUR mažmenai, šiame vienodų augimo prielaidų modelyje lieka apie 9,57 EUR siunčiant iš LT ir 6,36 EUR per DE iki kitų pastovių sąnaudų. Tai nėra grynasis pelnas ar patvirtinta Vokietijos mokesčių schema.

## Mokesčiai ir pardavėjas

Įprastame PVM režime savo atsargų perkėlimas ir laikymas kitoje ES šalyje gali sukurti vietinės PVM registracijos, judėjimo ir deklaravimo pareigas. Pardavimas DE sandėlis → DE pirkėjas yra vietinis sandoris, o DE → FR gali būti tarpvalstybinis B2C sandoris. **Vien OSS savaime neišsprendžia visų sandėlio šalies prievolių.** Komisija nurodo, kad OSS deklaracija nepakeičia vidaus PVM deklaracijų; oficialiame mokesčių administratoriaus pavyzdyje atskirti DE vietiniai ir kiti ES pardavimai. [Komisijos OSS aprašymas](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en), [AADE vadovo 25 psl. pavyzdys](https://www.aade.gr/sites/default/files/2024-02/guide_Commerce_en_2023_0.pdf).

Memocasting patvirtinta kaip LT ne PVM mokėtoja; tai nėra automatiška teisė ignoruoti atsargų užsienyje pareigas. Nuo 2025 m. veikianti tarpvalstybinė SME / EX schema kai kurioms tinkamoms įmonėms leidžia taikyti atleidimą ir kitose šalyse po procedūros. **Neatlikta konkreti Memocasting teisės į šią schemą, atsargų judėjimo ir galimų registracijų analizė.** Prieš išvežant atsargas turi būti patvirtintas taikomas režimas, ne vien įjungtas svetainės PVM procentas. [Komisijos tarpvalstybinė SME schema](https://sme-vat-rules.ec.europa.eu/sme-scheme/cross-border-sme-scheme_en). Tai veiksmų priklausomybė, ne išvada, kad būtina steigti naują įmonę kiekvienoje šalyje.

## Automatizavimo projektas

1. Viena serverinė užsakymų sistema; veikia ir išjungus savininko PC. Lokalizuotos parduotuvės naudoja tą patį produkto identitetą ir aiškų pardavėją.
2. Apmokėjimas patvirtinamas tikru serverio mokėjimo įvykiu; naršyklės sėkmės langas ar Session sukūrimas nepatvirtina pinigų. Rezervavimas ir atšaukimo taisyklės atskiria neapmokėtus užsakymus nuo išsiųstinų.
3. Parenkamas vienas sandėlis pagal tikrą parduodamą atsargą, šalį, pašto kodą, terminą ir kaštą. Pradžioje neskaidyti vieno užsakymo per kelis sandėlius be būtino pagrindo.
4. Į eilę įrašoma viena vykdymo užduotis su stabiliu order / fulfillment ID. 3PL API sukuria vieną užsakymą; laiko limito atveju pirmiausia ieškoma to paties užsakymo, kad neatsirastų antras siuntinys.
5. Sandėlis grąžina priėmimo, surinkimo ir tracking būsenas. Etiketės sukūrimas nėra fizinis išsiuntimas. Jeigu 3PL pats užsako kurjerį, tam pačiam užsakymui papildomai nekurti LT SiųskPigiau siuntos.
6. Tracking ir tikri vėlavimai atnaujinami kliento paskyroje / laiške. Automatinis stebėjimas aptinka nepasiimtą, sustojusią ar vėluojančią siuntą; išimtis mato žmogus.
7. Likučiai derinami pagal sandėlį ir SKU / instrukcijos kalbą: received, available, reserved, shipped, return-quarantine. Negalima visose šalyse naudoti bendro laikino 999 kaip fizinio likučio.
8. Grąžinimai priimami pagal instrukciją, patikrinami, tik tada grąžinami į parduodamas atsargas arba atskiriami. Refundo momentas, klientų teisės ir sandėlio fizinis priėmimas nėra vienas įvykis.
9. Papildymui sistema siūlo partiją pagal pardavimo tempą ir lead time; gamybą, finansavimą bei naują mokamą transportą tvirtina nustatyta operacinė tvarka. DI nepadaro fizinio rinkinio ir neišsprendžia broko be žmogaus.

Automatizuoti galima didžiąją dalį duomenų perdavimo, užsakymų, tracking ir papildymo signalų. Gamyba, sandėlio išimtys, kokybė, skundai ir mokesčių kontrolė išlieka atsakomybės. Šiame darbe nepatikrinta, kad visas šis daugiasandėlis vykdymas jau veikia esamoje sistemoje.

## Tikslus būsimos užklausos sandėliui turinys

Du SKU, aukščiau pateikti matmenys / svoriai, pradinė 20 vnt. partija, realistiškai nežinomas mėnesio srautas; paprašyti atskirų 20 / 100 / 300 užsakymų scenarijų. Tikrinti: priėmimą, mažiausią apmokestinamą tūrį / sąskaitą, pick, transportinę pakuotę, 2,2 ir 4,5 kg vidaus bei regioninį siuntimą, kuro / sezono / atokių zonų priedus, grąžinimus, likučių išvežimą, API dokumentaciją / kainą, užsakymų ribą, mokėjimą, duomenų sutartį, prekių priimtinumą ir reikalingus medžiagų dokumentus. Produktų miltelių / dažų priimtinumo ar nepavojingos klasifikacijos neišgalvoti.

Tikras priėmimas: rašytinė 20 vnt. galimybė, mūsų produktui apskaičiuota visa kaina, taikomas mokesčių režimas, dokumentuota integracija ir tikra end-to-end kontrolinė siunta. Šio tyrimo kainų lentelė nėra toks priėmimas.

## Būsena

Perskaityti pirminiai tiekėjų ir mokesčių šaltiniai, sudarytas matematinis modelis ir tikslūs klausimai. Stripe Directory skill pritaikytas prieš provider atranką: portable CLI 1.54.1 / directory 0.3.5 paieška atmesta su `Invalid user agent`; ribojimas neapeitas, naudotas viešų pirminių šaltinių fallback. Treg katalogas šiai logistikos užklausai tikslaus semantinio atitikimo nerado; netinkamas Shopping įrankis nevykdytas. Mokamų calls, provider paskyrų, sutarčių, laiškų, atsargų perkėlimo ar siuntų šiame darbe nebuvo. Šaltinių kainos / sąlygos tikrinamos iš naujo prieš tikrą sutartį.
