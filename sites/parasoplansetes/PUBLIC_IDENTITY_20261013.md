# Viešos tapatybės pakeitimas — 2026-10-13

Savininkas pavedė visoje parasoplansetes.lt svetainėje pašalinti „Pinet“, seną operatoriaus sakinį ir verslomatika.lt žymą; patvirtino naują viešą kontaktą `sales@parasoplansetes.lt` ir nurodė, kad paštui naudoja Google Workspace. Šis pavedimas pakeičia ankstesnį „kol kas palik pinet“ nurodymą tik šiai svetainei.

## Pritaikyta ir įkelta

- Bendra poraštė: pašalintas administratoriaus sakinys ir automatikos žyma; logotipas, navigacija ir teisinės nuorodos išliko. Copyright: „Parašo planšetės.lt“.
- Viešas el. paštas pakeistas pakete ir svetainės tinklo išimtyje. Redakcinė tapatybė / autorystė / Organization schema: „Parašo planšetės.lt“. Tai svetainės prekės ženklas, ne naujai išgalvotas juridinis asmuo.
- Perskaityti ir redaguoti visi penki paveikti puslapiai: kontaktai, apie projektą, redakcija, naudojimo sąlygos ir privatumas. Pakeisti metadata ir privatumo inline nuorodos linksniai. Kituose 41 puslapyje tekstai, ID, URL, medija ir datos išsaugoti. Nauja visų 46 puslapių scope review būtina dėl contact konteksto pakeitimo; ankstesnės nepakeisto turinio ir šaltinių peržiūros išlaikytos, nauja pilna gamintojo faktų patikra nedeklaruojama.
- Turinio eiga: izoliuotas draft → tikros revizijos peržiūros → atomic approval → immutable release `49475e39-38f7-4179-8326-019b46313210` → bendras importas → build/deploy. SHA256 `23469e38235bf104ec0d491c65c8d280ee6fe3a55f30486cd03dbc18279a8692`. 46 puslapiai ir 215 esamų medijos variantų; privatus pilotas išsaugotas.
- Worker `parasoplansetes-preview` versija `04a29b4b-3a11-4bf0-a53c-58f83a57e3d6`. Abi domeno sąsajos išliko enabled=true. Esami D1, sekretai, noindex ir išjungti SMTP/chat/voice jungikliai išlaikyti. Kitos nišos ir bendri operatoriaus numatymai nekeisti.

## Faktiniai įrodymai

Build, TypeScript, tikslinis ESLint, 66 core testai ir native SEO smoke PASS. Impeccable tikslinio rendererio detector pateikė tuščią radinių sąrašą; dizaino vertinimą papildė tikras kompiuterio poraštės ir mobilus kontaktų puslapio vaizdas. Telefono scrollWidth=clientWidth, naujas adresas telpa. Tai nėra naujas visos svetainės tipografikos / 200% zoom auditas.

284 vietinio runtime HTTP checks PASS; 284 domeno HTTP checks PASS naudojant aktualų viešo DNS atsakymą ir normalų TLS. Kiekvieno iš 24 šiuo metu matomų puslapių HTML/JSON-LD ir trijų sitemap/LLM išvesčių patikra: 27/27 PASS domene ir 27/27 PASS peržiūroje, nėra seno pavadinimo / adreso / automatikos žymos, kontaktas ir schema sutampa. Visi 46 būsimi/dabartiniai viešo paketo puslapiai taip pat patikrinti dėl senos tapatybės prieš išleidimą.

Pagrindinio domeno HTTPS ir `www`/HTTP 308 patikra: 5/5 PASS. Šio PC OS / naršyklės DNS cache vis dar gali nukreipti į Hostinger parkavimą: pirmas default fetch gavo ECONNRESET, IAB dar rodė seną parkavimo puslapį. 1.1.1.1 ir 8.8.8.8 rodo Cloudflare IP; tikrinimui panaudotas atskiras DNS resolveris, originalus hostname ir įprasta sertifikato validacija, jokio TLS bypass ar global tinklo keitimo. Domeno checker `remoteDeploymentProven=false` yra jo workers.dev-only klasifikacija, ne šio domeno HTTP kvito paneigimas.

Privatūs kvitai, senos kopijos, peržiūros, manifest ir screenshots: `output/parasoplansetes-identity-20261013/`. Istoriniai auditai/leidimai bei C: fingerprint nepakeisti.

## Workspace formos prijungimo rekomendacija (dar neįjungta)

Esama forma → Cloudflare backend išsaugo užklausą D1 → autentifikuotas HTTPS POST į Google Apps Script → MailApp siunčia fiksuotam `sales@parasoplansetes.lt` gavėjui. Lankytojo adresas naudojamas replyTo, ne savavališku From. Paslaptis tik Cloudflare secret ir Script Properties, niekada kliento HTML. Apps Script suteikiama tik siuntimo teisė; Gmail inbox skaitymo šiam keliui nereikia. Reikalingas savininko Workspace paskyros Apps Script siuntimo autorizavimas, leistinas web-app deployment pagal administratoriaus politiką ir tikras pažymėto laiško gavimo bandymas. Vien adreso įrašymas į svetainę neįrodo pašto dėžutės veikimo.

Šaltiniai: [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [MailApp ir replyTo](https://developers.google.com/apps-script/reference/mail/mail-app). Šiame pakeitime Google siunčiamoji jungtis, naujos paskyros rolės, laiškai ar mokamos paslaugos neaktyvuotos. SEO indeksavimas bei pilno komercinio paleidimo / teisinio valdytojo priėmimas lieka atskiri vartai.
