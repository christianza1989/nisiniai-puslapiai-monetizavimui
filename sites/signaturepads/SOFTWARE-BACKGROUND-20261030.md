# Dviejų darbuotojų nuotraukos atkūrimas

Rokas pateikė tikslų vaizdą: už programinės įrangos blokų trūksta dviejų žmonių prie kompiuterių fono. Tai atskira nuotrauka, ne pirmos hero sekcijos banneris. Ankstesnė 12 šeimų patikra apėmė įkeltus pradinio viewport fonus; šis Nitro offscreen / lazy CSS fonas ten nepateko. Ankstesnių ataskaitų PASS nėra šios nuotraukos priėmimas; jų istoriniai baitai nekeičiami.

Originalas po tikro nuslinkimo į sekciją: `/wp-content/uploads/2023/11/pexels-mikhail-nilov-7988079.jpg`, 1920×1282. Nuotrauka vizualiai atitinka Roko priedą. Virš 1024 px fixed, telefone scroll, center/center, auto natūralus dydis, no-repeat. Native naudoja optimizuotą 1600 px WebP ir 1920 px demonstravimo dydį tam pačiam iškirpimui. Sekcijos originalus minimumas720 px. Pačių programinės įrangos tekstų ir valdiklių neperdaryta.

## Atkūrimas per Core

- Originalus209771 B JPEG atsisiųstas iš savininko svetainės, SHA256 `4b2e8ed5b66f6a88b58453fd12a16ce6523eaf19d049e87eee7df7b43826d5b4`. Priedas yra identifikavimo įrodymas, ne svetainėje naudojamas screenshot iškirpimas.
- Kanoninis `saveResponsiveAsset` importas: šeima `8037f968-5f69-4589-837a-0dcc55803cf1`, penki360/640/800/1200/1600 px WebP variantai; primary `cea8ca53-35db-495a-b053-b620a23dd2b5`. Originalas privatus, naujos medijos vieši immutable ID.
- Tik native `sp-home` media revizija `645a930e5ce68193879de5dec870c6ebc5c3c283736c84b2abcb774da187cb0a`; body/title/description/slug/publishAt ir visų senų medijos įrašų vieši laukai išliko. Patikrinta, kad kiti25 native įrašai nepakeisti.
- Tikras editorial review / approve / release pagal savininko tiesioginį vietinio atkūrimo pavedimą, aktorius Codex. Release `2ac181d0-267a-4216-8900-844dd180a9cd`, SHA256 `94de2ef54c802d69399727aa243918f9e828a44b51013c3a05cf4d01dbc3dd25`:26 puslapiai,204 media. Jokio žmogaus peržiūros ar production publikavimo imitavimo.
- PUBLIC `f20d7683637e0c381c5b9edca757146362938ecb`: media-only reviewed shadow paketas ir5 nauji WebP, per-site layout `softwareBackground`, native eligible home media projekcija, optional CSS kintamasis rendererio sekcijoje ir originalus responsive fono elgesys. Jokio raw WordPress URL / public-asset fallback už native publikavimo ribos.
- Kanoninė originalaus vaizdo URL alias į naują primary, senos225 nuorodos išliko, dabar226. Visi26 puslapių URL / tekstai / kainos / kontaktai ir kitos galerijos nepakeisti.

## Patikra

Naujas atskiras įrodymų katalogas: `D:/Core/output/signaturepads-migration-20261029/software-background-20261030/`.

- `owner-reference.png`, `original-software.json` ir source1440/390 kadrai identifikuoja tikrą vėliau įkeliamą foną ir jo tėvinę sekciją.
- `source-receipt.json` / privatus originalas, `native-site-before.json`, `revision-prepare.json` fiksuoja kilmę, ankstesnę reviziją ir5 naujus variantus. Seni paketai / šaltiniai nepakeisti.
- `draft-verification.json`:8 tikri native juodraščio kadrai1440/1024/390/320 ties sekcija ir +160px; nuotrauka dekoduota1600×1068, tinkama fixed/scroll,4 antraštės ir nepakeistas software textContent,0 overflow, mobilūs akordeonai veikia. Desktop/mobile kadrai faktiškai peržiūrėti prieš native review.
- `core-tests.log`:306/306 PASS, įskaitant naują tikros patvirtintos home medijos susiejimo / nebuvimo / native revocation regresiją. Trijų pakeistų JS/MJS/test failų scoped lint0 klaidų / perspėjimų. Detector tik žinomas Open Sans perspėjimas – šriftas sąmoningai išlaikomas.
- Tikro8956 galutinio Core patvirtinimas PASS: build.log / rsc-check.json (2 manifestai / 0 trūkstamų failų), TypeScript0, final-verification.json (10 faktinių kadrų1790/1440/1024/390/320 px ties sekcija ir +160px), tinkamas fixed/scroll ir1600px dekoduotas source vaizdas,4 antraštės,0 overflow, mobilūs akordeonai. Faktiškai peržiūrėtas galutinis1790px Core kadras – ta pati dviejų darbuotojų nuotrauka kaip Roko priede. core-http-verification.json:26 URL/204WebP/226legacy alias/10formos+D1 scenarijų PASS; tikslus sintetinių įrašų cleanup, tikras laiškas nesiųstas. preservation-proof.json:25 kiti public puslapiai ir home body/title/description/slug/publishAt/siteSnapshot bei senos media reikšmės nepakito; visi199 ankstesni media failai tokie patys SHA, pridėti tik5 nauji variantai.

Gyva svetainė, WordPress, DNS ir hostingas nekeisti. Aktyvacija tik savo output engine `local-preview/testOnly`, SMTP/API/voice0. Tikro pašto / fizinio telefono / Safari / production Lighthouse priėmimo šis darbas neprideda. Nuotraukos identifikavimo klausimas iš ankstesnio hero etapo atsakytas; kitos nuotraukos klausti nebereikia.
