# Dabartinis planas: visų 20 svetainių SEO ir paklausos testas

Atnaujinta 2026-09-29 pagal vartotojo patikslinimą. Šis dokumentas apibrėžia pirmą etapą ir pakeičia ankstesnes rekomendacijas pradėti tik nuo trijų verslų arba prieš testą integruoti tiekėjus.

Techninis sujungimas su esamu Dovanos123 projektu aprašytas [bendrame maždaug 30 svetainių plane](BENDRA_30_SVETAINIU_SISTEMA.md). Pirmo etapo apimtis nesikeičia; Fabrikas nebėra privalomas, planuojamas atskiras lengvas turinio planuotojas/generatorius.

## Tikslas

Paleisti visus 20 pasirinktų domenų su jiems pritaikytu turiniu ir tikrais kontaktais. Palyginti organinį matomumą, tinkamus lankytojus ir realias užklausas. Pilnas verslo sistemas, tiekėjų integracijas ir individualius įrankius kurti tik atrinktiems projektams pagal rezultatus.

Pirma patikriname auditorijos susidomėjimą. Pelningumą patvirtins vėlesnis etapas, kai žinosime tiekimo sąlygas, įgyvendinimo darbą ir realius pardavimus.

## Kas kuriama visoms svetainėms

- Individualus homepage / landing page su aiškia tematika, auditorija ir pagrindiniu kvietimu kreiptis.
- Reikalingi paslaugų, prekių grupių ar konkrečių produktų aprašymai, atsižvelgiant į tikrą paieškos ketinimą ir turimus faktus. Tas pats pasiūlymas nedauginamas į daugybę beveik vienodų puslapių.
- Informacinis centras: temos žemėlapis, pagrindiniai gidai, pasirinkimo ir palyginimo turinys, aktualūs klientų klausimai.
- Techninis SEO: indeksuojamas HTML, title ir description, tinkami canonical, sitemap, robots, semantiška struktūra, vidaus nuorodos ir turinį atitinkantys struktūriniai duomenys.
- Kontaktai: veikiantis el. paštas, telefonas ir trumpa bendra užklausos forma. Nišai pakanka poreikio aprašymo; sudėtingi parinkimo vedliai pirmame etape nereikalingi.
- Analitika ir Search Console kiekvienam domenui, vienoda užklausų registravimo tvarka.

„Visi reikalingi SEO puslapiai“ reiškia suplanuotą prasmingų puslapių aprėptį, o ne vienodą straipsnių skaičių visoms nišoms. Temos plane kiekvienam adresui nurodome paskirtį, šaltinius ir būseną. Turinį galima papildyti nuolat, nelaukiant, kol visas ilgalaikis planas bus parašytas.

## Ko pirmame etape nekuriame

Pirkimo krepšelio, mokėjimų, sandėlio, tiekėjų API, rezervacijų patvirtinimo sistemos, klientų kabinetų, individualių CRM, sudėtingų skaičiuoklių ir pilno SaaS produkto. Ankstesniame 20 svetainių modulių dokumente išvardytos individualios funkcijos yra vėlesnio vystymo idėjos.

Tiekėjo integracija nėra paklausos testo sąlyga. Gautas užklausas peržiūrime ir atsakome rankiniu būdu. Svetainės tekstas atspindi realų etapą: galima kreiptis dėl galimybių ar pasiūlymo, bet nežadame neegzistuojančio likučio, patvirtintos rezervacijos, darbo termino ar partnerystės.

## Supaprastinta techninė kryptis

Bendras lengvas svetainių variklis, 20 domenų konfigūracijų, keli landing page šablonai, turinio puslapiai ir bendras užklausų priėmimas.

Šiam turinio ir kontaktų etapui tinka vienas Vercel diegimas su domenų atpažinimu. Svetainės ID nuo pradžių atskiria turinį, metaduomenis, kontaktus, analitiką ir cache. Nežinomas domenas neturi rodyti kito verslo turinio. Viešos preview kopijos neindeksuojamos. Atskirti svetainę į savarankišką projektą numatome kaip vėlesnį žingsnį, kai ji plečiama arba parduodama.

Pirmam turinio srautui pakanka versijuojamų struktūrizuotų failų ir valdomo publikavimo į bendrą sistemą. Nereikia iš karto statyti atskiros didelės CMS ar perkelti visos fabriko DB. Atskiro planuotojo/generatoriaus rezultatas — patvirtintas svetainės turinio paketas. Publikavimo užduotys jungiamos į kontroliuojamus atnaujinimus, kad lygiagretūs eksportai vienas kito neperrašytų. Pakete esančius patvirtintus straipsnius galima atverti pagal datą užklausos metu be cron; naujam paketui vis tiek reikia generavimo, peržiūros ir įdiegimo.

Formos duomenis reikia patikimai išsaugoti ir pristatyti į bendrą paštą / paprastą užklausų sąrašą. Vien mailto nuorodos ar naršyklės sėkmės pranešimo nepakanka.

## Ką daro turinio planuotojas/generatorius

Verslo brief → temų žemėlapis → šaltiniai → turinio juodraščiai → kokybės peržiūra → patvirtintas turinio paketas → svetainė.

Remiamės esamu Dovanos123 turinio formatu ir bendru publikavimo modeliu, pridėdami planavimą naujiems domenams bei patvirtintų paketų eksportą. Iš Fabriko galima paimti planavimo, kokybės tikrinimo ir GSC analizės idėjas ar tinkamas atskirtas dalis, tačiau visos jo sistemos jungti nereikia. Teksto ilgis ir puslapių kiekis parenkami pagal klausimą, ne bendrą gamybos kvotą.

Išorinės publikacijos nėra būtina sąlyga visų 20 svetainių startui. Jų apimtį, datą ir gavėją žymime, kad interpretuodami rezultatą matytume, kuri svetainė gavo papildomą sklaidą.

## Matavimas

| Rodiklis | Ką parodo |
|---|---|
| Indeksuoti tiksliniai puslapiai ir pirmo indeksavimo data | Ar svetainei apskritai buvo galimybė gauti organinį srautą |
| GSC parodymai ir paspaudimai pagal užklausą / puslapį | Matomumas ir lankytojo paieškos ketinimas |
| Tinkami apsilankymai pagal kanalą | Kiek atėjo potencialiai aktualios auditorijos |
| Telefono ir el. pašto paspaudimai | Susidomėjimo signalas, bet dar ne tikra užklausa |
| Gauti skambučiai, laiškai ir formos | Tikras kreipimasis |
| Kvalifikuotos užklausos | Realus poreikis, tinkama paslauga / prekė, teritorija ir kontaktas |
| Pageidaujama prekė / paslauga, terminas ir biudžetas, jei pateiktas | Ką verta pradėti tiekti ar įgyvendinti |
| Turinio, reklamos, sklaidos ir darbo sąnaudos | Kiek kainuoja gauti susidomėjimą |

El. pašto aliasas atskiras kiekvienam domenui. Skambučių priskyrimui geriausia atskiri mūsų valdomi numeriai arba patikimas skambučių maršrutizavimas. Jei naudojamas bendras numeris, šaltinį fiksuoti pokalbio metu ir pažymėti priskyrimo ribotumą. Pokalbių įrašymas šiam testui nebūtinas.

Spam, testinius kontaktus ir pakartotinius to paties poreikio kreipimusis atskirti. Konversiją skaičiuoti iš unikalių kvalifikuotų užklausų ir atitinkamo tinkamo srauto; el. pašto / telefono paspaudimų prie tikrų kontaktų nesumuoti.

## Kaip pasirenkame, ką vystyti

Vertiname ne vien didžiausią lankomumą. Informacinė tema gali surinkti daug skaitytojų ir mažai pirkėjų. Prioritetas projektui, kuris kartotinai gauna konkrečias tinkamas užklausas ir turi pagrįstą aptarnavimo bei uždarbio galimybę.

- Daug tinkamų užklausų: tikriname tiekėjus, kainodarą, maržą ir pasirenkame reikalingas funkcijas.
- Daug srauto, mažai užklausų: tikriname lankytojų ketinimą, pasiūlymą ir kvietimą kreiptis.
- Mažai srauto, bet vertingos užklausos: tikriname galimybę didinti pasiekiamumą.
- Mažai matomumo: dar nepakanka įrodymų apie paklausą; tikriname indeksavimą ir turinio / kanalo darbą.

Svetaines lyginame pagal laiką nuo indeksavimo, sezoną, turinio aprėptį ir papildomą reklamą / sklaidą. Viena užklausa ar trumpas laikotarpis nėra stabilus rezultatas. Stebėjimo peržiūros gali vykti kas savaitę, bet techninė savaitinė peržiūra nėra automatinis SEO sėkmės ar nesėkmės terminas. Automatinis stebėjimas dar nesukonfigūruotas.

## Įgyvendinimo eilė

1. Sukurti bendrą turinio ir kontaktų šabloną bei patikrinti jį su vienu domenu.
2. Parengti 20 verslų pasiūlymus ir SEO puslapių žemėlapius.
3. Sukurti individualų turinį ir išplėsti šabloną visiems 20 domenų. Techninės diegimo bangos nėra verslų atranka; kitų svetainių paleidimas nelaukia pirmojo sėkmės.
4. Įjungti vienodą matavimą, išbandyti realų kontaktų gavimą ir paleisti paklausos testą.
5. Pagal rezultatus atrinkti vystomus verslus. Tik tada įgyvendinti jų tiekėjų ryšius ir individualias sistemas.
