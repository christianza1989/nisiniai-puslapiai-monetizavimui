# Fasado pastolių nuomos užklausos testas

Sprendimas 2026-10-03, prieš dizainą, mediją ir kalendorių. Perskaityta visa pateikta 2026-10-01 analizė; ji yra hipotezių įvestis, ne veikiančios nuomos įmonės aprašas. Originalas nekeistas, SHA ir tikra skaitymo data INPUT-PROVENANCE.json.

Pasirinkimas: M1 – būsimas tiekėjo mokėjimas už jo sutartus kriterijus atitinkančią, nedubliuotą nuomos projekto užklausą. Pirmas pirkėjas: individualaus namo savininkas Vilniuje arba Vilniaus rajone, pats sprendžiantis dėl planuojamų fasado darbų pastolių nuomos. Jo mokamas rezultatas yra tinkamai parinkta nuoma, galbūt su transportu ir profesionaliu montavimu; tiekėjo sutarties suma nėra mūsų pajamos. Mūsų galimas mokėtojas – patikrintas nuomotojas, kuriam tokia užklausa turi papildomą komercinę vertę. Mokėjimo dydis, kriterijai ir pats noras mokėti dar nežinomi. Tai laikinas geriausiai pagrįstas testas, ne patvirtintas verslas.

Viešas veiksmas: žmogus pateikia tikrą planuojamos nuomos vietovę, numatomą pradžią/trukmę, fasado matmenis arba nežinomybę ir reikalingų paslaugų apimtį MB Pinet. Tai išankstinis poreikio tyrimas, be likučio, rezervacijos, sąmatos, atvykimo, terminų ar vykdytojo pažado. Duomenys automatiškai tiekėjams nesiunčiami. Perdavimas konkrečiam vėliau atsiradusiam vykdytojui būtų atskirai suderintas. Kol peržiūra vietinė, formoje tik sintetiniai duomenys ir SMTP OFF.

## Nauji rinkos įrodymai ir jų ribos

Visi žemiau esantys pirminiai puslapiai perskaityti 2026-10-03. Ekranų patikra bus atskirai užfiksuota DESIGN.md; nuomotojų vieši pažadai nėra mūsų pajėgumas.

- [Tvirtas sukibimas](https://tspastoliai.lt/fasadiniu-pastoliu-nuoma/) siūlo fasadinius pastolius ir papildomą logistiką/montavimą. Poreikiui prašo objekto matmenų, laikotarpio ir vietos. Viešas „nuo 0,60 + PVM“ neturi aiškaus ploto/laiko vieneto, todėl netinka mūsų kainoraščiui ar skaičiuotuvui. Paprastas sienos plotas nėra patikima techninės komplektacijos taisyklė.
- [Pilaitės pastoliai](https://www.pilaitespastoliai.lt/paslaugos/) skiria dienos nuomą, transportą ir montavimą bei siūlo nemokamą vadybininko pagalbą. Montavimo „nuo“ tarifas nėra nuomos įkainis. Tai reikšmingas prieštaravimas mokamai mūsų konsultacijai ir lead kainai: galimas pirkėjas jau gali kreiptis tiesiogiai.
- [Paslaugos.lt nuomos kategorija](https://paslaugos.lt/pastoliu-nuoma) rodo datuotas rugsėjo pabaigos nuomos užklausas su laikotarpiu ir transporto poreikiu. Kategorijoje yra ir pirkimo užklausų; bendras skaičius nėra mėnesinis nuomos srautas. Nepriklausomai nepatikrinti jų autentiškumas, realizacija ar pasirengimas mokėti mums. Asmenų vardai ir tikslūs adresai nekopijuojami.
- [Bark kainodara](https://www.bark.com/en/gb/sellers/pricing/) yra užsienio pasirinktinio mokėjimo kreditais už kontaktą pavyzdys; [scaffolding kategorija](https://www.bark.com/en/gb/scaffolding/) renka projekto poreikį. Tai M1 mechanizmo egzistavimo įrodymas, ne Lietuvos pastolių tiekėjo mokumo ar mūsų kainos įrodymas. Mūsų projektas nežada automatinio pasiūlymų palyginimo.
- [STR domestic scaffolding](https://strscaffolding.co.uk/domestic-scaffolding) tiesiogiai namų savininkams pateikia apžiūra ar nuotraukomis paremtą bendrą montavimo, nuomos ir išmontavimo pasiūlymą. Perimame apimties aiškumą; neperimame UK kvalifikacijų, draudimo, licencijų ar atvykimo terminų.
- [Transrifus nuomos taisyklės, 2024 PDF](https://www.transrifus.lt/documents/Pastoli%C5%B3%20nuomos%20taisykl%C4%97s%20%28kai%20montuoja%20Nuomotojas%29%202024.pdf) rodo, kad priėmimas, perstatymas, grąžinimas ir valymas gali turėti savas sąlygas. Tai konkretaus nuomotojo sutartis, ne universalios ar mūsų taisyklės; jos tarifai nekopijuojami.
- [VDI 2023 kontrolinis klausimynas](https://vdi.lrv.lt/media/viesa/saugykla/2023/12/wzrBu4Hhyn4.pdf), darbo aukštyje dalis, akcentuoja projektą, priežiūrą ir specialiai apmokytus darbuotojus. Todėl mūsų plotų ruošinys nėra montavimo projektas, saugos patikra ar dalių sąrašas. Aktualų konkretaus objekto teisinį ir techninį vertinimą atlieka vykdytojas. HSE UK puslapis perskaitytas kaip papildomas rizikos kontekstas; UK taisyklės į Lietuvą neperkeltos.

## Alternatyvos ir pasirinkimo priežastis

M2 atlygis po faktiškai apmokėtos nuomos: mažiau netinkamų lead ginčų, bet sudėtinga atribucija, grąžinimų ir pardavimo atsekamumas. Tai atsarginis modelis, jei tiekėjai atsisakytų M1 ir sutiktų atsekti realią sutartį. M3 tiesioginė nuoma: realus mokėtojas yra savininkas, tačiau reikia patvirtintos įrangos, saugaus vykdymo, sandėliavimo, brigados, transporto ir atsakomybės; šiandien jų neturime. M4 mokamas PDF/matavimo konsultacija ar reklaminė leidyba: nemokamas tiesioginių tiekėjų konsultavimas mažina vertę, konkretaus mūsų mokėtojo nėra. Gidai čia padeda nuomos sprendimui, jų skaitymas nevadinamas paslaugos paklausa.

M1 paprasta patikrinti atskirai nuo vykdymo investicijos, tačiau Lietuvoje dar neįrodytas. Prieštaraujantys įrodymai: stiprus tiesioginis vietinių nuomotojų kanalas, nemokama pagalba, platformų konkurencija, rangovas dažnai jau organizuoja pastolius, geografinė logistika bei sezonas. Atsisakysime M1, jei tiekėjas nematys papildomos vertės arba tikri pirkėjai jau turės rangovo sprendimą. Konkretus rašytinis M2 sutarimas pakeistų pasirinkimą. Patvirtintas nuosavos nuomos pajėgumas ir pilna ekonomika galėtų pagrįsti atskirą M3 etapą.

## Vykdymas ir ekonomika

Viešai rasti nuomotojai yra galimi tyrimo kandidatai, ne partneriai. Prieš bet kokį perdavimą reikėtų patikrinti teritoriją, profesionalų montavimą, įrangos priežiūrą, sutartį, duomenų gavimą ir užklausos apmokėjimo kriterijus. Nei laiškai, nei skambučiai, nei registracija neįjungti. Šio darbo metu domenas, DNS ir nuomos paslauga neperkami.

Vieno gauto poreikio tikėtina įmoka: a·p·L·(1−r) − c − a·h, kur a tinkamų priimtų užklausų dalis, p mokėjimo tikimybė, L mūsų atlygis, r grąžinimų dalis, c įsigijimo sąnaudos, h tvarkymo sąnaudos. Visi dydžiai nežinomi. Fiksuotos sąnaudos F ir lūžio N = ceil(F / teigiama vienetinė įmoka) taip pat nežinomi; jei vardiklis neteigiamas, apimtis problemos neišsprendžia. Nei tiekėjo viešas tarifas, nei užsienio kreditai neužpildo šių nežinomų dydžių. ImageGen, agento laikas, hostingas ir paštas be tikros sąskaitos nevadinami nemokamais.

## Bandymas ir plėtros vartai

Siūlomas 8 savaičių intervalas prasidėtų tik nuo veikiančio tikro kontakto ir savininko patvirtinto paleidimo. Tinkama užklausa turi regioną, realius fasado darbus, laikotarpį, savarankišką nuomos sprendimą ir paslaugų apimtį; nežinomi matmenys leidžiami, bet nekeičiami fiktyviais. Atskirai matuoti tinkamumą, nedubliavimą, tiekėjo priėmimą, jo mokėjimą, grąžinimus ir visas sąnaudas. Siūlomi, ne rinkos norminiai vartai: ≥10 tikrų tinkamų poreikių, rašytinis bent vieno mokėtojo susitarimas, ≥3 negrąžinti mokėjimai ir teigiama įmoka po visų išmatuotų sąnaudų. Darbo saugos/vykdymo bei teisės vartai būtini prieš paslaugos plėtrą. Paspaudimai, sintetiniai D1 ir Lighthouse nelaikomi šiais rezultatais.
