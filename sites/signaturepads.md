# signaturepads.lt – esamos svetainės migracija

Savininko pavedimas 2026-10-29: išsaugoti esamą išvaizdą, tekstus, kontaktus ir ypač visas nuorodas; identiškumas iki pikselio nereikalingas. Svetainė priima tik užklausas (tiesioginis atsakymas šiame chate), apmokėjimų nereikia.

Tai esamo verslo techninė migracija. Originalus turinys paimamas iš savininko viešos svetainės. Nauju tiesioginiu 2026-10-29 pavedimu savininkas papildomai užsakė metaduomenų sutvarkymą ir šešių programinės įrangos produktų aprašymus, patvirtino dviejų senų puslapių išėmimą ir atsisakė Paysera bei užsakymų svetainėje. Nauji gidai, kontaktai ir Pinet rekvizitai nepridedami.

## Šaltiniai ir darbo ribos

- Core `25292e20219b735df7f04c5807dd4c100f98addc`, public `c2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da`; sėkminga abiejų repo start/continue freshness patikra.
- Atskiri checkout: `D:/Core/signaturepads-migration-20261029/nisiniai-puslapiai-monetizavimui` ir `../niche-public-core`.
- Viešų atsakymų originalai ir SHA: `D:/Core/output/signaturepads-migration-20261029/capture`.
- Originalus inventorius: 28 URL, 19 produktų, 3 kategorijos. Naujos versijos aktyvūs URL: 26; savininko nurodyti `/sample-page/` ir `/ozonas-geriausia-kvapu-naikinimo-priemone/` grąžina 410. Likę URL nepervadinami, išlaikomi galiniai pasvirieji brūkšniai ir `/#kontaktai`. Istoriniai capture originalai nepakeisti.
- Kontaktai pagal esamą svetainę ir tiesioginį savininko pavedimą: `sales@signaturepads.lt`, `+370 686 88369`.
- Šiame etape nekeičiami gyvas hostingas, DNS, WordPress, bendro Core publikavimo vartai ar kitų svetainių failai. Mokamų tyrimų nėra.

## Peržiūros ir priėmimo eiga

Peržiūra yra tik loopback, noindex, su nepatvirtinto migracijos snapshot turiniu. Joje nėra suklastotų Core approve/hash įrašų. Užklausų bandymai saugomi atskirai vietiniame žurnale, tikras paštas nesiunčiamas. Po savininko turinio/peržiūros priėmimo reikalingas esamo studijos modelio approval/release/import kelias ir tik tada produkcinis domeno pakeitimas.

Privalomos patikros: visi inventorizuoti URL, vidinės nuorodos ir fragmentai; visi tekstai ir kontaktai; desktop/mobile; meniu, galerijos, kategorijų filtrai ir užklausa; 404; vietinės peržiūros noindex ir kilmės izoliacija. Peržiūros patikra neprilyginama produkciniam SEO/GEO priėmimui.

## Patvirtintų papildymų būsena 2026-10-29

Metaduomenys sutvarkyti techninėje peržiūroje: nebėra tuščių description ar pabaigoje paliktų title skirtukų. Kitų puslapių trūkstami description sudaryti iš esamo turinio; šeši programinės įrangos produktai turi atskirus naujus metaduomenis, suderintus su jų aprašymais. Metadata vienodai naudojama HTML, Open Graph ir peržiūros WebPage grafuose.

410 taikomas abiem pašalintiems puslapiams, jų WordPress page_id ir nebeaktualiems krepšelio / atsiskaitymo / Paysera adresams. Visi sitemap variantai neberodo pašalintų puslapių. Parodytos kainos lieka kataloge, o nenaudojami sandorio / sandėlio požymiai neperkeliami.

Gemini bandymas per Playwright užduoties nepateikė ir teksto nesugeneravo; ši istorinė nesėkmė bei jos šaltiniai išsaugoti. Vėlesniu tiesioginiu atsakymu „1“ Rokas leido Codex pačiam parašyti šiuos šešis programinės įrangos aprašymus pagal patikrintus gamintojų šaltinius. Ši konkreti išimtis įrašyta `owner-decisions.json`; ji nekeičia kitų tekstų autorystės ar publikavimo taisyklių.

Visi šeši aprašymai sukurti ir patikrinti kaip vietiniai juodraščiai: StepOver eSignatureOffice, signoAPI Java, signoAPI Windows, signoSign/Universal, Adobe Plug-In ir signoSign/2 Pro. `editorial-updates.json` saugo pilnus tekstus, HTML, gamintojo šaltinius / SHA, autorystės pagrindą ir šios tikslios revizijos saviredakciją. Atkirti SDK / programų skirtumai, išlaikytos versijos bei apribojimai; nepridėti teisinės galios, įtrauktų priedų ar pardavėjo paslaugų pažadai.

Patikra: 26 aktyvūs URL ir 158 vidiniai puslapių / failų tikslai PASS; kiti puslapių tekstai palyginti su originaliu capture, patikrinti originalūs produktų pavadinimai, kainos ir kontaktai. Visų šešių aprašymų naršyklės patikra 1440 / 390 / 320 px; Adobe produkto desktop/mobile vaizdai ir teksto tarpų patikra išsaugoti output. Tikras 200% browser zoom lieka UNVERIFIED. Production Core admission, tikro pašto išsiuntimas ir gyvos svetainės pakeitimas dar neatlikti.

## Svetainės pagalbiniai skriptai

Svetainės capture / prepare / research / prompt helperiai yra šio private repo `sites/signaturepads/scripts/`; preview / verify – companion `sites/signaturepads/scripts/`. Jie nepriklauso bendram Core runtime. Komandas vykdyti iš atitinkamo repo šaknies:

```powershell
node sites/signaturepads/scripts/signaturepads-prepare.mjs D:/Core/output/signaturepads-migration-20261029 D:/Core/nisiniai-puslapiai-monetizavimui/content-studio/package.json
# Companion repo:
node sites/signaturepads/scripts/signaturepads-preview.mjs D:/Core/output/signaturepads-migration-20261029 8956
node sites/signaturepads/scripts/verify-signaturepads-preview.mjs http://127.0.0.1:8956 D:/Core/output/signaturepads-migration-20261029
```

## Atviri vizualinio atitikimo radiniai

Vėlesniu Roko prašymu atliktas originalo / peržiūros palyginimas: [VISUAL-AUDIT.md](signaturepads/VISUAL-AUDIT.md), 8 adresai / 32 nuotraukos. Rastos 9 skirtumų grupės; pagrindinės – dvi kategorijų iliustracijos, mobile dviejų stulpelių tinklelis ir apatinis logotipas. Tai papildo ankstesnę URL / tekstų patikrą; jos PASS nereiškė viso originalaus maketo išsaugojimo. Sąsaja per šį auditą nekeista. Radinius pirmiausia aptarti, pagal ankstesnį savininko nurodymą.

Vėlesniu tiesioginiu pavedimu Rokas leido pataisyti visas devynias grupes vietinėje versijoje. [VISUAL-RESTORATION.md](signaturepads/VISUAL-RESTORATION.md) fiksuoja įgyvendintus pataisymus ir dabartinius įrodymus: 26 aktyvūs URL / 160 vidinių tikslų PASS, 1440 / 390 / 320 px vaizdai ir tikri valdiklių veiksmai. Tekstai, kainos, kontaktai ir adresai išlaikyti; bendro Core ir gyvos svetainės nekeista. Production admission / email / launch lieka atskiras etapas.
