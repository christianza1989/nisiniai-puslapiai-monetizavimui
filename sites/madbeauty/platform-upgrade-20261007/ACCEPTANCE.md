# Pirmas uždaras upgrade kelias — dalinis priėmimas

2026-10-07, šaka `ai/madbeauty-platform-upgrade-20261007`, PR26. Visas upgrade tebėra aktyvus; tai pirmo serverinio kelio įrodymas, ne visų plano modulių užbaigimas.

Įgyvendinta: kanoninių procedūrų kelių pasirinkimų partijos, privatūs pasiūlymų juodraščiai be numatytos kainos ar trukmės, peržiūrimos pasiūlymo versijos, variantai su kelių darbuotojų kainomis/grafikais, atgal suderinama migracija, archyvavimas, sinonimų versijos ir procedūrų prašymų susiejimas. Paieška naudoja aktyvų katalogą, 103 miestus, diakritikos nejautrų tekstą ir klaviatūros pasirinkimą; tikrina visą vizito intervalą. Salono meniu grupių, priedų grupių, varianto požymių, prieinamumo taisyklių ir atominio CSV kainų keitimo pagrindas įgyvendintas; jų išsamus UI priėmimas dar vykdomas.

Serverio įrodymai: `evidence/backend-first.log` 38/38; po sąsajų sujungimo `regression-1.log` 96/96; po priedų/tvarkymo/CSV `regression-2.log` 100/100. Vėliau rastam browser variant/staff lauko neatitikimui skirtas regresijos testas `prototype/booking-roster.test.mjs` PASS. Importuotų paskyrų client projekcijos atkūrimas pridėtas prie auth; `evidence/regression-3.log` patvirtino visą manifestą 102/102 po abiejų pataisymų.

Actual Workers: `evidence/workers-first.log` 8/8, įskaitant naują pilną kelią: privataus multi-select idempotency, du darbuotojai vienam variantui, skirtingi 25/35 EUR ir 60/90 min., approved pasiūlymas/profilis, actual intervalas, du concurrent hold (200/409), patvirtinimas, customer/provider tas pats ID po Miniflare SQL restart, archyvavimas nepakeičia užfiksuoto vizito. Production namespace ir duomenys nepanaudoti.

Actual browser: own `http://127.0.0.1:8841`, `evidence/platform-preview.sqlite` su reserved example.com fixture ir captured mail, jokio išsiuntimo. Meistras per normalų email/OTP prisijungimą pasirinko Vyrų kirpimą ir Gelinį lakavimą, abu serverio juodraščiai išliko po reload; įrašė variantą 25 EUR/60 min. ir tinkamą darbuotoją/resursą; pateikė peržiūrai. Operatorius per normalų prisijungimą patvirtino konkrečią versiją. Paieška surado tik naują variantą. Klientas peržiūrėjo visą vizitą ir patvirtino serverio rezervaciją; santrauka išlaikė kainą/trukmę. `booking-confirmed.png` ir operatoriaus/procedūrų DOM stebėjimai; receipt dar neapima kliento ir meistro browser ID patikros po restart.

Actual pasiūlymų sąsaja: 320/390/820/1440 px viewport, dokumento plotis neviršijo viewport (vertikalaus scrollbar plotis užfiksuotas); `offers-widths.json` ir keturios `offers-<width>.png` peržiūrėtos. Sidebar mobilių tabų vidinis slinkimas nėra horizontalus document overflow. Tai tik pasiūlymų sąsajos plotis; kiti paviršiai ir būsenų matrica dar nėra viso produkto PASS.

Rastos ir pataisytos: paslaugos varianto radio buvo sutapatintas su darbuotojo radio, todėl `serviceId` buvo tuščias; dabar variantas ir darbuotojas turi atskirus laukus, tested. Testo administratoriaus iš anksto įrašyta account eilutė neturėjo client projekcijos; verified sign-in dabar nuosekliai ją atkuria tuo pačiu ID ir neprideda rolių. Pataisymų turinio/DB versijos nėra automatiškai perrašomos į production.

Preview naudoja exact reviewed V2 paketą `b208596faea613be548c15423ec691c3d1cc01b2f0b1dcdcfb80f7411ea8fdd5`; paleidimas reikalauja path ir SHA. Abiejų būsimų straipsnių `publishAt=2026-10-13T07:00:00Z`, media ir discovery vartai išlieka. Nė vienas fixture profilis ar jo local target nėra realios pasiūlos / indexEligible įrodymas. Istoriniai receipts nepakeisti.

Toliau: užbaigti katalogo administravimą ir visų naujų formų UI/stale/empty/conflict priėmimą; įgyvendinti likusius plano 0–3 modulius, saugojimo modelį ir gates. Išorinių pilotų, mokėjimų, kalendorių prieigų bei jautrių anketų faktai neįrašomi kaip turimi.


## Antras kontrolinis taškas — komandos prieigos, katalogo administravimas ir V2 schema

106/106 Madbeauty regresijų PASS (`evidence/regression-6.log`) su suderintu companion core63cfd8c (`MB_CORE_ROOT`), 52/52 bendro core bandymų PASS. Workers actual HTTP tikrina priskirto meistro apribojimą, kainų/rolių mutacijų403, atšauktą prieigą ir pending R2 vaizdų404 bei upload403; patvirtinto vizito ID išlieka po Miniflare restart. Naujos procedūros papildymas, kvalifikacijos vartas, archyvavimas/sinonimai/atkūrimas ir neaktyvus nepilnas variantas turi serverinius neigiamus bandymus.

Naršyklėje: po own server restart klientui rodoma ta pati `booking_8739674d-ed65-4134-8886-080882f8fc66` rezervacija, apriboto meistro kalendoriuje rodomas tas pats vizitas, šoninis meniu neberodo pasiūlymų/prieigų/profilio. Tiesioginis `/meistrui/prieigos` kelias rodo nepriskirtos prieigos ekraną. Savininko grant ir edit dialogas patikrinti1280/390; operatoriaus actual add → archive → restore procedūros ciklas patikrintas, mobile restore dialogas peržiūrėtas. Kvito vaizdai yra own ignored evidence, tik sintetinės paskyros ir profiliai. Visų formų būsenų matrica dar nebaigta.

Katalogo operatorius dabar mato ir archyvuotus įrašus, gali atkurti, pridėti procedūras/grupes, atmesti ar susieti naujo tipo prašymą. Pridėtos procedūros reikalauja tinkamumo įrodymo; naujos kategorijos lieka neaktyvios plėtros sritys. Pavadinimo keitimas išlaiko ID ir atnaujina palikuonių kelią. Senos paslaugos išlieka redaguojamos, meniu grupės turi eilę ir draft pakeitimai netaisomi tiesiogiai public snapshot.

Companion schema PR6 https://github.com/christianza1989/niche-public-core/pull/6 (63cfd8c) yra atskira priklausomybė. Adapteris perduoda faktinį `/gidai` indeksą, schema ir HTML naudoja tas pačias reviewed editorial datas. Nėra išgalvoto Person ar reviewedBy. Node preview schema build atskirtas nuo Workers output, kad parallel tests/peržiūra neperrašytų release artefakto. Kandidato build priima `--core-root`; paired preview/test priima `MB_CORE_ROOT`. Shared pagrindinio checkout neperjungtas, dovanos123 release failai nepakeisti.

Full upgrade ACTIVE; kelių paslaugų vizitas, fazės, vietos, veiklos ataskaitos, saugojimo normalizacija ir likusių UI būsenų priėmimas tęsiami. Šis taškas nėra production upgrade ar viso plano completion.


## Trečias kontrolinis taškas — veiklos vietos ir jų grafikai

110/110 paired regresijų PASS (`evidence/regression-8.log`). Nauji prasmingi scenarijai: dvi vienos organizacijos vietos skirtinguose miestuose; ta pati procedūra su atskirais pasiūlymais; draft ir published adresų atskyrimas; fiziškai vienai vietai priskirtas resursas; darbuotojo vietų pasirinkimai; naujos vietos pamainos pradžioje be darbo dienų; persikėlimo laiko patikra tarp pamainų; savo vietos grafikas; viešos vietos versija stale hold patikroje; patvirtinto vizito adreso snapshot; draudimas archyvuoti/perkelti adresą ar pašalinti meistro vietą su būsimais vizitais. Koordinatės rodo tik pateiktą ir peržiūrėtą adreso tašką; trūkstant koordinačių atstumas null, nenaudojamas miesto centras. Atstumo rikiavimas be atskaitos vietos atmetamas.

Actual Workers HTTP: izoliuota nauja Kauno vieta patvirtinta operatoriaus, staff ir fizinis resursas vietos scoped, atskiros pamainos, miesto paieška ir rezervacija; po Miniflare SQL restart išlieka du grafikai ir tikslus patvirtintas vizito adresas. Svetimos paskyros save403 ir būsimo vizito vietos archive409. Production DO/namespace nepasiektas. Pinned candidate build 9 approved pages/141 assets/exact b208 SHA, candidate-built-not-deployed.

Actual browser390/1280: owner pridėjo filialą, pateikė peržiūrai, priskyrė esamą meistrą ir30 min. persikėlimą; išsaugojo atskirą Thu19:30–22:00 pamainą po pagrindinės09:00–19:00; sukūrė resursą konkrečiai vietai; tą pačią Vyrų kirpimo procedūrą pasirinko kitam filialui, originalus pasiūlymas liko. Varianto redaktorius rodė tik Kauno kabinetą. Draft30 EUR/60 min. išsaugotas; pateikimas iki vietos patvirtinimo parodė aiškią LOCATION_UNPUBLISHED klaidą. Operatorius peržiūrėjo ir patvirtino vietą. Evidence: locations-pending-mobile, branch-unpublished-mobile, branch-review-desktop. Pilnas antro filialo browser rezervacijos kelias dar nepriimtas; Workers keliui PASS nėra visos būsenų matricos PASS.

UI aptikti legacy atvejai sutvarkyti ir regresuoti: ankstesnis meistro įrašas be version gauna aiškų version1; ankstesnio vizito vieta nustatoma iš jo snapshot ar esamo serverinio ryšio, kad vėlesnis vietų pasirinkimas ar grafiko keitimas jo nepaliktų be apsaugos. Įrodymuose tik local fixtures, captured mail be išsiuntimo. Full upgrade ACTIVE; production upgrade dar nepaskelbtas.

## Ketvirtas kontrolinis taškas — SQL normalizacija ir apimties matavimas

114/114regresijų PASS (`evidence/regression-10.log`). Tikslios migracijos/rollback/Workers/Node ribos ir išmatuotos apimtys [STORAGE](STORAGE.md). Own preview2353records/862390bytes migracija išlaikė ankstesnį vizito ir filialo ID; actualoperator UI po restart rodo išsaugotas peržiūros būsenas. Publicreads nebekrauna pilnos privačios istorijos, paieška skaito kiekvienos organizacijos kalendorių vieną kartą. Visa mutacijų serializacija ir globalpilotDO lieka tolesnis I02darbas, ne production skalės PASS. Byline lt-LT Europe/Vilnius išlaiko tikslų reviewedUTCdatetime; atskiras turinio source addb8b8. Plataus upgrade source dar nepaskelbtas production.
