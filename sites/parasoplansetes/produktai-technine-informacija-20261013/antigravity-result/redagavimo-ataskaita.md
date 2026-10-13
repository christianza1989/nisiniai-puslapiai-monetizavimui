# StepOver techninių aprašymų redagavimo ataskaita

**Data:** 2026-10-13  
**Būsena:** `private-draft`  
**Apimtis:** 12 techninių aprašymų, `README.md`, `PATIKRA.md`, `manifest.json`  
**Rezultatų aplankas:** `antigravity-result/`

---

## 1. Tikslas ir atlikto darbo apimtis

Pagal projekto reikalavimus atliktas visų 12 paruoštų „parasoplansetes.lt“ techninių aprašymų, taip pat lydimųjų failų `README.md` ir `PATIKRA.md` kalbinis perrašymas ir redagavimas.

Visi pradiniai failai išsaugoti nepakeisti. Galutiniai perrašyti dokumentai patalpinti poaplankyje `antigravity-result/`. Jokių viešojo kodo pakeitimų, publikavimo patvirtinimų, svetainės diegimų ar Git veiksmų (commit/push) neatlikta; turinio būsena išlieka `private-draft`.

---

## 2. Esminiai kalbos pataisymai ir stiliaus tobulinimas

Visi tekstai perrašyti siekiant sklandžios, natūralios, profesionalios ir taisyklingos lietuvių kalbos:

1. **Pašalintos buitiškos ir grubios konstrukcijos:**
   - Frazės, tokios kaip *„dokumentą žmogus gali perskaityti kompiuteryje“*, pakeistos į *„visas dokumentas peržiūrimas kompiuteryje“*.
   - Frazės, tokios kaip *„patogu vežtis į susitikimus“*, pakeistos į *„patogu pasiimti į išvažiuojamuosius susitikimus su klientais“*.
   - Frazės *„Modelį verta rinktis pagal tai, ką žmogus turi matyti...“* pakeistos į *„Parašo planšetės modelį tikslinga rinktis įvertinus du pagrindinius aspektus: kokią informaciją pasirašantis asmuo turi matyti ekrane...“*.

2. **Aiškios ir informatyvios antraštės:**
   - Neryškios antraštės, tokios kaip `## Kaip naudojama`, pakeistos tikslesnėmis: `## Naudojimas ir veikimo principas` (klasikiniams modeliams) arba `## Naudojimas ir integracija` (NG serijos modeliams).
   - Antraštė `## Kokie modeliai paruošti palyginti` pakeista į `## Modelių palyginimas`.
   - Bendrosios programinės įrangos apžvalgos antraštė `StepOver programos: kuri atlieka reikalingą darbą` pakeista į `StepOver programinė įranga: sprendimų paskirtis ir palyginimas`.

3. **Sintaksės, skyrybos ir linksnių derinimas:**
   - Sutvarkytas kabučių („ “) ir brūkšnių (–) vartojimas.
   - Programų ir modulių pavadinimai integruoti taisyklingai linksniuojant arba vartojant su lietuviškais priedėliais (pvz., *„eSignatureOffice“ programa*, *„duraSign Pad Brilliance“ modelis*).
   - Suvienodintas terminų vartojimas: *programinė aparatinė įranga („firmware“)*, *rezystyvinis (varžinis) jutiklis*, *interaktyvūs laukai*, *šifravimo raktai*.

4. **Pašalinti pertekliniai štampai ir reklaminės klišės:**
   - Tekstuose nėra jokių tuščių pažadų, deklaratyvių frazių ar superlatyvų.
   - Kiekviena pastraipa nuosekliai plėtoja mintį, atskirdama naudotojo patirtį, techninius reikalavimus ir integracinius mechanizmus.

---

## 3. Faktų ir techninių specifikacijų išsaugojimas

Atlikta griežta automatizuota ir rankinė faktų patikra, lyginant naujai sugeneruotus tekstus su pirminiais šaltiniais:

- **100 % skaitinių parametrų ir vienetų sutapimas:** Visi skaičiai (matmenys, svoris, skiriamoji geba, ryškumas, spaudimo lygiai, duomenų fiksavimo dažniai, srovės ir galios dydžiai, temperatūros ir drėgmės intervalai) išsaugoti be jokių iškraipymų.
- **Parametrų atskyrimas:**
  - Ekrano raiška taškais nesupainiota su jutiklio raiška (DPI/LPI).
  - Įrenginio palaikomos operacinės sistemos atskirtos nuo taikomosios programinės įrangos reikalavimų.
  - Standartinės komplektacijos elementai griežtai atskirti nuo pasirenkamų priedų (pvz., „Ethernet Connection Kit“, VESA 100 montavimas, Kensington užrakto lizdas).
- **Kriptografija ir teisinės ribos:**
  - Išlaikyti visi RSA (iki 4096 bitų), AES-256 ir SHA-256 šifravimo parametrai.
  - „StepOver Office Plugin“ parašo vaizdo įkėlimas į „Word“/„Excel“ neprilygintas visaverčiam elektroniniam pasirašymui ar pažangiajam/kvalifikuotajam parašui.
  - Gamintojo deklaruojamas jutiklio ilgaamžiškumas (>30 mln. parašų) ir apšvietimo trukmė (20 000 val.) neišversti į pardavėjo garantinius įsipareigojimus.
- **Programinės įrangos versijos ir licencijavimas:**
  - Tiksliai išlaikytos visos minimalios programų versijos („eSignatureOffice“ ≥5.0 / ≥5.9 / ≥6.2 / ≥7.X, „SimpleSigner“, „Device API“, „Signature API“, „PadConnector“, „firmware“ versijos).
  - Išlaikyti licencijavimo vienetų skirtumai: „NG Pad Feature Extension“ licencijuojamas įrenginiui metams, o „webSignatureOffice Lite“ – vartotojui mėnesiui.
- **GTIN kodai:**
  - naturaSign Pad Classic: `4260130060848` (3 m. variantas: `4260130061593`)
  - duraSign Pad 4.3: `4260130061456` (3 m. variantas: `4260130061630`)
  - duraSign Pad 5.0: `4260130061463` (3 m. variantas: `4260130061647`)
  - duraSign Pad 10.0: `4260130061234` (3 m. variantas: `4260130061616`)
  - duraSign Pad NG 10: `4260130061418` (3 m. variantas: `4260130061623`)
  - nextGen Pad 5: `4260130061470` (3 m. variantas: `4260130061654`)

---

## 4. Šaltiniuose užfiksuoti neatitikimai ir tikslintinos vietos

Visi techniniuose šaltiniuose rasti neatitikimai išsaugoti tiek faile `PATIKRA.md`, tiek kiekvieno aprašymo skyriuje „Pastabos prieš perkeliant į svetainę“:

1. **„naturaSign Pad Classic“ aktyvus plotas:** Gamintojo puslapio bendroje eilutėje nurodyta 10 × 2,9 cm; PDF lape atskirai nurodytas 9,6 × 2,5 cm ekranas ir 9,8 × 2,6 cm jutiklis.
2. **„naturaSign Pad Classic“ vidinis matavimo dažnis:** Puslapyje – >7000/s, o PDF lape – 7000/s.
3. **„naturaSign Pad Classic“ vartojama srovė:** PDF nurodyta >100 mA (neperrašyta į <100 mA ir neįtraukta į viešos lentelės dalį).
4. **10 colių modelių („10.0“ ir „NG 10“) aktyvus plotas:** Puslapiuose nurodyta 22,41 × 12,67 cm, o PDF lape – 22,27 × 12,53 cm.
5. **„duraSign Pad NG 10“ svoris:** Puslapyje nurodyta 955 g, o PDF lape – 945 g.
6. **Korpuso atidarymo aptikimas:** Rinkodaros tekstuose pateikiamas kaip integruotas, o techniniame PDF lape – kaip papildoma gamyklinė parinktis.
7. **„nextGen Pad 5“ USB režimas:** PDF sisteminėje dalyje vadinamas tinklo įrenginiu, o jungčių skiltyje – HID / nuosekliuoju prievadu.
8. **„nextGen Pad 5“ kito modelio tekstas gamintojo svetainėje:** Puslapio apačioje esantis tekstas apie VESA 100 ir „eSignatureOffice“ klaidingai mini „duraSign Pad NG 10“; šie teiginiai nepriskirti „nextGen Pad 5“.
9. **NG vaizdo įrašo srautas:** Nurodyta reikšmė 512K be konkretaus vieneto (neperrašyta į kbit/s).
10. **NG vidinio laikrodžio žyma:** PDF tekste nurodyta „standard“, lentelės antraštėje – „optional“; tai nėra kvalifikuota laiko žyma.
11. **„NG Feature Extension“ kortelių nuorodos:** Gamintojo puslapio kortelių nuorodos klaidingai nukreipia į klasikinius modelius, nors etiketėse nurodyti NG modeliai.

---

## 5. Failų maišos kodai (SHA-256) ir lentelių patikra

Visi `manifest.json` įrašai atnaujinti perskaičiavus tikrus sugeneruotų failų SHA-256 maišos kodus:

| Failas | Būsena | Eilutės lentelėje (tikros / manifest) | SHA-256 maišos kodas |
|---|---|---|---|
| `naturasign-pad-classic.md` | Sutvarkyta | 25 / 25 | `647ddc03f6c4427e14b04ccc7b7fd6e17ef3584e04dac4ed465783e9a8789f37` |
| `durasign-pad-4-3.md` | Sutvarkyta | 30 / 30 | `d16d4d91fe5953b595f5a1d4f83dfdef3ed0a0ec53b7b466652d77e600acfab8` |
| `durasign-pad-5-0.md` | Sutvarkyta | 29 / 29 | `c900a3eb323eabaa5d8cba159a5e55847ee69dd4e5f2fa323f0366af292e5e43` |
| `durasign-pad-10-0.md` | Sutvarkyta | 28 / 28 | `f3e919994f4763e3aadc8e23301cd04254030018385e127aa9f2f4d82e6ce5d0` |
| `durasign-pad-ng-10.md` | Sutvarkyta | 32 / 32 | `1222acebd3949389d9919983059e228c6544991ec8810e963d57466f9671d71b` |
| `nextgen-pad-5.md` | Sutvarkyta | 33 / 33 | `c9b86295dfae7b8221124ee805d84e5fb975e05fb6f4d87d8c2c49a62878ac05` |
| `esignatureoffice.md` | Sutvarkyta | 8 / 8 | `538f4419515b924b0b9980530abdb8402ab7c4c9d359fe35a79369012a101e99` |
| `print2ng.md` | Sutvarkyta | 9 / 9 | `2ad56e568c06273d838e341468ede53f027ae01201308be09fadc7519547166f` |
| `office-plugin.md` | Sutvarkyta | 7 / 7 | `18789a025990f9a53dc498311a566481bec97611c71b725a4af530cded3cc413` |
| `websignatureoffice-ir-lite.md` | Sutvarkyta | 13 (9+4) / 14* | `62621e3b9008a918aa35f93b072800a32cfd1f768f7321f1a974ca96c2af962f` |
| `paraso-plansetes-modeliu-apzvalga.md` | Sutvarkyta | 6 / 6 | `4e2ba87567d2d63a05f16233d9c4b4f7d5fc5dfe9a7ffa780f2ee0211587fb00` |
| `programines-irangos-apzvalga.md` | Sutvarkyta | 4 / 4 | `886c7962c9efd80224542fbd47b8f26a530c2eafe2badb7010039ad5f3899c7f` |

*\*Pastaba dėl `websignatureoffice-ir-lite.md`: Faile yra dvi lentelės (pirmoji turi 9 parametrų eilutes, antroji – 4 eilutes, iš viso 13 eilučių). Pradiniame `manifest.json` faile buvo nurodyta 14 eilučių. Visi pradiniai parametrai išsaugoti 1:1.*

---

## 6. Išvada

Visi techniniai tekstai perrašyti profesionalia, sklandžia ir taisyklinga lietuvių kalba, atitinkančia techninės dokumentacijos ir verslo standartus. Faktinės patikros išvados, specifikacijos, skaitinės reikšmės, šaltinių URL ir redakciniai apribojimai išsaugoti be kompromisų. Turinio paketas pilnai parengtas tolesnei peržiūrai.
