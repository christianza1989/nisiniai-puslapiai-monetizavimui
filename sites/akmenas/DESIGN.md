---
name: "akmenas.lt"
description: "Namų medžiagų atlasas: akmens stalviršių pasirinkimui skirta redakcinė sąsaja."
colors:
  paper: "#f5f1e9"
  ink: "#29251f"
  muted: "#655d52"
  line: "#cfc4b5"
  accent: "#87472f"
  accent-hover: "#693721"
  soft: "#e8dfd2"
  inquiry-ground: "#e0c5b0"
  field-ground: "#fcfaf6"
  field-line: "#9d8e7b"
  narrow-divider: "#b8aa97"
  outer-ground: "#ece5db"
  selection: "#d6ac95"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(42px, 5.9vw, 86px)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  display-narrow:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(42px, 10.5vw, 66px)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  page-title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(38px, 4.8vw, 68px)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  page-title-narrow:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "38px"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(32px, 3.35vw, 48px)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  article-heading:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "35px"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  article-heading-narrow:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.65
  body-narrow:
    fontFamily: "Manrope, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  lead:
    fontFamily: "Manrope, sans-serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.5
  lead-narrow:
    fontFamily: "Manrope, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.65
  navigation:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  note:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  control: "2px"
spacing:
  compact: "12px"
  text: "20px"
  action: "22px"
  standard: "24px"
  grid: "32px"
  separation: "36px"
  image: "42px"
  shell-wide: "56px"
  section-narrow: "62px"
  section-wide: "112px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.paper}"
  text-link:
    textColor: "{colors.accent}"
    typography: "{typography.label}"
  text-field:
    backgroundColor: "{colors.field-ground}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 15px"
    width: "100%"
  textarea-field:
    backgroundColor: "{colors.field-ground}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 15px"
    width: "100%"
  navigation:
    textColor: "{colors.ink}"
    typography: "{typography.navigation}"
  menu-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "12px 20px"
  guide-contents:
    textColor: "{colors.muted}"
    padding: "18px 0 0"
  material-row:
    textColor: "{colors.ink}"
    padding: "20px 0"
  guide-entry:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
---

# Design System: akmenas.lt

## Overview

**Creative North Star: "Namų medžiagų atlasas"**

„Namų medžiagų atlasas“ remiasi tikrais informacinės sąsajos elementais: šiltu popieriaus lauku, didelėmis redakcinėmis antraštėmis, akmens faktūrų iliustracijomis ir linijomis atskirtais palyginimais. Paviršiaus nuotrauka suteikia medžiagos pojūtį; jos neįrodo atsparumo, kainos ar projekto atlikimo. Nuosekli forma padeda skaitytojui atskirti medžiagą, pasiruošimą ir priežiūrą.

Fraunces ir Manrope kontrastas išlaiko atlaso charakterį per pradžią, gidų indeksą, straipsnius ir formą. Spalva žymi veiksmą, o skaitomumą kuria stulpelio plotis, tarpai ir antraščių hierarchija. Gidai išlaiko ramaus skaitymo režimą; valdikliai remiasi vietinėmis HTML nuorodomis, forma ir išskleidimu.

Tai po įgyvendinimo iš CSS išgauta nišos sistema, agento pasirinkta pagal PROJECT_ADAPTATION.md. Normatyvinis spalvų šaltinis yra CSS; qa/runtime-a11y.json taip pat patvirtina popieriaus lauką rgb(245, 241, 233) ir paletės kintamuosius. Šiltesni galutinių PNG fono pikseliai nesukuria antros paletės: skirtumo priežastis nežinoma.

**Key Characteristics:**

- Medžiagos pojūtis per peržiūrėtas rastrines iliustracijas.
- Redakcinės serifinės antraštės ir aiškus sans tekstas.
- Plokšti paviršiai, linijomis skiriamos informacijos eilutės.
- Terakotos veiksmai ir beveik stačiakampiai valdikliai.
- Skaitymo stulpelis su vietine gido skyrių navigacija.

**Normatyviniai šaltiniai:** [akmenas-site.module.css](C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/akmenas-site.module.css), SHA-256 `046d5d7be4966010f19a0fbaef01cf196d4cb727e899cfc0ec9a4a0606ebb584`; [akmenas-site.tsx](C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/akmenas-site.tsx), SHA-256 `3f516ab27c08ba033bd0e68fff15dfa43e0289f8003c3ba399e6dcbf3bfaa033`. Tai bendrame core izoliuotas nišos rendereris. Šis failas nėra kitų domenų brand sistema. Frontmatter spalvos ir tipografijos vaidmenys yra dabartinio kodo vertės, o spacing – dažniausiai kartojamų intervalų ištrauka, ne visų vienkartinių tarpų katalogas.

**Įrodymai ir ribos (2026-10-01):**

- Perskaityti [PRODUCT.md](PRODUCT.md), [DIRECTION.md](DIRECTION.md), [FINISH-REVIEW.md](FINISH-REVIEW.md), [FINISH-VERDICT.md](FINISH-VERDICT.md) ir [CONCEPT-PROVENANCE.md](CONCEPT-PROVENANCE.md). Dokumentavimo pass peržiūrėjo visus 17 galutinių vaizdų: pradžią 1440/390/320/768, tris gidus 1440/390/320, palyginimo gidą 768, indeksą 320 ir formą 390/320. [.impeccable/review/desktop.png](.impeccable/review/desktop.png) ir [mobile.png](.impeccable/review/mobile.png) SHA-256 sutampa su atitinkamais `qa/home-desktop.png` ir `qa/home-mobile.png`. Tai failų peržiūra; dokumenter naršyklės bandymų nekartojo.
- [qa/runtime-a11y.json](qa/runtime-a11y.json) patvirtina CSS paletę ir 17 px siaurą body; [qa/keyboard-final.json](qa/keyboard-final.json) pateikia tėvinio vykdytojo Enter meniu išskleidimo bei `turinys` fokuso su 3 px kontūru įrodymą. Šie bandymai šiame dokumentavimo pass nepriklausomai neatlikti. Visi interaktyvūs elementai nėra vienodo dydžio: ženklas siaurai yra 32 px aukščio, checkbox – 21 px didesnės paspaudžiamos etiketės viduje, prozos nuorodos lieka tekstinės.
- Originali seed `aea5f86f` pilna išdalinta ranka, pradinis mode/catalog ir išspausdintas originalus output lieka **UNVERIFIED**. Dabartinio katalogo `c3b204a1eed6` replay patvirtina tik key / assigned index 5; skiriasi challengers ir tai nėra pilnas istorinio pasirinkimo atkūrimas. Nauja kryptis šiuo dokumentavimu nepasirinkta.
- Galutinis reviewer verdict yra **fixes-only ship**: F1 išspręstas nurodytos dalinės reprodukcijos ribose, F2 tablet atidarymas sutvarkytas. Pradinis craft vertinimas **13/14 = 9,29/10** liko neperskaičiuotas; šis dokumentavimas balo nekelia.
- Tikras **200% browser zoom lieka UNVERIFIED**. 320 px reflow jo nepakeičia. Screenshot fono `#fff3d9/#fff2d8` ir normatyvinio CSS skirtumo priežastis nežinoma; šios screenshot vertės nėra tokenai. Nėra universalaus ship, all-pass, WCAG, teisinio, reitingų, paklausos ar production readiness patvirtinimo.

## Colors

Paletė primena šiltą popierių, akmens briauną ir terakotą. Tikslios spalvos pateiktos tik normatyviniame frontmatter; žemiau aprašoma jų paskirtis.

### Primary

- **Terakota — `accent`:** užpildyti pagrindiniai veiksmai, tekstinės veiksmų nuorodos, ženklo domeno galūnė, caret, checkbox ir fokusas.
- **Patamsinta terakota — `accent-hover`:** tik užpildyto pagrindinio mygtuko hover.

### Neutral

- **Šiltas popierius — `paper`:** bazinis nišos paviršius, mobiliojo meniu skydelis ir tekstas užpildytuose mygtukuose.
- **Akmens rašalas — `ink`:** pagrindinis tekstas ir antraštės; nėra grynos juodos kontrastinio demonstravimo.
- **Prigesintas akmuo — `muted`:** paaiškinimai, gido turinys, šaltinių kontekstas ir metaduomenys.
- **Briaunos linija — `line`:** header/footer, materialų, šaltinių ir susijusių žingsnių skyrikliai.
- **Minkštas sluoksnis — `soft`:** bendras homepage gidų laukas; atskiri gidai jame neturi savo fono dėžių.
- **Užklausos laukas — `inquiry-ground`:** kontaktinio kvietimo juosta.
- **Šviesus formos laukas — `field-ground` ir lauko briauna — `field-line`:** teksto laukų bei textarea paviršius ir vieno pikselio rėmelis.
- **Siauro sąrašo briauna — `narrow-divider`:** papildomi homepage gidų skirtukai mažame ekrane.
- **Išorinis popieriaus sluoksnis — `outer-ground`:** `min-width: 1440px` aplinka už 1440 px puslapio juostų.
- **Pažymėjimo atspalvis — `selection`:** teksto žymėjimo fonas, su `ink` tekstu.

**The Functional Accent Rule.** Terakotos akcentu žymėkite veiksmą, nuorodą ir fokusą. Neperkelkite jo į visų straipsnio pastraipų tekstą ar dekoratyvias žymas.

Spalvų metaduomenų 8 žingsnių OKLCH juostos sidecar yra sintetinis panelės paletės apžiūros priedas. Jos nėra naudojamos aplikacijoje ir nesuteikia papildomų normatyvinių spalvų.

## Typography

**Display Font:** Fraunces, su Georgia ir serif atsarga.  
**Body Font:** Manrope, su sans-serif atsarga.

Šriftai talpinami vietoje `/fonts/akmenas/`, turi `font-display: swap`, latin bei latin-ext aprėptį ir `font-synthesis: none`. Fraunces antraštės naudoja realų 400 svorį; Manrope tekstas – normalų 400, etiketes ir veiksmus – 600. Serifinės antraštės turi `text-wrap: balance`. Nėra atskiro mono vaidmens ar fiksuotos geometrinės visų dydžių proporcijos.

### Hierarchy

| Vaidmuo | Frontmatter tokenas | Paskirtis |
| --- | --- | --- |
| Didžioji pradžios antraštė | `display` / `display-narrow` | Dviejų prasminių dalių h1; siauras variantas iki 760 px. |
| Vidinio puslapio antraštė | `page-title` / `page-title-narrow` | Gidų, indekso ir kontaktų h1; iki 760 px fiksuotas siauras dydis. |
| Sekcijos antraštė | `headline` | Homepage h2 su kintamu dydžiu. |
| Straipsnio skyriaus antraštė | `article-heading` / `article-heading-narrow` | Gido ir paprasto straipsnio h2. |
| Gido įrašo pavadinimas | `title` | Homepage trijų gidų h3. |
| Skaitymo tekstas | `body` / `body-narrow` | Pastraipos, sąrašai, formos įvestis; iki 760 px siauras variantas. |
| Įvadinis paaiškinimas | `lead` / `lead-narrow` | Pirma homepage įvado pastraipa. |
| Etiketė ir veiksmas | `label` | Formos etiketės, užpildyti mygtukai, tekstinės veiksmų nuorodos. |
| Navigacija | `navigation` | Desktop meniu, header veiksmo tekstas. |
| Pastaba | `note` | Formos pagalba, metaduomenys, footer apatinė eilutė. |

Kontekstiniai tikro kodo skirtumai: indeksas naudoja h3 (38 px, siaurai 31 px), straipsnio h3 (27 px), užklausos juostos h2 (56 px, siaurai 42 px), ženklas (38 px, siaurai 32 px; line-height 1). Ženklo `.lt` dalis yra (0,68 em). Metaduomenys ir breadcrumb siaurai mažėja iki (13 px); šaltinių paaiškinimai (15 px, siaurai 14 px), consent tekstas (15 px / 1,6). Tai kontekstiniai vaidmenys, ne naujo bendro display laiptelio priežastis.

**The Editorial Contrast Rule.** Fraunces skirkite antraštėms ir ženklui, Manrope – skaitomam tekstui, navigacijai ir formoms. Išlaikykite jų vaidmenų skirtumą visame puslapyje.

## Layout

Plačios nišos juostos yra centruotos (max-width 1440 px). Horizontalūs pakraščiai yra (56 px), iki 1100 px – (32 px), iki 760 px – (20 px). Virš 1440 px header, hero, vidinis turinys, medžiagų ir pasiruošimo sekcijos bei footer gauna `paper` foną ant `outer-ground`. Gidų ir užklausos laukai išlaiko savo toną.

Homepage atidarymas plačiai turi (1,18fr / 1fr) stulpelius, (70 px) tarpą ir lygiuoja jų apačias. Jo h1 paveldi bendro `app/globals.css` (max-width 650 px); tablet taisyklė nustato (max-width 760 px). **761–960 px** taisyklė sukrauna atidarymą į vieną stulpelį su (28 px) tarpu ir `align-items: start`; ji saugo antraštės pirmumo vietą 768 px ekrane. Iki 760 px visas hero tampa dokumento seka. Didelis vaizdas seka tekstą ir veiksmus; tai šio homepage išraiška, ne privalomas visų būsimų paviršių hero maketas.

Pagrindinių sekcijų vertikalūs pakraščiai yra (112 px), siaurai – (62 px). Medžiagos derina vaizdą ir tekstą (1fr / 1,05fr), pasiruošimas – (1fr / 1fr), plačiai tarp jų (100 px), iki 1100 px – (44 px). Homepage gids turi tris stulpelius su (32 px) tarpu, iki 1100 px – (24 px), iki 760 px – vieną nuoseklų sąrašą. Juostos h2 ir paaiškinimas plačiai gali dalintis dviem stulpeliais; mažame ekrane jų eilės tvarka išlieka.

Gidas plačiai turi navigacijos šoną (flex-basis 245 px, top 32 px, sticky) ir skaitymo stulpelį (max-width 760 px), tarpą (76 px). Iki 1100 px navigacija yra (210 px), tarpas (36 px). Iki 760 px navigacija tampa static prieš gido vaizdą; išskleidimas natyvus. Paprastų teksto puslapių stulpelis yra (max-width 780 px), centruotas. Paragrafų bendras matas (max-width 70ch).

Indekso eilutė plačiai naudoja (360 px / likusi dalis) ir (56 px) tarpą; iki 1100 px (290 px) ir (36 px); siaurai vaizdas, pavadinimas, paaiškinimas ir veiksmas sukraunami. Forma plačiai turi du stulpelius su (90 px) tarpu, iki 1100 px (44 px), iki 760 px ji tampa viena seka. Formos maksimalus plotis (650 px).

**The Reading Measure Rule.** Gido tekstas lieka ne platesniame nei 760 px stulpelyje, pastraipos – ne platesnės nei 70ch. Siaurame ekrane turinio navigacija įsilieja į dokumento srautą.

Vaizdų kadravimas yra tikro maketo dalis: hero aspect-ratio (2,24), siaurai (1,25), object-position (50% 63%), siaurai (51% 64%); materialų vaizdas (1,2), siaurai (1,4); gido miniatiūra (1,5); pasiruošimo vaizdas (1,06), siaurai (1,45); straipsnio pradžios vaizdas (1,8), siaurai (1,5). Naudojamas `object-fit: cover` ir bendras media core `srcset`. Pakeitus maketo plotį būtina tikrinti tikrą `sizes`, variantų failus ir prasmę kadre.

## Elevation & Depth

Sąsajos paviršiai plokšti. Gylį kuria `paper` / `soft` / užklausos lauko tonų kaita, tekstūros vaizde ir ploni informacijos skyrikliai. Nuotraukose esantys fiziniai plokščių šešėliai priklauso rastrinei iliustracijai; jie nėra kortelių CSS šešėlių norma.

### Shadow Vocabulary

- **Mobiliojo meniu sluoksnis:** `box-shadow: 0 16px 28px #29251f18`. Jis atsiranda tik meniu navigacijos skydelyje, virš turinio (z-index 20).
- **Fokusas:** terakotos `accent` kontūras (3 px, offset 5 px); tai funkcinis kontūras, ne šešėlis.

**The Flat Surface Rule.** Straipsniai, gidų įrašai, materialų eilutės ir mygtukai neturi CSS šešėlių. Vienintelis nišos CSS šešėlis skirtas virš turinio atsidarančiam mobiliajam meniu.

Nišos modulis neapibrėžia animacinių įėjimų ar transition sistemos. Pagrindinio mygtuko active būsena pasislenka (translateY 1 px), o nišos `prefers-reduced-motion: reduce` taisyklė šį transform pakeičia į `none`. Bendras `app/globals.css` įprastai nustato `html { scroll-behavior: smooth; }`, tačiau jo shared reduced-motion override visiems elementams ir `::before` / `::after` nustato `scroll-behavior: auto !important; transition-duration: .01ms !important`. Abi taisyklės patvirtintos pagrindinio core ir izoliuotos `output/akmenas-production/` kopijos šaltiniuose. Browser preference emuliacija šiame dokumentavimo pass nevykdyta; šaltinio taisyklės nesuteikia universalios reduced-motion all-pass garantijos.

## Shapes

Akmens atlaso tekstinės ir rastrinės sritys išlaiko stačiakampius kontūrus. Vienintelis deklaruotas nišos border-radius yra frontmatter `control`: taikomas pagrindiniams mygtukams, input ir textarea. Nuotraukos neturi apvalinto maskavimo, gidų blokai nėra atskiri apvalūs paviršiai. Vieno pikselio linijos žymi turinio ribą, ne dekoratyvų iškeltos kortelės rėmą.

Ikonos yra tikri inline SVG: rodyklė (20 × 20 px, stroke-width 1,5), mobiliojo meniu linijos (18 × 18 px). Tai nėra teksto glifai. SVG yra dekoratyvus prie aiškaus veiksmo teksto ir `aria-hidden`.

## Components

### Buttons

Aiškus terakotos stačiakampis nurodo pagrindinį kitą veiksmą.

- **Forma ir atstumai:** `button-primary` tokenai, min-height (52 px), inline-flex, turinio tarpas (22 px), centruotas tekstas ir rodyklė.
- **Hover:** tik `accent-hover` fonas. **Active:** žemyn (1 px), su reduced-motion išimtimi. **Disabled:** opacity (0,55), cursor wait; tai esama CSS būsena, native form kode ji šiame renderer'yje nėra dinamiškai valdoma.
- **Focus:** bendras matomas terakotos kontūras. Nėra papildomo pakilimo, šešėlio ar animacinio transition.
- **Tekstinis veiksmas:** `text-link` – pabrauktas sans tekstas, rodyklė su (14 px) tarpu, min-height (44 px). Atskiro ghost mygtuko ar filtro chip šiame dizaine nėra.

### Cards / Containers

Gido įrašas yra vaizdo ir redakcinio teksto vienetas ant bendro sekcijos lauko.

Homepage įrašo h3 naudoja `title`, paaiškinimas – (16 px) `muted`, tekstinis skaitymo veiksmas – `text-link`. Nuotrauka baigiasi prieš pavadinimą (26 px, siaurai 22 px). Įrašas neturi vidinio padding, atskiro fono, radius ar shadow. Siaurų homepage gido įrašų tarpus skiria `narrow-divider`, (44 px) viršutinis margin ir (36 px) padding po pirmo įrašo.

### Inputs / Fields

Beveik stačiakampis šviesus laukas ir aiški išorinė etiketė sudaro įvedimo vietą.

`text-field` ir `textarea-field` naudoja vieno pikselio `field-line` rėmą, frontmatter padding bei `control` kampus; input min-height (50 px), textarea min-height (190 px), resize vertical. Etiketė – `label` su (8 px) apačios tarpu; pagalba – `note` / `muted`; siaurai įvesties dydis paveldi `body-narrow`. Caret ir checkbox accent išlaiko `accent`.

Consent checkbox yra natyvus (21 × 21 px), su didesne etikete, (14 px) tarpu ir (15 px / 1,6) tekstu. Klaidos, required ir ribos naudoja HTML/browser bei bendro formos backend kelią; specialaus nišos error ar success spalvų tokeno ir toast komponento nėra. Jų nekurkite pagal panelės demonstracinį snippet.

### Navigation

Desktop navigacija naudoja `navigation`, inline nuorodas su min-height (44 px), (32 px) tarpu, iki 1100 px – (20 px). Header veiksmas turi terakotos apatinę vieno pikselio liniją. Iki 760 px abi desktop dalys paslepiamos, lieka ženklas ir natyvus `details/summary` „Meniu“. Skydelis atsidaro dešinėje (top 52 px, min-width 260 px) ir naudoja `menu-panel`, `line` rėmą bei vienintelį meniu šešėlį. Summary turi min-height (44 px). Nėra atskiros CSS aktyvaus maršruto pill būsenos.

Gido turinys naudoja vietinius in-page anchor, `details open` su aiškiu summary ir tikrais skyriaus ID. Nuorodos (15 px / 1,5) turi min-height (44 px) ir (9 px 0) padding. Siaurai contents tampa dokumento dalimi. Breadcrumb išlaiko realų kelią, tekstinę slash skirtį ir `aria-current` paskutiniame elemente.

### Materialų atlaso eilutės

Native `dl / dt / dd` išsaugo pavadinimo ir klausimo santykį. Plačiai pavadinimo stulpelis (150 px), tarpas (24 px), eilutės padding (20 px 0), viršuje `line`. Pavadinimas (18 px / 600), paaiškinimas (16 px / `muted`). Iki 760 px stulpeliai tampa viena seka su (6 px) tarpu ir (16 px 0) padding. Šios eilutės nekeičia iliustracijos į interaktyvų bandymą ar nepagrįstą reitingą.

Sidecar saugo 9 savarankiškus tikrų komponentų HTML/CSS pavyzdžius. Jie nėra React runtime pakaitalas: medija, turinys, publikavimo filtras ir formos backend lieka aplikacijos atsakomybė. Paletė ten išskleista į literal CSS, nes originalūs kintamieji deklaruoti nišos `.site`, o ne panelės `:root`; font stacks atitinka sistemą, tačiau panelė be font failų gali parodyti fallback. Nesintezuokite rasterio SVG ar CSS dekoracija.

## Do's and Don'ts

### Do:

- **Do** naudokite frontmatter tokenus kaip normatyvinę CSS sistemos kopiją; screenshot pikseliais jų nekeiskite.
- **Do** išlaikykite serifinių antraščių ir sans teksto kontrastą bei gido skaitymo matą.
- **Do** medžiagos faktūrą rodykite per tikrą peržiūrėtą mediją, su temos alt ir teisingu responsive variantu.
- **Do** išlaikykite antraštė → paaiškinimas → veiksmai → vaizdas tvarką siaurame ir 761–960 px atidaryme.
- **Do** matomą fokusą, vietinį menu/contents išskleidimą ir formų etiketes laikykite komponento dalimi.

### Don't:

- **Don't** kurkite CSS imituotų akmens plokščių, tekstūrų ar kietų paslinktų šešėlių; medžiagos charakterį čia neša rastras.
- **Don't** suteikite gidų įrašams atskirų plaukiojančių kortelių, didelio apvalinimo ar naujos šešėlių sistemos.
- **Don't** įveskite dekoratyvių kicker/eyebrow eilučių, teksto glifų ikonų ar sisteminio display šrifto kaip naujos atlaso normos.
- **Don't** parodykite iliustracijos kaip atlikto kliento projekto ar techninio bandymo įrodymo.
- **Don't** laikykite šio dokumentavimo pass universaliu ship, all-pass, 10/10, prieinamumo sertifikatu ar production readiness.

**Not canonized / unrepaired:** craft-floor pažeidimų reviewer nenurodė. Nežinoma PNG/CSS spalvos skirtumo priežastis, originalaus seed pilnos rankos trūkumas ir nepatikrintas 200% zoom yra įrodymų ribos; jos nepaverstos naujais tokenais, normomis ar PASS. Įprastas smooth-scroll su shared reduced-motion `auto` override ir mažesni ženklas/checkbox/inline-link taikiniai aprašyti kaip faktinis elgesys, ne kaip universalaus prieinamumo patvirtinimas. Browser preference emuliacija nevykdyta. Aplikacija šiame dokumentavimo pass nekeista.

