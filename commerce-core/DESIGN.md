---
name: "Prekybos valdymas"
description: "Rami prekybos darbo erdvė užsakymams, prekėms ir kasdieniams veiksmams"
colors:
  accent: "#394743"
  accent-hover: "#283831"
  ink: "#24262b"
  muted: "#62666f"
  paper: "#fff"
  canvas: "#f5f5f7"
  line: "#e1e2e6"
  hover: "#f0f1f3"
  masthead: "#242b29"
  masthead-secondary: "#d6deda"
  selection: "#dbe5df"
  focus: "#335fd0"
  selected: "#e7ece9"
  success: "#236044"
  error: "#a32e38"
  button-border: "#c7c9ce"
  button-hover-border: "#a2a6ad"
  button-active: "#e7e9ed"
  disabled-ink: "#777c84"
  disabled-button: "#f2f3f5"
  input-border: "#b5b9c0"
  placeholder-ink: "#6d717a"
  disabled-input: "#f1f2f4"
  navigation: "#f0f1f2"
  navigation-hover: "#e7e9eb"
  navigation-active-border: "#d9dcdf"
  navigation-active-ink: "#26392d"
  filter-active-ink: "#283f32"
  notice-surface: "#fff4dd"
  notice-ink: "#644c1d"
  notice-border: "#ead6ab"
  table-heading-ink: "#5b6069"
  table-heading-surface: "#fafafb"
  table-row-hover: "#fcfcfd"
  badge-surface: "#edf0f2"
  badge-ink: "#4c535b"
  waiting-surface: "#fcf0d7"
  waiting-ink: "#72541a"
  success-surface: "#e0f0e5"
  success-ink: "#246141"
  loading: "#e6e8eb"
  status-border: "#c6d9cf"
  status-surface: "#edf7f0"
  status-ink: "#264f37"
  error-surface: "#fff0f1"
  error-border: "#e4b6bc"
  busy-ink: "#485761"
  busy-surface: "#eff3f7"
  busy-border: "#d4dce4"
  save-border: "#b9c6bf"
  backdrop: "#202726b3"
  transparent: "transparent"
typography:
  headline:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline-mobile:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  minor-title:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.4
  detail-title:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  masthead:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  control:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  control-primary:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.5
  hint:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  table:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  table-heading:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  utility:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  navigation:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
  navigation-active:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  filter:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  filter-active:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
  badge:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  metric:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.5
  textarea:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.6
  textarea-labeled:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.6
rounded:
  loading: "4px"
  compact: "6px"
  control: "8px"
  surface: "12px"
spacing:
  micro: "4px"
  tight: "6px"
  small: "8px"
  compact: "10px"
  gap: "12px"
  control-inline: "14px"
  medium: "16px"
  comfortable: "18px"
  group: "20px"
  section: "24px"
  large: "28px"
  desktop: "32px"
  content-inline: "36px"
  page-bottom: "64px"
  mobile-bottom: "80px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    typography: "{typography.control-primary}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    typography: "{typography.control-primary}"
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    typography: "{typography.control}"
  button-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    typography: "{typography.control}"
  button-active:
    backgroundColor: "{colors.button-active}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    typography: "{typography.control}"
  button-disabled:
    backgroundColor: "{colors.disabled-button}"
    textColor: "{colors.disabled-ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    typography: "{typography.control}"
  button-quiet:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
    typography: "{typography.control}"
  button-link:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    padding: "0"
    typography: "{typography.control}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  input-disabled:
    backgroundColor: "{colors.disabled-input}"
    textColor: "{colors.placeholder-ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  navigation-item:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    typography: "{typography.navigation}"
  navigation-item-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navigation-active-ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    typography: "{typography.navigation-active}"
  filter:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    padding: "8px 10px"
    typography: "{typography.filter}"
  filter-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.filter-active-ink}"
    rounded: "{rounded.compact}"
    padding: "8px 10px"
    typography: "{typography.filter-active}"
  badge:
    backgroundColor: "{colors.badge-surface}"
    textColor: "{colors.badge-ink}"
    rounded: "{rounded.compact}"
    padding: "4px 8px"
    typography: "{typography.badge}"
  badge-warning:
    backgroundColor: "{colors.waiting-surface}"
    textColor: "{colors.waiting-ink}"
    rounded: "{rounded.compact}"
    padding: "4px 8px"
    typography: "{typography.badge}"
  badge-success:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success-ink}"
    rounded: "{rounded.compact}"
    padding: "4px 8px"
    typography: "{typography.badge}"
  notice:
    backgroundColor: "{colors.notice-surface}"
    textColor: "{colors.notice-ink}"
    rounded: "{rounded.control}"
    padding: "16px 18px"
    typography: "{typography.table}"
  surface:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px"
    typography: "{typography.body}"
  status:
    backgroundColor: "{colors.status-surface}"
    textColor: "{colors.status-ink}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
    typography: "{typography.table}"
  status-error:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.error}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
    typography: "{typography.table}"
  status-busy:
    backgroundColor: "{colors.busy-surface}"
    textColor: "{colors.busy-ink}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
    typography: "{typography.table}"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "28px"
    typography: "{typography.body}"
---

## Overview

**Creative North Star: "Prekybos darbo erdvė"**

Rami mažos parduotuvės darbo erdvė: grafito viršutinė juosta, šviesus neutralus fonas, pastovi šoninė navigacija ir balti duomenų paviršiai. Užsakymas, prekė ir kitas konkretus įrašas turi aiškią vietą, būseną bei veiksmą. Žaliai pilkas akcentas sutelkia dėmesį į pirminį veiksmą; bendrą hierarchiją kuria išdėstymas ir tipografika.

Tai bendro prekybos administravimo modulio sistema. Viešos Memocasting parduotuvės tapatybė aprašoma atskirai. 2026-10-25 atnaujinimas pakeičia ankstesnę žalią administravimo sistemą pagal savininko deleguotą pertvarkymo pavedimą. Krypties palyginimas ir konkretaus ekrano planas yra [administravimo apraše](../sites/memocasting/ADMIN_DASHBOARD_2026_10_25.md); žemiau užfiksuota baigta realizacija.

**Key Characteristics:**

- Pastovi darbo vieta ir aiškiai pažymėtas navigacijos skyrius.
- Įskaitomos lentelės, būsenų žymos ir atskiras prekės redaktorius.
- Lietuviški valdikliai, matomas fokusas ir telefono išdėstymas.

Šaltiniai: public/admin.css, public/admin.html, public/admin.mjs, public/operator-workspace.mjs, public/catalog-ui.mjs ir public/catalog-editor.mjs. YAML tokenai aprašo tikrą CSS; elgsenos bei papildomi komponentų stiliai pateikti .impeccable/design.json. Naujos nuotraukos ar generuoti rastriniai vaizdai šiam duomenų ekranui nenaudojami.

## Colors

Paletė neutrali, su vienu santūriu žaliai pilku veiksmų akcentu. Tikslios reikšmės yra frontmatter; ši dalis nurodo jų paskirtį.

**Pirminis akcentas.** accent ir accent-hover skirti pirminiams mygtukams bei nuorodoms. selected ir filter-active-ink pažymi pasirinktą užsakymų filtrą. success deklaracija išlieka šaltinio kintamųjų dalis; būsenų žymos naudoja atskirą success-surface ir success-ink porą.

**Neutralūs paviršiai.** ink yra pagrindinis tekstas, muted — paaiškinimai. canvas, navigation ir paper atskiria darbo foną, navigaciją ir įrašo paviršių. masthead bei masthead-secondary sudaro viršutinę juostą. line žymi ribas; lentelių antraštės ir eilučių užvedimas naudoja table-heading-surface bei table-row-hover. Įvesties ir mygtuko kraštinės turi atskirus tokenus.

**Būsenos.** notice ir waiting grupės skirtos įspėjimui bei laukimui, success grupė — patvirtintai būsenai, error grupė — klaidai, busy grupė — vykdomam veiksmui. status grupė yra atskiro rezultato pranešimo pora. focus naudojamas matomam klaviatūros fokusui, selection — teksto pažymėjimui, backdrop — modalinio lango uždangai.

**The State Label Rule.** Spalvą visada lydi būseną ar veiksmą įvardijantis tekstas; žalia žyma savaime nepatvirtina mokėjimo, siuntos ar dokumento baigties.

## Typography

Viena sistemos sans šeima su Segoe UI ir Arial atsarga. Failai ar išoriniai šriftai nekraunami; galutinį šeimos pasirinkimą lemia įrenginyje prieinamas šriftas. Naudojami normalūs 400, 500 ir 600 svoriai. Kodo fragmentai naudoja naršyklės monospace šeimą, o išankstinio formatavimo blokai perima bendrą tekstą.

- headline yra skyriaus H1; headline-mobile taikomas telefono išdėstyme. title yra H2, minor-title — H3, detail-title — atverto užsakymo antraštė.
- body ir valdiklių bazė išlaiko patogų kasdienį skaitymą. label bei masthead pabrėžia lauką ar darbo vietą. hint, table ir utility atskiria paaiškinimus, duomenis bei pagalbines etiketes.
- navigation ir navigation-active išlaiko vienodą eilučių ritmą; aktyvumas parodomas svoriu ir paviršiumi. badge skirtas trumpai tekstinei būsenai; metric — užsakymų suvestinės skaičiui. textarea ir textarea-labeled turi laisvesnį eilučių intervalą.

Įvestys naudoja font: inherit. Į etiketę įdėtas laukas perima label dydį ir svorį (15px, 600); užsakymų paieška išlaiko šį dydį, bet naudoja 400 svorį. Prekės redaktoriaus textarea nustato 16px dydį ir iš etiketės perima 600 svorį; kitų į etiketes įdėtų textarea rolė yra textarea-labeled. Savarankiškas laukas, pavyzdžiui, prisijungimo formoje, perima body rolę.

Ilgesnė pastraipa ribojama iki 72ch; lentelėms ši riba netaikoma. Sumos lygiuojamos dešinėje ir naudoja tabulinius skaitmenis; suvestinės skaičiai taip pat tabuliniai. Antraštės, aprašymai, etiketės ir reikšmės gali persikelti. Telefone pagalbiniai duomenys ir prekių eilučių lentelė naudoja utility dydį. Svarbių veiksmų tekstas nemažinamas vien tam, kad tilptų.

## Layout

**The Stable Workspace Rule.** Navigacija lieka prieinama per visą darbą; atveriamas vienas skyrius arba vienas pasirinkto įrašo redaktorius.

Pagrindinis turinys centruojamas iki 1800px. Darbo tinklelis turi 232px navigaciją ir lankstų duomenų stulpelį. Viršutinė juosta yra prilipusi prie viršaus, mažiausiai 64px aukščio; navigacija prilimpa žemiau jos ir turi savo slinkimą. Turinio tarpai — 32px viršuje, 36px šonuose ir 64px apačioje. Užsakymo kontaktų ir prekių apžvalga turi du nevienodus stulpelius. Paprasta forma ribojama iki 720px, prekės redaktorius — iki 1180px.

Tikri lūžio taškai:

- Nuo 1200px prekės forma naudoja du stulpelius; bendrieji prekės duomenys, aprašymai, nuotraukos, pasirinkimai ir išsaugojimo juosta išlieka per visą plotį.
- Iki 1100px navigacija siaurėja iki 204px, turinio tarpai — iki 28px ir 24px; užsakymo apžvalga tampa vieno stulpelio.
- Iki 760px viršutinė juosta yra mažiausiai 60px, navigacija tampa virš turinio esančiu išskleidžiamu meniu su dviem mygtukų stulpeliais. Turinys turi 24px, 16px ir 80px tarpus. Suvestinė persitvarko į du stulpelius; formos, aprašų poros ir medijos eilutės — į vieną.

Telefone įprastos lentelės tampa vertikaliais įrašais su duomenų etiketėmis. Užsakymo prekių eilučių lentelė išlaiko tikrą stulpelių struktūrą ir kompaktiškesnius tarpus. Filtrai bei veiksmų grupės persikelia į naujas eilutes. Prekės išsaugojimo juosta kompiuteryje prilimpa 12px virš apačios, telefone lieka dokumento tėkmėje. Rezultato pranešimas kompiuteryje rodomas dešinėje po viršutine juosta, telefone — 12px nuo apačios ir šonų. Spausdinimo stilius slepia valdymo juostas bei veiksmus ir palieka dokumento turinį.

## Elevation & Depth

Šešėliai nenaudojami. Gylį kuria neutralūs paviršiai, vieno pikselio kraštinės ir modalinio lango uždanga. Papildomų plaukiojančių kortelių ar dekoratyvių sluoksnių nereikia.

Mygtukų fono ir kraštinės spalva pereina per 150ms su ease kreive. prefers-reduced-motion išjungia šiuos perėjimus. Įkėlimo juosta statiška; šaltinyje nėra pulsuojančios animacijos. Pranešimo matomumo laikmatis yra elgsena, ne animacijos tokenas.

## Shapes

Valdikliai, pranešimai, mažos pasirinkimų grupės ir medijos peržiūros naudoja control kampą. Filtrai bei žymos naudoja compact kampą. Įrašo paviršiai, formų skyriai, prisijungimas ir modaliniai langai naudoja surface kampą. loading kampas skirtas įkėlimo juostai. Kraštinės plonos ir ištisinės. Piktogramos — 20px linijiniai SVG su 1.7px brūkšniu; dekoratyvios formos neatstoja valdiklio pavadinimo.

## Components

**Mygtukai ir laukai.** Įprasti ir pirminiai mygtukai, input, select bei textarea yra mažiausiai 44px aukščio. Tekstinės lentelės nuorodos yra atskira kompaktiška išimtis su 28px minimumu. Žymimasis langelis yra 20px, jo etiketės sritis — mažiausiai 44px. Pirminis veiksmas naudoja accent ir baltą tekstą; įprastas — paper paviršių bei button-border kraštinę. Quiet ir link variantai pašalina paviršiaus akcentą. Įvestys turi input-border; neaktyvi būsena ir placeholder turi atskirus tonus. Teksto laukas didinamas vertikaliai. Fokusas — 3px focus kontūras su 3px atitraukimu.

**Navigacija.** Piktograma ir lietuviškas pavadinimas sudaro vieną mygtuką. Aktyvus skyrius turi baltą paviršių, navigation-active-border, navigation-active-ink ir aria-pressed. Telefono Meniu mygtukas valdo aria-expanded; pasirinkus skyrių meniu suskleidžiamas. Prieigos bei parduotuvės ribos nustato tikrai rodomus veiksmus; medžiagų skyrius slepiamas, kai naudojama tik paprasta likučių apskaita.

**Užsakymų darbo sritis.** Balto paviršiaus viršuje yra paieška, įkeltų ir rastų įrašų skaičius bei persikeliantys būsenų filtrai. Paieška apima numerį, pirkėją, el. paštą ir prekę tik įkeltoje imtyje. Senesni užsakymai įkeliami atskiru veiksmu. Filtrai nekeičia serverio duomenų ar bendros suvestinės. Tuščias rezultatas paaiškina, kaip pakeisti paiešką. Atverta detalė grupuoja kontaktus, prekes, siuntą, dokumentus ir finansinius veiksmus.

**Prekės redaktorius.** Sąrašas ir redaktorius rodomi atskirai; pirmoji prekė neatveriama automatiškai. Atvėrus prekę rodomas jos pavadinimas, grįžimo veiksmas, išsaugoto juodraščio būsena ir nuorodos į šešis formos skyrius. Nuotraukos rodomos neapkarpytos su contain. Pasirinkimų reikšmės ir papildomi nustatymai išskleidžiami. Išsaugoti juodraštį, Peržiūrėti ir Paskelbti yra atskiri veiksmai; išsaugotas juodraštis nelaikomas paskelbta preke. Neišsaugotus pakeitimus saugo modalinis patvirtinimas, kuris pirmiausia sufokusuoja redagavimo tęsimą ir uždarius grąžina fokusą.

**Būsenos ir asinchroninis darbas.** Skyriaus įkėlimas rodo tekstą, statišką juostą ir aria-busy. Klaida pateikia atkūrimo veiksmą. Vėlyvas ankstesnio skyriaus atsakymas lieka atsietame jo konteineryje. Vykdomas veiksmas išjungia savo mygtuką ir rodo busy pranešimą; sėkmė rodoma tik po faktinio rezultato, atšauktas veiksmas jos nesukuria. Sėkmės pranešimą galima uždaryti; jis automatiškai išnyksta po 8 sekundžių. Klaida turi alert vaidmenį ir išlieka iki uždarymo arba kito pranešimo. Įprasta būsena turi status ir aria-live=polite.

**Vykdymo ir privatumo kontekstas.** Siuntėjo kontaktai, pakuotės pasirinkimas, tikri matavimai, išsaugotas pakuotės planas ir vežėjo kaina naudoja bendras formos bei lentelės roles. Kainos gavimas ir siuntos registravimas yra atskiros būsenos. Nežinoma siuntos baigtis rodo sutikrinimo veiksmą. Privatūs PDF failai, dydžio ar kontrolinės sumos klaidos ir atsisiuntimas naudoja tą patį tekstinių būsenų ritmą. Grąžinimai atskiria paruošimą, rezervuotą sumą, priežastį, vykdymą ir sutikrinimą; planned, unknown, pending, review bei succeeded būsenos remiasi tikru serverio rezultatu.

**Peržiūros riba.** Ši dokumentacija ištraukta iš dabartinio šaltinio ir palyginta su vietinėmis 2026-10-25 nuotraukomis: [užsakymai kompiuteryje](../sites/memocasting/qa/final-seo-20261025/admin-final-desktop.private.png), [užsakymai telefone](../sites/memocasting/qa/final-seo-20261025/admin-final-mobile.private.png), [finansai](../sites/memocasting/qa/final-seo-20261025/admin-finance-desktop.private.png) ir [prekės redaktorius telefone](../sites/memocasting/qa/final-seo-20261025/admin-editor-mobile.private.png). Tai privačios vietinės patikros, ne Git paketo dalis. Galutinė elgsenos, didinimo, prieigos ir įdiegtos versijos patikra fiksuojama administravimo priėmimo apraše. Šis failas neteigia pilnos WCAG atitikties, tikro naršyklės mastelio ar produkcijos priėmimo. Istoriniai siuntų, privačių failų ir grąžinimų patikros įrašai lieka jų atskiruose priėmimo dokumentuose.

## Do's and Don'ts

### Do:

- **Do** rodyti serverio patvirtintą būseną, valiutą ir aiškų veiksmo rezultatą.
- **Do** tęsti tą pačią teksto, formų, lentelių ir fokuso sistemą naujuose skyriuose.
- **Do** išlaikyti matomą įkėlimo, tuščio rezultato, klaidos ir neišsaugotų pakeitimų būseną.
- **Do** patikrinti ilgus lietuviškus pavadinimus, siaurą ekraną ir paveiktų valdiklių didinimą po reikšmingo pakeitimo.

### Don't:

- **Don't** naudoti spalvos kaip vienintelio būsenos paaiškinimo.
- **Don't** testinių dokumentų ar neprijungtų integracijų pristatyti kaip tikros apskaitos ar įvykdyto siuntimo.
- **Don't** juodraščio išsaugojimo pateikti kaip prekės paskelbimo.
- **Don't** šios administravimo sistemos automatiškai perkelti į viešą nišos parduotuvę.
