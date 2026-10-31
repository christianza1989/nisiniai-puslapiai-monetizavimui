# signaturepads.lt – esamos svetainės migracija

Aktuali būsena 2026-10-29: vietinė peržiūra jau naudoja native Core turinio / medijos / SEO / D1 užklausų kelią. Tikro pašto autentifikacija ir INBOX patikra laukia prieigos; gyva svetainė nepakeista. Tikslus statusas, paleidimas ir įrodymai: [CORE-INTEGRATION](signaturepads/CORE-INTEGRATION.md). Ankstesni šio dokumento etapų įrašai lieka istoriniu kontekstu.

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

## Papildomas originalo / native Core auditas

2026-10-29 tiesioginiu Roko prašymu pakartotas platesnis palyginimas: [DEEP-COMPARISON-20261029.md](signaturepads/DEEP-COMPARISON-20261029.md). 26 adresai desktop / mobile, 120 bazinių bei papildomų breakpoint vaizdų, visos 19 kainų ir galerijų sudėtys. Kainos / galerijų nuotraukos išlaikytos; 12 įrangos aprašymų ir 13 paryškinimų rinkinių tiksliai sutampa su gyvu originalu. Sigma turi papildomą pristatymo pastraipą.

Atviri A01–A07: nepilna greitoji peržiūra, skirtingų katalogų responsive struktūra, nuotraukų mastelis, teksto vaidmenys / paraštės, Sigma dublikatas, neveikiantis orderby=date ir neįvardytas dialogas. Ankstesnis techninis PASS nepanaikina šių radinių. Audito metu programos kodas, native paketas ir gyva svetainė nekeisti. Tikras pašto gavimas, fiziniai įrenginiai / Safari / 200% zoom ir istorinių įeinančių URL inventorius lieka nepatvirtinti.

## 2026-10-30 vietinės A01–A07 pataisos

Tiesioginis Roko pavedimas visoms septynioms grupėms įvykdomas per-site source ir naują native Sigma reviziją. Dabartinė būsena / įrodymai: [PARITY-FIXES-20261030.md](signaturepads/PARITY-FIXES-20261030.md), ankstesni auditai išsaugoti. PUBLIC source `47b95797`, paketas `38a9024f`; ta pati Core peržiūra `http://127.0.0.1:8956/`. Išliko 26 aktyvūs URL, 19 kainų ir galerijų, kontaktai; 25 kiti įrašai / 199 media baitai nepakeisti. 305 testai, HTTP ir Chrome desktop / touch-emulated mobile patikra; gyvos svetainės / DNS / WordPress / realaus pašto pakeitimų nėra. Fiziniai įrenginiai / Safari ir pašto INBOX lieka nepatvirtinti.

## 2026-10-31 pirminis pasiruošimas

Savininko nurodymu užbaigiamas techninis pasiruošimas, domeno ir originalaus
WordPress nekeičiant; 5 punktas (WordPress backup) aiškiai praleidžiamas.
Aktuali [prelaunch ataskaita](signaturepads/PRELAUNCH-20261031.md) pakeičia
ankstesnius dabartinės peržiūros būklės teiginius, bet ne istorinių bandymų faktus.
Native paketas94de neperrašytas, source f2344dfc, Worker versija d6ac644e-aada-4d00-9fb9-a17361768fb3.
Peržiūra: https://signaturepads-preview.pinet-azprekyba.workers.dev/.

325Core testai,26puslapių HTTP/SEO,204asset SHA,237alias ir Chrome/WebKit
320–1440px PASS. Lighthouse homepage90mobile/100desktop, a11y100;
šis balas nėra fizinio telefono, field CWV ar WCAG patvirtinimas. Tikras200%
zoom nepavyko dėl Windows native prieigos. Pašto transportas jau atskirai
patikrintas ir savininkas patvirtino gavęs pažymėtą testą; šį etapą naujų
laiškų nesiųsta. Actual gavėjo raw headers/aplankas neinspektuoti.

[Privatumo faktai rašytojui](signaturepads/PRIVACY-FACTS-20261031.md) ir
[production eiga](signaturepads/PRODUCTION-PREPARATION.md) paruošti, dedikuota
production D1 tuščia, DNS importas nepritaikytas. Tikras valdytojas ir užklausų
saugojimo terminas dar nežinomi; jokio production admission ar domain-ready
teiginio nėra. [Visas85kriterijų auditas](signaturepads/PHASE-1-AUDIT.md) turi
matomus FAIL/UNVERIFIED; reporting exit0 neatstoja require-local.

## 2026-10-31 aktualus saugumo ir techninio pasiruošimo rezultatas

[Galutinė techninė ataskaita](signaturepads/DEPENDENCY-HARDENING-20261031.md):
Worker2a867b0c-8d9e-4503-98f9-252a0f1b3d01,public sourcea9b8a627,
build80fa086c / same tracked tree6956a2f7. Native94de neperrašytas.
328testai / types / build / RSC ir actual26URL /204SHA /237alias / legacy
URL /10Chrome-WebKit viewports bei tikri meniu→contact→catalogue→product
veiksmai PASS. Actual rendered CSS/JS6resursai. Native200% Chrome API testas
ir pilni native kadrai PASS; fizinio telefono/macOSSafari/manualWCAG neteigiama.

Atnaujintos pažeidžiamos priklausomybės, įskaitant bundledRSC, nepatenkantį į
omit-dev. Production audit0; full0critical/0high/20moderate, iš2trusted-input
lint/DrizzleCLI advisory šeimų, su reachability/naudojimo ribų vertinimu.
Lighthouse homepage90mobile/100desktop;software98/100;a11y100.
Preview noindex,originalo HTML/NS/A/AAAA/MX ir local8956 išliko, WordPress
backup pagal savininko nurodymą nedarytas. Privatumo valdytojas/retention
nepatvirtinti; production admission/domeno aktyvavimo ir main merge nėra.
