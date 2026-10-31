# Antrojo vizualinio taisymo priėmimas · 2026-10-30

Roko pavedimu pataisyti visi šeši papildomo palyginimo radiniai. Tai esamos svetainės atkūrimas pagal išmatuotą originalą, ne nauja dizaino kryptis. Native tekstai, kontaktai ir12 adresų išliko. Tikras domenas tebėra Studio juodraštis; leidimas publikuoti neišduotas.

| Radinys | Pataisa ir patvirtinimas |
|---|---|
| Planšetės navigacija801-1024 | Navigacija pereina ties1024, turinys ties767. Abiem tiriamais planšetės dydžiais header79px. Hero procentinės kolonos ir natūralus vertikalus centravimas sutampa su originalo matavimais. |
|375px logotipas ir H1 |136px logotipas,32px antraštė,74px header; H1 pradžia154px. Originalo tie patys dydžiai.320px leistas siauras28px variantas išliko. |
| Straipsnių antraščių plotis | Pavyzdys PATALPŲ OZONAVIMAS: x20,width335,height64 ties390px; originalo tie patys matmenys ir dvi eilutės. |
| Kategorijų ženkleliai ir spalva | Visi devyni pavadinimai turi po vieną disc ženklelį su25px įtrauka. Originalo tamsi spalva#333; native semantinė antraštė nedubliuojama. |
| Tikroji raidžių tipografija ir proceso geometrija | Bounded inline stiliai išsaugo14px/600/1px proceso pavadinimus, tėvinį normal eilutės aukštį,600 paryškinimą. Kolona260px desktop, proceso diagrama335px telefone. |
| Išskleisti D.U.K. | Visi9 atsakymai atverti desktop ir mobile. Telefone padding12px10px,paskutinio paragrafo tarpas20px,border1px. Pirmo atsakymo aukštis196.125px, kaip originale. |

Papildomai patvirtintas meniu sibling disclosure išskirtinumas, Escape ir paspaudimas už navigacijos abiem režimais. Išankstinis dviejų naudojamų vietinių šriftų užkrovimas per React renderio HTTP Link hints paankstino jų siuntimą iš maždaug184ms į53/55ms. Dabartiniame vietiniame matavime CLS0. Šio hint pakeitimo galutinis375/801 vaizdas ir įkeltų šriftų būsena patikrinti iš naujo.

## Įrodymai ir patikros

Mašininė suvestinė: [QA-SECOND-FIDELITY-2026-10-30.json](QA-SECOND-FIDELITY-2026-10-30.json). Pilni vietiniai matavimai,24 JPEG puslapių vaizdai ir18 atvertų atsakymų duomenys: `D:/Core/output/kvapunaikinimas-final-fidelity-20261030`. Ankstesnis auditas išsaugotas atskirai `D:/Core/output/kvapunaikinimas-deep-comparison-20261029`.

- 12 puslapių prie1440 ir390px; papildomai320/375/801/1024. Horizontalaus puslapio išplitimo ir sugedusių paveikslų nėra.12 neaktyvių karuselių paveikslų atidėti už matomos horizontalios srities; tai ne paveikslų klaidos.
- 261/261 originalaus turinio fragmentų, vienas H1 ir visi kontaktai kiekviename atitinkamame puslapyje. Nėra išorinių svetainės script. Visų12 native puslapių digest identiški ankstesniam source.
- Public `npm run test:core`:305/305; dvi naujos reikšmingos regresijos tikrina persidengiančią semantinę/raidžių žymą ir saugių stilių ribas. TypeScript, scoped ESLint, production build ir du RSC manifests PASS.
- Native SEO smoke:12 puslapių, canonical/schema/sitemap/robots/LLMS/host isolation/404 PASS. Vietinio formos kelio17 patikrų PASS; SMTP išjungtas, trys sintetinės eilutės pašalintos.
- Lighthouse13.6/Chrome156 simulated mobile:90 performance,100 accessibility,100 best practices; LCP3.70s,TBT44ms,CLS0. Prieš šriftų hint buvo du89 balų bandymai su CLS0.00847; visi failai išsaugoti. Ankstesnio96 rezultato benchmark757, dabartinių1952-2103, todėl tai nėra kontroliuotas vien kodo greičio palyginimas.90 yra faktinis dabartinis laboratorinis skaičius. Tai nėra production lauko INP ar visos WCAG atitikties pažyma.

Playwright relay užstrigo; patikimi galutiniai DOM matavimai, realūs click/keyboard veiksmai ir vaizdai surinkti veikiančiu IAB/CUA įrankiu. AX scroll eksperimentų nelaikome produkto defektu ar sėkminga slinkimo patikra.24 viso puslapio vaizdai padaryti prieš vien resursų hint pakeitimą; galutinė375/801 geometrija ir šriftai po jo patvirtinti. Fiksuoti fonai vertinami ir tikro viewport kadre/interaktyvioje versijoje, ne vien ilgame paveiksle.

## Peržiūra ir likusios ribos

[Interaktyvi vietinė versija](http://127.0.0.1:8918/) · [Atnaujintas palyginimas](http://127.0.0.1:8919/?page=home) · [Šešių pataisymų faktiniai rezultatai](http://127.0.0.1:8919/audit).

Sutarti mobilūs du kortelių stulpeliai, matomas skambinimas, kontrastas, formos laukų pavadinimai ir faktinis privatumo tekstas išlaikyti. Roko neįtraukti ozono teiginiai neperrašyti. Fiziniai Safari/Android įrenginiai nebandyti. Tikras inbox pristatymas, operatoriaus privatumo faktai, atsarginė kopija, native approve/release ir production perjungimas tebėra ankstesnės atskiros paleidimo sąlygos. Main nesujungtas, kito PC adoption neteigiama.
