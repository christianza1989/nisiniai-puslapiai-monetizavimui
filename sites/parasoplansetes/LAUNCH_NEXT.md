# Paruoštas tęsinys ir tikros prieigos kliūtys

2026-10-09 07:13 UTC. Šis dokumentas papildo auditą; nepakeičia neįvykdytų kriterijų į PASS.

## Kas patikrinta šiame tęsinyje

- Treg `my_tools`: 0 prijungtų komandos įrankių. Search Console / Analytics ryšio nėra. Mokamų provider kvietimų šiame tęsinyje: 0; bendras ankstesnis tyrimas 0,231 USD iš 2 EUR biudžeto.
- Cloudflare prisijungimas veikia. `/accounts` grąžino vieną paskyrą; tikslūs `/zones?name=parasoplansetes.lt` ir `signaturepads.lt` filtrai sėkmingai grąžino po 0 zonų. Tai ne registratoriaus domeno nuosavybės ar registracijos patikra. DNS pakeitimų neatlikta.
- Šio PC DNS resolveris naujam domenui NS, A ir AAAA užklausose grąžino ENOTFOUND. Visi penki vieši HTTPS tikslai taip pat ENOTFOUND. Nevadiname domeno laisvu ar neregistruotu vien pagal DNS.
- signaturepads.lt NS: ns1.dns-parking.com / ns2.dns-parking.com. Pagrindinis puslapis ir parašo planšečių kategorija grąžino 200. Visi penki seni produktai su galiniu `/` grąžino 200 ir savo canonical; variantai be `/` turi 301 į tą patį seną domeną su `/`. StepOver pardavimų atskyrimas dar neįdiegtas.
- Visi penki nauji modeliai vietiniame tikro rendererio patikrinime grąžino 200 ir tikslų `https://parasoplansetes.lt/produktas/...` canonical. Vietinio preview noindex yra tyčinis.
- Šiame Core kataloge nerasta `.dev.vars.hostinger` ar savininko prisijungimų failo pagal tikslinius failų vardus. Svetimos nišos `.dev.vars` neperimtas. SMTP ir INBOX bandymas neatliktas; slaptažodžių į pokalbį nereikia.
- CUA inventoriuje tik IAB ir MCP Apps; native apps nėra. IAB palaiko viewport, tačiau tikro naršyklės mastelio valdymo galimybės neadvertizuoja. 200 % priėmimas lieka UNVERIFIED.
- GitHub nauja 2026-10-09 patikra: `guzhas` turi Write privačiame repo; šaka sėkmingai įkelta ir draft PR46 sukurtas. Viešam `niche-public-core` repo `push=false`; reikia Write būtent tam antram repo. Ankstesni 403 kvitai išsaugoti, credential nekeistas. Aktualus perdavimas — `GIT_DELIVERY.md`.

Kvitai: `self-audit/migration-preview-20261009.json`, `self-audit/migration-preflight-20261009.json`, `self-audit/access-checks-20261009.json`.

## Paruošta vykdoma migracijos patikra

`migration-url-map.json` turi tik penkis perkeliamus produktus. `verify-migration.mjs` yra tik skaitymo įrankis: nieko nediegia, netaiso WordPress ir nekeičia DNS.

Iš šio privataus repo šaknies:

```powershell
node sites/parasoplansetes/verify-migration.mjs preview --base http://127.0.0.1:8798 --report sites/parasoplansetes/self-audit/migration-preview-20261009.json
node sites/parasoplansetes/verify-migration.mjs preflight --report sites/parasoplansetes/self-audit/migration-preflight-live.json
node sites/parasoplansetes/verify-migration.mjs postflight --report sites/parasoplansetes/self-audit/migration-postflight-live.json
```

Preview įrodė tik vietinius modelius. Preflight šiame tęsinyje teisingai baigėsi exit 1 / BLOCKED_URL_CHECKS dėl viešų tikslų. Sėkmingas preflight vis tiek nepakeičia formos, pašto, privatumo ir rollback priėmimo. Postflight po realių pakeitimų reikalaus dešimties seno URL variantų tiesioginio 301 į tikslų naują HTTPS adresą, galutinio 200, teisingo canonical, jokio noindex ir išlikusių seno domeno home / kategorijos. Papildomas redirect hop nėra PASS.

## Vykdymo tvarka, kai atsiranda prieiga

1. Prisijungti prie paskyros, kuri valdo parasoplansetes.lt DNS; patikrinti registraciją / nuosavybę. Domeno nepirkti ir mokamos paslaugos neaktyvuoti automatiškai: dabartinis 2 EUR tyrimo biudžetas nėra naujos metinės paslaugos patvirtinimas.
2. Suteikus GitHub Write ir viešam `niche-public-core` repo, įkelti companion šaką ir pateikti jo scoped PR. Privatus draft PR46 jau pateiktas; abiejų source peržiūra ir merge lieka atskiras žingsnis. Kitų sesijų failų ar main istorijos neperrašyti.
3. Atlikti tikrą 200 % naršyklės bandymą ir vieną aiškiai pažymėtą formos → D1 → SMTP 250 → matching Message-ID INBOX bandymą savininko dėžutei pagal MAIL_CORE. Nevykdyti hardcoded traktorių formos helperio kaip StepOver įrodymo; StepOver bandyme būtini `site_id=parasoplansetes`, tikras jo source path ir tikslus testinio įrašo ID.
4. Tikroje produkcijoje patikrinti HTTPS, host routing, D1, pašto paslaptis, abuse/recovery ir faktinę privatumo / saugojimo tvarką. Įprasto vietinio preview SMTP lieka išjungtas.
5. Paleisti production preflight. Tada WordPress backup ir tiksliniai pakeitimai pagal MIGRATION.md bei SIGNOTEC_WORDPRESS_DRAFT.md; įdiegti tik penkis sutartus 301. Paleisti postflight. Platus viso domeno ar kategorijos redirect nereikalingas.
6. Patvirtinti abiejų domenų Search Console properties, pateikti savo domenų sitemap, užfiksuoti indexing ir tikrų užklausų baseline. Pirmos dvi Google vietos bei AI citatos lieka matuojami tikslai, ne atlikto kodo išvada.

Pilnas vietinis priėmimas tebėra NOT_COMPLETE dėl R2/S2/U2/U3. Gyvo domeno paleidimas ir paklausa nepriimti. Šis tęsinys nesukūrė approval, paid monitoring ar išsiuntimo klientams automatikos.
