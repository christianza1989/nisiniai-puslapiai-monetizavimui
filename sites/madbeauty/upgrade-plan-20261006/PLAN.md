# Madbeauty platformos tobulinimo planas

2026-10-06. Parengta pagal savininko prašymą peržiūrėti platformą, Treatwell pavyzdžius ir Fresha bei suplanuoti pilną atnaujinimą. **Šio paketo rezultatas yra auditas, katalogo pasiūlymas ir įgyvendinimo planas. Čia aprašyti atnaujinimai dar neįdiegti.** Dabartinės platformos šaltinio bazė: `c6516b7`; gyvas paieškos pataisymas: Workers versija `402a0fb5-bd02-4a78-8a3b-de083aeb68e8`.

## Pagrindinis sprendimas

Madbeauty reikia išplėsti iš dešimties plokščių paslaugų tipų į nuoseklų procedūrų katalogą, kurį naudoja klientų paieška, meistrų paslaugų redaktorius, rezervavimas ir operatoriaus administravimas. Vien didesnis dropdown neišspręstų paslaugų variantų, skirtingų kainų, komandos kompetencijų ir tikrų laisvų laikų klausimo. Pirmas atnaujinimo etapas turi sujungti visą kelią: meistras pažymi procedūras → nustato pasiūlymus ir grafiką → klientas randa tinkamą variantą ir laiką → užregistruoja vizitą → abi pusės mato tą patį patvarų užsakymą.

Išlaikome dabartinę Madbeauty juodos, baltos ir violetinės spalvų tapatybę, esamą rezervavimo branduolį ir nemokamo piloto modelį. Fresha ir Treatwell naudojame funkcijų ir vartotojo kelio tyrimui. Konkurentų medijos, klientų duomenų, prekės ženklų ar tekstų į mūsų katalogą neperkeliame.

Pilnas katalogo pasiūlymas yra [TAXONOMY_PROPOSAL.json](TAXONOMY_PROPOSAL.json), o ieškoma jo peržiūra — [index.html](index.html). Darbai su priklausomybėmis ir priėmimo kriterijais pateikti [BACKLOG.json](BACKLOG.json). Šaltiniai ir audito ribos — [AUDIT.md](AUDIT.md).

## Ką nustatė platformos peržiūra

| Sritis | Dabartinis įrodymas | Reikalingas patobulinimas |
|---|---|---|
| Paslaugų katalogas | Kode yra 10 plokščių tipų, gyvame `/paslaugos` matomos tos pačios grupės | Kategorijos, subkategorijos, procedūros, sinonimai, versijos ir archyvavimas |
| Paslaugų pasirinkimas | Meistras po vieną kuria paslaugą, parenka vieną iš 10 tipų | Ieškomas medis, kelių procedūrų pasirinkimas ir išsaugomas juodraštis |
| Pasiūlymo detalės | Kaina, trukmė, buferiai, priedai, vienas meistras ir resursas jau yra | Vienas pasiūlymas su variantais, keli tinkami meistrai, jų kainos, meniu grupės |
| Miestai | Ankstesne pataisa sujungti visi 103 miestai paieškoje, paskyrose, serveryje ir Workers maršrutuose | Greita paieška be diakritikos, gyvenvietės / rajonai, adresai, patogesnis kategorijos puslapis |
| Paieškos laikas | Kortelė gauna laikus, tačiau katalogas pirmiausia filtruojamas pagal miestą ir tipą | Rezultatų atranka ir rikiavimas pagal tikrą viso pasirinkto vizito laisvumą |
| Paieškos tekstas | Paprastas pavadinimo fragmento palyginimas | Sinonimai, procedūrų ir profilių atskyrimas, aiškus kategorijos kelias |
| Žemėlapis | Vietų schema, be realaus geografinio žemėlapio | Patvirtinti adresai ir koordinatės, tikri atstumai, sąrašo ir žemėlapio ryšys |
| Rezervavimas | Laikinas laiko laikymas, patvirtinimas, perkėlimas, atšaukimas, konfliktai ir snapshot jau įgyvendinti | Kelių paslaugų seka, procedūros fazės, keli resursai ir variantų kompetencijos |
| Paskyros ir bendravimas | El. pašto prisijungimas, vizitai, žinutės, užklausos, laukiančiųjų sąrašas yra | Pakartotinis vizitas, pranešimų nustatymai, patikrinti priminimai, automatiniai laukiančiųjų pasiūlymai |
| Meistro darbo vieta | Kalendorius, grafikas, komanda, resursai, galerija, klientų sąrašas, vizitų suvestinė yra | Darbuotojų prieigos, keli adresai, masinis importas, aiškesnės klientų kortelės ir veiklos rodikliai |
| Integracijos | Profilio nuoroda ir išorinio prijungimo informacija | Realus kalendoriaus importas / sinchronizavimas, kai apibrėžta konflikto taisyklė |
| Operatorius | Profilių revizijų ir atsiliepimų patvirtinimas, skundai, pristatymo eilė yra | Taksonomijos valdymas, naujų procedūrų prašymai, paslaugos tinkamumo patikra |
| Duomenų saugojimas | Pilotinis bendras Durable Object, visa platformos būsena viename JSON; kode 1 MiB šio JSON riba | Normalizuotas modelis, indeksuojama katalogo projekcija ir organizacijų rezervavimo koordinavimas |
| Komercinės funkcijos | Platformos mokėjimai neįjungti | Avansai, mokėjimai, kuponai ir lojalumas kaip atskiras vėlesnis verslo etapas |

Tai nėra teiginys, kad platforma neveikia. Esamas branduolys suteikia pagrindą plėtrai. Dabartiniai ribojimai reiškia, kad išsamus katalogas turi būti įgyvendintas kartu su pasiūlymo modeliu ir paieška. 1 MiB yra kodo nustatyta pilotinė riba; jos pasiekimas ar reali apkrovos problema šiame audite nenustatyti.

Peržiūrėtas gyvas viešas Madbeauty katalogas ir konkretūs serverio bei UI failai. Naujas pilnas prisijungusių rolių produkcinis bandymas šiame planavimo darbe neatliktas. Ankstesni priėmimai naudojami kaip istoriniai įrodymai, o ne kaip automatinis būsimų atnaujinimų PASS. Ankstesnio dropdown paketo naršyklės 390 px pakeitimas neįsigaliojo; jis nelaikomas to paketo mobilios peržiūros įrodymu.

## Ką pritaikome iš konkurentų

Gyvai apžiūrėtame Fresha paieškos meniu buvo atskiri procedūrų, vietų ir profesionalų tipai bei platus sričių sąrašas. Apžiūrėtame salono profilyje paslaugos suskirstytos į salono sukurtas grupes, pateiktos trukmės, kainos, komanda, darbų galerija ir rezervavimo veiksmai. Mums tai reiškia atskirus paieškos rezultatų tipus ir atskiras salono meniu grupes. [Fresha paieška](https://www.fresha.com/), [apžiūrėtas viešas profilis](https://www.fresha.com/en-GB/a/krem-i-dotyk-warszawa-ryzowa-45a-xez9fzx9).

Oficiali Fresha dokumentacija aprašo paslaugų variantus su savo kaina bei trukme ir skirtingą kainodarą pagal komandą ar vietą. Madbeauty modelyje vieną bendrą procedūrą susiesime su meistro pasiūlymu ir jo variantais; klientui prieš registravimą turi būti aišku, ką jis pasirinko. [Variantų dokumentacija](https://www.fresha.com/help-center/knowledge-base/catalog/75-create-service-variants).

Fresha katalogo dokumentacija atskirai nagrinėja paslaugas, priedus, paketus, meniu kategorijas, jų tvarką ir masinį redagavimą. Šias funkcijas įtraukiame atskiromis darbų grupėmis. Fresha vidinio meistro redaktoriaus šiame darbe neprisijungus neapžiūrėjome. [Oficialus paslaugų katalogo žinynas](https://www.fresha.com/help-center/knowledge-base/catalog).

Paslaugos prieinamumas Fresha dokumentacijoje siejamas su meistro pamaina, vieta ir reikalingais resursais. Madbeauty taip pat turi vertinti jų bendrą intervalą, o paslaugos darbo dienų taisykles pridėti prie esamo grafiko. [Prieinamumo taisyklės](https://www.fresha.com/help-center/knowledge-base/catalog/100643-limit-online-service-availability).

Treatwell svetainė ir savininko septyni meniu vaizdai rodo Lietuvos rinkai suprantamas grupes: plaukai, nagai, depiliacija, masažas, veidas, kūnas, vyrams. Pritaikome lengvai atpažįstamą lietuvišką navigaciją ir aiškias procedūras. „Vyrams“ laikome auditorijos filtru bei redakcine atranka, kad vienas kanoninis procedūros ID neliktų dviejose kategorijose. [Treatwell Lietuva](https://www.treatwell.lt/).

Platus Fresha sričių sąrašas pats savaime neįrodo, kad Madbeauty dabar turi pradėti teikti medicinos, odontologijos ar gyvūnų paslaugas. Joms katalogo struktūra šiame plane numatyta, tačiau įjungimui reikia konkretaus paslaugos modelio, tinkamų teikėjų ir atitinkamų duomenų bei prieigos taisyklių.

## Nauja paslaugų struktūra

### Kategorijų medis

Pagrindinis grožio ir poilsio katalogas turi 14 sričių:

1. Plaukai: kirpimas, dažymas, šukavimas, priežiūra, tiesinimas, priauginimas, barzda.
2. Nagai: manikiūras, lakavimas, modeliavimas, dizainas, pedikiūras, rankų ir pėdų priežiūra.
3. Antakiai: korekcija, dažymas, laminavimas.
4. Blakstienos: priauginimas, papildymas, nuėmimas, laminavimas, dažymas.
5. Makiažas: kasdienis, proginis, vestuvinis, fotosesijoms ir individualios pamokos.
6. Depiliacija: vaškas, cukrus, lazeris, fotoepiliacija, elektroepiliacija, kiti būdai.
7. Veido priežiūra: valymas, drėkinimas, kaukės, šveitimas, aparatinė priežiūra, konsultacijos.
8. Kūno priežiūra: šveitimas, įvyniojimai, aparatinės procedūros, įdegis.
9. Masažas: viso kūno, atskirų sričių, veido ir specialūs masažai.
10. SPA ir poilsis: ritualai, pirtys, vandens ir poilsio procedūros.
11. Ilgalaikis makiažas: pigmentavimas, korekcija ir konsultacijos.
12. Tatuiruotės: tatuiravimas, atnaujinimas ir konsultacijos.
13. Auskarų vėrimas: vėrimas, papuošalų keitimas ir konsultacijos.
14. Estetinės procedūros: konsultacijos ir atskirai vertinamos procedūros.

Papildomai aprašyti septyni plėtiniai: sportas ir judėjimas, kineziterapija, psichologinė pagalba, savijautos užsiėmimai, odontologija, medicinos specialistai, gyvūnų priežiūra. „Kita“ yra operatoriui pateikiamas naujos procedūros prašymas, o ne viešas neklasifikuotos paslaugos krepšys.

Tai platus pradinis registras, kurį galima papildyti per versijuojamą operatoriaus procesą. Baigtinis vieną kartą parašytas sąrašas negali garantuoti kiekvienos būsimos procedūros. Visa pagrindinė pasirinkimo struktūra turi būti sukurta iš karto; viešai rezervuojami tik realūs ir tinkami teikėjo pasiūlymai. Įrašai be pasiūlos gali būti randami katalogo apžvalgoje su aiškia tuščia būsena, tačiau nepristatomi kaip turintys laisvų laikų.

### Penki skirtingi objektai

| Objektas | Pavyzdys | Kas jį valdo |
|---|---|---|
| Kategorija ir subkategorija | Plaukai → Dažymas | Platformos operatorius |
| Kanoninė procedūra | Balayage | Platformos registras; stabilus ID ir sinonimai |
| Meistro pasiūlymas | Konkretaus salono balayage paslauga | Teikėjas; aprašymas, vieta, taisyklės ir tinkami meistrai |
| Variantas | Trumpiems / ilgiems plaukams | Teikėjas; tikra kaina, trukmė ir kompetencija |
| Priedas | Papildomas priežiūros etapas | Teikėjas; suderinamumas, papildoma kaina ir trukmė |

Salono meniu grupė, pavyzdžiui „Populiariausios“ ar „Vestuvėms“, yra atskiras rodymo objektas. Ji nekeičia procedūros kategorijos. Kompleksinis vienkartinis pasiūlymas, kelių paslaugų vizitas ir abonementas taip pat turi skirtingus modelius: jų nevadiname tuo pačiu „variantu“.

Kūno sritis, plaukų ilgis, auditorija, procedūros metodas ir lankymosi būdas gali būti varianto savybės arba paieškos filtrai. Nekuriame kiekvienai kainai ir trukmei naujos pasaulinės kategorijos. Kai kelios procedūros prasmingai sujungiamos, paliekame atskirus komponentų ID ir aiškų bendrą pasiūlymą.

### Teikėjo pasirenkamų paslaugų kelias

1. Meistras prisijungia el. paštu ir pasirenka savarankišką veiklą arba saloną. Įveda faktinę vietą, komandos sudėtį ir kontaktus.
2. Ekrane „Ką teiki?“ ieško procedūrų arba atveria kategorijų medį. Gali pažymėti daug procedūrų iš kelių sričių. Pažymėjimai rodomi santraukoje, išlieka grįžus į ankstesnį žingsnį ir po puslapio perkrovimo.
3. Kiekvienai pasirinktai procedūrai sukuria savo pasiūlymą: pavadinimą, aprašymą, trukmę, faktinę EUR kainą, vietą, tinkamus darbuotojus, resursus ir buferius. Sistemoje nėra automatiškai teisingų 25 € ir 60 min. pradinių reikšmių.
4. Jei reikia, prideda variantus. Paslaugai gali būti keli tinkami meistrai; jų laikas ir kaina vertinami pagal pasirinktą kombinaciją. Priedai turi savo pasirinkimo taisykles.
5. Pasirenka registracijos būdą: momentinis laiko patvirtinimas, užklausa ar konsultacija. „Kaina nuo“ turi aiškiai paaiškinti, kada nustatoma galutinė kaina; neaiškiai kainuojamos procedūros nėra rodomos kaip galutinai apmokamas pasiūlymas.
6. Nustato grafiką, pertraukas, paslaugos dienas, išankstinės registracijos horizontą ir atšaukimo taisykles. Prideda tikrus darbus bei vietos vaizdus.
7. Matoma patikra: kas paruošta, kam trūksta kainos, trukmės, meistro, grafiko ar tinkamumo įrodymo. Nepilnas pasiūlymas lieka juodraštis. Meistras peržiūri, kaip jo meniu atrodys klientui, ir pateikia patvirtinimui.

Neradęs procedūros meistras siunčia naujo tipo prašymą su aprašymu. Operatorius patikrina, ar tai sinonimas, variantas ar nauja procedūra. Teikėjas gali dirbti su kitais paruoštais pasiūlymais, kol sprendžiamas šis prašymas. Naujas savarankiškai įvestas tipas automatiškai nepatenka į viešą katalogą.

## Kliento paieška ir rezervavimas

Pagrindinė paieška turi atskirus laukus „Paslauga, salonas ar meistras“, „Vieta“ ir „Kada“. Pradėjus rašyti rodome grupuotus rezultatus, o naršant — kategorijas su subkategorijomis. „Visos paslaugos“ nepaverčiamos pirmos kategorijos pasirinkimu. Sugrįžęs iš profilio klientas turi rasti tuos pačius filtrus ir tą pačią sąrašo vietą.

Miestų laukas leidžia greitai rasti visus 103 miestus, įvesti gyvenvietę ar adresą, pasirinkti neseniai naudotą vietą. Miestas, seniūnija, rajonas ir adresas saugomi atskirai. Geolokacijos prašoma tik paspaudus „Šalia manęs“; atsisakius paieška lieka pilnai naudojama. Atstumų nežymime tikrais, kol nėra patikimų koordinačių.

Data turi kalendorių ir aiškius greitus pasirinkimus: šiandien, rytoj, šią savaitę, bet kada. Intervalas vertinamas visam vizitui. Jei 90 min. procedūra prasideda 19:30 ir klientas pasirinko 17:00–20:00, toks rezultatas netinka. Kliento matomas vizito intervalas ir vidiniai resursų buferiai skiriami, tačiau jų konfliktus tikrina serveris.

Pasirinkus plačią kategoriją, rezultatas gali rodyti kelių procedūrų pasiūlymus, bet „laisvas laikas“ pateikiamas tik konkrečiai kainos, trukmės ir tinkamo meistro kombinacijai. Kai variantas dar nepasirinktas, vartojamas tikslus veiksmas „Pasirinkti variantą“, o ne nepatikrintas „Rezervuoti 18:00“. Katalogo projekcija padeda greitai rasti kandidatus; patvirtinimo metu galutinis kalendorius tikrinamas dar kartą.

Rezultatų filtrai: procedūra, variantų savybės, kaina, reitingas ir jo imtis, vieta / atstumas, konkretus meistras arba bet kuris tinkamas, momentinė registracija ar užklausa, pasirinktas laikas. Rikiavimas atskiria artimiausią laiką, kainą, atstumą ir vertinimą. „Rekomenduojami“ naudojamas tik aprašius jo faktorius; mokamas iškėlimas ateityje būtų aiškiai pažymėtas.

Profilis pateikia paslaugų meniu, komandą, tikrus darbus, darbo laiką, adresą, registracijos ir atšaukimo taisykles bei tikrų atliktų vizitų atsiliepimus. Patikros žymos paaiškina, kas ir kada tikrinta. Įvertinimų ar klientų skaičių nesugalvojame, tuščia reputacija rodoma sąžiningai.

Rezervavimo seka: procedūra → variantas → priedai → meistras → visas tinkamas laikas → santrauka → el. pašto prisijungimas, kai būtinas → patvirtinimas. Išsaugome įvestį po OTP ir tinklo klaidos. Kelių paslaugų vizite leidžiame vienos organizacijos suderinamą seką su skirtingais meistrais. Kelių salonų užsakymų sujungimas nėra šio pirmojo atominio modelio dalis.

## Meistro, kliento ir operatoriaus ekranai

| Ekranų grupė | Pagrindiniai veiksmai | Priėmimui būtinos būsenos |
|---|---|---|
| Vieša pradžia ir kategorijų katalogas | Ieškoti, naršyti procedūras, pasirinkti vietą | Normalus desktop / mobile, tuščia pasiūla, paieškos klaida, klaviatūra |
| Paieška ir žemėlapis | Filtruoti, rikiuoti, perjungti tipą, grįžti iš profilio | Loading, nėra rezultatų, pasenęs laikas, žemėlapio gedimas, išlaikyti filtrai |
| Salono / meistro profilis | Pasirinkti pasiūlymą, variantą, komandą, peržiūrėti galeriją | Nepatvirtintas ar pašalintas profilis, nėra paslaugų, neveikiantis vaizdas |
| Rezervavimo dialogas | Suformuoti ir patvirtinti vizitą | Nepilna forma, pasibaigęs hold, 409, pakartotas paspaudimas, sėkmė ir reload |
| Kliento vizitai ir paskyra | Perkelti, atšaukti, pakartoti, rašyti, valdyti nustatymus | Nėra vizitų, ryšio klaida, svetimo vizito 403, paslaugos archyvavimas |
| Teikėjo pradžia ir katalogo redaktorius | Pasirinkti procedūras, kurti variantus, priedus ir savo grupes | Juodraštis, trūksta duomenų, 409, ilgas meniu, masinio įrašymo klaida |
| Kalendorius, grafikas ir resursai | Kurti / keisti vizitą, pamainas, pertraukas, vietas | Persidengimas, uždara diena, neprieinamas meistras, siauras ekranas |
| Komanda ir klientų kortelės | Kompetencijos, prieigos, istorija, eksporto prašymai | Ribota rolė, atšauktas kvietimas, svetima organizacija, tuščia istorija |
| Operatorius | Tvirtinti profilius, procedūras, dokumentus, skundus | Konfliktuojanti revizija, archyvavimo priklausomybės, ribota prieiga |
| Gidai ir SEO katalogai | Paaiškinti pasirinkimą ir nuvesti į esamą procedūrą | Tikri CTA, tinkama medija, nepaskelbtas tikslas, 404 ir canonical |

Kiekvienos grupės viduje įgyvendinimo metu sudaromas konkretus ekranų ir veiksmų sąrašas. Ankstesnio 70 ekranų inventoriaus neužtenka naujam katalogui priimti. Mobiliajame paieškos pasirinkimui numatome pilno pločio dialogą, o paslaugų redaktoriui — žingsnius su išsaugoma santrauka. Kalendorius išlaiko savo darbo navigaciją ir dienos / savaitės / agenda peržiūras.

Naudojame esamus šriftų, spalvų, mygtukų, tarpų, fokusavimo ir klaidų komponentus. Naujas medis, pasirinkimų žymos, variantų eilutės ir kainos santrauka gauna bendrus komponentus. Konkrečią kompoziciją tikriname 320, 390, 820 ir 1440 px pločiais, pamatuodami actual viewport ir siaurus konteinerius. Neužtenka vien paslėpti persiliejimą ar turėti vieną gražią pradžią.

## Duomenys ir serverio sąsajos

### Tikslinis modelis

Taksonomijai reikia `TaxonomyVersion`, `Category`, `Subcategory`, `Treatment`, `Alias`, `LegacyMapping`. Teikėjo katalogui — `ProviderOffer`, `OfferVariant`, `PractitionerAssignment`, `ResourceRequirement`, `AddOnGroup`, `AddOn`, `ProviderMenuGroup`, `BookingPolicy` ir `EligibilityRevision`. Visi teikėjo objektai turi organizacijos ir vietos ID, reviziją, būseną bei serverinį leidimų tikrinimą.

Vizitas saugo užsakymo ir jo segmentų ID, pasirinktą variantą, darbuotoją, vietą, resursus, laikus, priedus, kainą, valiutą ir tuo metu galiojusias taisykles. Pavadinimai ir kaina saugomi snapshot. Procedūros pervadinimas ar pasiūlymo archyvavimas nekeičia ankstesnio vizito sutarties.

Kainos lieka sveikais centais; viešam rezervavimui aiški EUR suma arba aiškiai nustatytas užklausos / konsultacijos būdas. Trukmė ir buferiai yra serverio tikrinami. Nenaudojame taksonomijos numatytųjų kainų ir trukmių kaip realių teikėjo faktų. Laikai saugomi UTC, vietos verslo laiko zona — `Europe/Vilnius`, su vasaros / žiemos laiko testais. Bendras core išlaiko turinio, media, SEO ir kontaktų sutartis; taksonomija ir rezervavimo taisyklės lieka Madbeauty modulyje.

### Siūlomos API sutartys

| Sąsaja | Įvestis ir išvestis | Esminė taisyklė |
|---|---|---|
| Vieša taksonomija | Versija, aktyvūs medžio ID, sinonimai | Tik patvirtinta projekcija, jokie privatūs teikėjo duomenys |
| Paieška | Kategorijos / procedūros ID, vieta, intervalas, variantų filtrai, cursor | Grąžina profilio tipą ir realaus pasiūlymo variantą; puslapinimas deterministinis |
| Teikėjo pasirinkimų partija | Organizacija, procedūrų ID, tikėtina revizija | Kartojimas su tuo pačiu idempotency raktu nesukuria dublikatų |
| Pasiūlymas ir variantai | Kaina, trukmė, priedai, meistrai, resursai, versija | 403 svetimai organizacijai; 409 pasenusiai versijai; draft nepatenka į katalogą |
| Užsakymo pasiūlymas | Konkreti paslaugų seka, meistrai, variantai ir pradžia | Serveris apskaičiuoja visą kainą / trukmę; trumpas galiojimas ir modelio versija |
| Hold ir confirm | Serverio pasiūlymo ID, idempotency raktas | Pakartotinis kalendoriaus tikrinimas ir visos sekos atominis įrašymas |
| Operatorius | Taksonomijos ar tinkamumo revizija ir sprendimas | Atskira rolė, audito žurnalas; archyvas išsaugo priklausomybes |

Tai sutarties projektas, ne jau egzistuojantys endpointai. Prieš įgyvendinimą nustatome konkrečius maršrutus, atsakymo schemas, limitus, klaidų kodus ir suderinamumą su dabartiniu adapteriu. Prieš išplečiant visą UI anksti atliekame vieną pilną kelią su tikru serveriu ir Workers saugojimu.

### Saugojimo plėtra

Pirmiausia pamatuojame pilotinės JSON būsenos dydį ir augimą, katalogo bei laisvų laikų užklausų latenciją, medijos apimtį ir laiškų eilę. Dabartinis globalus JSON tinka ribotam pilotui, bet jo struktūros nekeisime į vis didesnį failą didindami limitą.

Tikslinė kryptis — normalizuotos lentelės ir indeksai, atskira vieša patvirtinto katalogo projekcija ir rezervavimo koordinavimas pagal organizaciją. Kliento tapatybė, teisės ir operatoriaus kontrolė išlieka atskirtos nuo salono kalendoriaus. Vienos organizacijos kelių paslaugų seka turi vieną atominį koordinatorių. Tarp organizacijų atominių užsakymų nežadame.

Konkretų katalogo saugyklos adapterį pasirenkame įvertinę dabartinio Workers runtime suderinamumą, apkrovą, atkūrimą ir kaštus. D1, kitas SQL ar per-organizaciją SQL Durable Object yra projektavimo sprendimai, kuriuos turi patvirtinti bandymas; šiame plane nauja infrastruktūra neprovisioninta. Medijos plėtrai taip pat atskirai įvertiname dabar naudojamą SQL bucket ir išorinę objektų saugyklą. Serverinių bandymų metu negalima laukti tinklo I/O atominio kalendoriaus įrašo viduje.

## Senų duomenų ir URL migracija

Pasiūlyme pateiktas visų 10 senų kategorijų atitikmenų žemėlapis. Platus „Kirpimas“ lieka kirpimų grupės atitikmeniu, kol pats teikėjas pasirenka konkrečią procedūrą. „Antakiai“ nepriskiriami savavališkai vien laminavimui. Senas viešas URL išlieka veikiantis arba gauna prasmingą serverinį peradresavimą; query parametrų suderinamumas tikrinamas atskirai.

Migravimo tvarka:

1. Užfiksuoti seną schemą, duomenų skaičius ir atkūrimo tašką privačiame operacijų registre. Į Git nekelti klientų kopijos.
2. Įkelti versijuotą taksonomiją. Pridėti naujus laukus išlaikant seno skaitymo suderinamumą.
3. Migruoti į izoliuotą bandymo kopiją, pažymėti neaiškius priskyrimus. Išsaugoti paslaugų, klientų ir vizitų ID, kainų snapshot bei jų ryšius.
4. Patikrinti paralelinį užsakymą, pakeitimą, atšaukimą, tenant izoliaciją ir reload su tikru Workers adapteriu. Katalogo šešėlinį skaitymą palyginti su autoritetingu šaltiniu; neleisti dviejų lygiaverčių rašančių modelių.
5. Prieš perjungimą aiškiai sustabdyti seną rašymo kelią ir nustatyti naujų užklausų maršrutizavimą. Mažas realių organizacijų etapas tik po pilnos vietinės ir preview patikros.
6. Patikrinti visus ID, laisvus laikus, viešą revizijų projekciją ir laiškus po perjungimo. Rollback leidžiamas tik jei jis nepraranda po perjungimo atsiradusių vizitų; kitu atveju taisoma į priekį arba atliekamas valdomas atkūrimas.

Dabartinė produkcinė `madbeauty-pilot-v1` saugojimo tapatybė negali būti tyliai pakeista nauju tuščiu egzemplioriumi. Saugojimo skaidymas yra atskira dokumentuota migracija. Esamo SMTP, sekretų, domeno, DNS ir patvirtintų turinio release nekeičiame vien dėl katalogo atnaujinimo.

## Tinkamumas, duomenys ir pasitikėjimas

NVSC nurodo grožio veiklos leidimo-higienos paso reikalavimą ir išvardija plaukų, nagų, veido, kūno, tatuiravimo, ilgalaikio makiažo bei vėrimo paslaugas. Todėl onboarding ir operatoriaus patikra turi būti susieti su realia veikla bei vieta. Gydomojo masažo negalima automatiškai vertinti kaip to paties įprasto grožio masažo. [NVSC paaiškinimas](https://nvsc.lrv.lt/lt/naujienos/nvsc-ka-svarbu-zinoti-norint-verstis-grozio-paslaugu-veikla-LY9r/).

NVSC A kategorijos paaiškinimas taip pat apima odą pažeidžiančias paslaugas, įskaitant tam tikrą manikiūrą ir pedikiūrą. Dėl to papildoma patikra nėra vien estetikos skyriaus klausimas. Katalogo `reviewRequired` žyma yra planuojamos produkto kontrolės pasiūlymas; ji nėra galutinis visų procedūrų teisinis klasifikatorius. Kiekvienai procedūrai vertinami konkretūs reikalavimai prieš aktyvavimą. [NVSC A kategorijos paaiškinimas](https://nvsc.lrv.lt/lt/dazniausiai-uzduodami-klausimai-7/ukio-subjektu-prieziura-1/kirpyklos-grozio-salonai/kokios-grozio-paslaugos-priskiriamos-a-kategorijos-paslaugoms/).

Invazinės, lazerinės, medicinos ir kitos reguliuojamos paslaugos gauna atskirą tinkamumo matricą. Estetikos įrašas šiame kataloge nesuteikia meistrui teisės jį teikti. Dokumentų turinys privatus, vieša žyma nurodo tik patikrintą objektą ir datą. Prieš kiekvienos medicinos srities įjungimą reikia patikrinti aktualius pirminius teisės šaltinius ir konkrečių specialistų licencijavimo taisykles; šiame audite visų medicinos sričių teisinė apžvalga neatlikta.

Klientų kortelėse pradedame nuo vizitų istorijos ir būtinų kontaktų. Anketos, alergijų, sveikatos ar kiti jautrūs laukai atsiranda tik apibrėžus būtinumą, prieigas, saugojimo terminą ir sutikimų versijas. Fresha dokumentacija rodo anketų funkciją, bet tai nėra pagrindas tiesiog nukopijuoti jos renkamus laukus. [Oficialus anketų aprašymas](https://www.fresha.com/help-center/knowledge-base/clients/607-client-forms-overview).

Rezervacijos pranešimai, pranešimų pasirinkimai ir rinkodara turi atskiras taisykles. Neįjungiame automatinio kontaktavimo, SMS, WhatsApp, mokėjimų ar trečiųjų šalių siuntimo šio plano sukūrimu. Integracijoms prieš įjungimą nustatomos faktinės sąnaudos, prieigos ir klaidų elgsena.

## Įgyvendinimo etapai

| Etapas | Rezultatas | Priklausomybė ir išėjimo kriterijus | Orientacinė apimtis |
|---|---|---|---|
| 0. Inventorius ir sutartys | Aktuali būsena, tinkamumo matrica, migracijos scenarijus, realių bandymų planas | Įrodymų šaltiniai ir tikros produkcinės ribos aiškios | 1 planavimo ciklas |
| 1. Katalogas, meistras ir paieška | Hierarchija, sinonimai, kelių procedūrų pasirinkimas, variantai, visi miestai, tikras laiko filtras | Veikia vienas pilnas meistro → paieškos → vizito kelias; visos 10 senų kategorijų suderinamos | 2–3 įgyvendinimo ciklai |
| 2. Profilis ir rezervavimas | Salono meniu, priedai, kelių paslaugų seka, patikra, katalogo projekcija ir SEO sąsaja | Atominės sekos, tikra pasiūla, private/public izoliacija ir preview migracija priimtos | 2–3 ciklai |
| 3. Salono veikla ir augimas | Keli adresai, darbuotojų teisės, masinis importas, klientai, priminimai, laukiančiųjų pasiūlymai, rodikliai | Tikros operacijos ir klaidų / apkrovos scenarijai patikrinti; nėra neaiškių integracijos pažadų | 2–4 ciklai |
| 4. Papildomos sritys | Sportas, sveikata, gyvūnai; grupės / kursai; komerciniai moduliai, jei pasirinktas jų modelis | Kiekviena sritis turi savo tinkamumo, duomenų, rezervavimo ir sąnaudų sutartį | Vertinama pagal sritį po pagrindinio kelio |

Vienas ciklas planavimui laikomas maždaug dviejų savaičių darbo vienetu, o ne pažadėtu terminu. Esant vienam atsakingam įgyvendintojui pagrindinei plėtrai preliminariai numatomi 6–10 įgyvendinimo ciklų po inventoriaus. Saugojimo migracijos prototipas ir pirmas pilnas kelias turi patikslinti šį vertinimą. Tikras darbo tempas, pilotinių salonų prieinamumas, integracijų dokumentai ir jų sąnaudos dar nežinomi; euro biudžetas šiame plane neišgalvotas.

Etapai mažina pakeitimo riziką, bet nėra pagrindas sustoti po dropdown ar vienos kategorijos. Grožio katalogo atnaujinimas užbaigtas tik kai pilnas jo medis, paslaugų pasirinkimas, variantai, laiko paieška, profiliai, rezervavimas, operatoriaus kontrolė ir migracija turi priėmimo įrodymus. Papildomų sričių ir mokėjimų įjungimo kriterijai lieka aiškiai atskiri, kad planas nepakeistų dabartinio verslo modelio be faktinio sprendimo.

### Pirmasis konkretus įgyvendinimo paketas

Tvarka: `G01` ir `G02` → `D01` → `D02` / `D03` → `D04` → `S01` / `S02` → `S03` ir `O01`. `I01` bei `I04` rengiami nuo pradžios. Pirmiausia bandymo aplinkoje įdiegiama taksonomijos versija, kelių procedūrų pasirinkimas ir variantų modelis. Tada viena tikra serverinė seka įrodo, kad naujai sukurta paslauga patenka į reikiamą kategoriją, turi laisvą laiką ir rezervuojama. Po to plečiami visi meniu, būsenos ir regresija.

Paketo peržiūrai reikia: migracijos žemėlapio, API schemų, seno ir naujo katalogo palyginimo, tikro naršyklės kelio desktop / mobile, konfliktų bei izoliacijos įrodymų ir aiškaus rollback. Viešas diegimas turi savo release patikrą; plano ar vietinio prototipo užbaigimas nėra production rezultatas.

## Kokybės patikra ir produkto rodikliai

Priėmimo istorijoje kiekvienas kriterijus žymimas PASS, FAIL, UNVERIFIED arba pagrįsta NA. Tikriname taksonomijos ID ir versijas, tėvų paiešką, sinonimus, senus URL, paslaugų archyvavimą, tenant izoliaciją, netinkamus priedus, kainų snapshot, užsakymų kartojimą, pilnus intervalus, vasaros / žiemos laiką, konkuruojančius vizitus, laikino hold pabaigą, resursus ir atšaukimą.

Naršyklėje būtini visi pagrindiniai klientų ir meistrų keliai su tikru adapteriu, išlaikyti juodraščiai, grįžimas iš OTP, tuščias katalogas, lėtas tinklas, 403 / 409, klaviatūra, matomas fokusas, 200% mastelis ir reduced-motion. Nepavykęs fizinis bandymas lieka UNVERIFIED. Mobilų plotį ir siaurų elementų persiliejimą matuojame, o kompoziciją apžiūrime ekrano nuotraukoje. Privačių vaidmenų Lighthouse rezultatas nėra viešos paieškos ar visos platformos rezultatas.

Esami backend, platform, foundation, Workers ir search-options testai išlieka regresijos manifeste. Papildomi bandymai turi tikrinti realius duomenų ir konflikto scenarijus, o ne pakartoti naują kodą. Po tikro diegimo patikrinami domenas, privatūs maršrutai, discovery, patvirtintas turinys, laiško gavimas ir vienas kontroliuojamas tikro pasiūlymo kelias.

Produkto matavimui numatome šiuos įvykius: `provider_services_selected`, `offer_published`, `search_submitted`, `search_results`, `profile_opened`, `variant_selected`, `booking_started`, `booking_confirmed`, `booking_conflict`, `booking_canceled`, `booking_repeated`. Į analitiką neperduodame klientų tekstų, el. pašto ar jautrių procedūros anketų. Įvykio ID ir schema neturi atskleisti asmens.

Matome: kiek meistrų baigia paslaugų suvedimą; kiek laiko jiems reikia; kokia paieškų dalis neturi rezultato; kiek variantų pasirinkimų virsta vizitais; kiek pasenusių laikų konfliktų; kiek klientų grįžta; kiek vizitų atšaukiama. Vardikliai, laikotarpis ir demo duomenų atskyrimas aprašomi prieš matavimą. Pirmiausia surenkama tikra pradinė reikšmė. Šiuo metu nėra pagrindo skelbti garantuotą konversijos pagerėjimą ar meistrų paklausą.

Veikimo tikslus nustatome su testine apkrova po pirmos migracijos repeticijos: paieškos ir laisvų laikų p95, klaidų dalis, būsenos dydis, eilės amžius, medijos dydis. Nekeliame atnaujinimo, jei regresija leidžia dubliuotą vizitą ar svetimos organizacijos duomenų skaitymą, net jei sąsaja atrodo gerai.

## Redakcinis ir Git perdavimas

Kategorijų bei procedūrų ID turi susijungti su jau atskirai rengiamu Madbeauty turinio planu. Straipsnių kalendoriaus šiame pakete nedubliuojame. Jo atsakingasis gauna naują ID žemėlapį ir peržiūri gidų navigaciją bei CTA. Kiekvienas būsimas kategorijos / miesto puslapis turi atskirą naudingą paskirtį ir tikrą eligible pasiūlą arba aiškų informacinį turinį; automatiškai nesukuriame šimtų beveik vienodų SEO puslapių.

Šio planavimo paketo savininkas — `ai/madbeauty-upgrade-plan-20261006`. Rašomi tik šio katalogo failai, aktualios būsenos nuoroda ir savi WORKSTREAMS įrašai. Produkto / taksonomijos sprendimus dokumentuoja produkto atsakingasis, duomenų ir API migraciją — įgyvendinimo atsakingasis, fizines ir serverines patikras — priėmimo atsakingasis, gyvą perjungimą — operacijų atsakingasis. Tai funkcijų atsakomybės, ne jau pasamdyta komanda ar autorizuotas trečiųjų šalių kontaktavimas.

Kiekvienas įgyvendinimo paketas turės atskirą šaką / PR, tikslų failų langą, priėmimo matricą ir source versiją. Bendro core pakeitimai rezervuojami atskirai ir perduodami susietais PR, kai būtina. Planavimo JSON ir originalus peržiūros HTML gali būti versionuojami; klientų duomenys, prisijungimai, produkcinės DB, slapti atkūrimo taškai ir žali konkurentų ekranai lieka už Git ribų.
