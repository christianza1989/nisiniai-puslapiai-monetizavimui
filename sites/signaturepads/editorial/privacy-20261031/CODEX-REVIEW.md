# Privatumo juodraščio patikra

2026-10-31. Apimtis: vienas esamas politikos puslapis naujai Core /
Cloudflare versijai. Ne dabartiniam WordPress. Sprendimas: **juodraštis
parengtas galutinei peržiūrai; publikuoti dar negalima**. Tai nėra Core
approve, release ar teisinės atitikties patvirtinimas.

## Versija ir autorystė

- Rašytojas: Gemini 4 Argon LOW, /u/2. Prieš abu siuntimus modelis ir LOW
  patikrinti meniu; URL ir normalizuotas siunčiamo teksto SHA patikrinti
  programiškai. Tarp siuntimų daugiau nei 2 minutės.
- Taikytas aktualus START2.4, NE-AI-RASYMAS ir kanoniniai straipsnio bei
  vieno siauro taisymo šablonai. Pakeisti tik šablonų laukai.
- Originalai: `response-raw.md`, `response-dom-blocks.json`; vieno taisymo
  originalai: `correction-response-raw.md`, `correction-capture.json`.
  Užfiksuotas atsakymo elemento tekstas ir jo antraščių / sąrašų struktūra.
  Kopijavimo mygtukas bandytas, tačiau patvirtintas Markdown iš iškarpinės
  negautas; tokio išgavimo netvirtiname. Žodžiai konvertuojant neperrašyti.
- Patikrinta visa `privacy-draft.md` versija, įskaitant title, meta ir pabaigą.
  Failo SHA yra `provenance.json`; tai artefakto SHA, ne Core revisionHash.

## Faktai ir konkretūs pakeitimai

- Išlaikytas viešas pavadinimas **signaturepads.lt**, sales@signaturepads.lt
  ir +370 686 88369. Įmonės rekvizitai neišgalvoti ir neįrašyti.
  Roko pasirinkimo neklausiame pakartotinai.
- 6 mėnesiai nuo paskutinio bendravimo: tik užklausai, nevirtusiai užsakymu,
  jos DB įrašui bei siuntėjo ir gavėjo el. pašto kopijoms. Nepakeista į
  180 dienų nuo formos pateikimo. Tekstas nežada automatinio ištrynimo.
- Pirminė įžanga aiškino pačios politikos egzistavimą; Gemini A pakeitė ją
  tiesioginiu duomenų paskirties paaiškinimu, išlaikydamas katalogo apimtį.
- B pataisė „ribojimas yra skirta“ ir nepagrįstą apribojimą vien robotams:
  dažnio ribojimas gali paliesti ir per dažnai siunčiantį lankytoją.
- C pašalino nepatikrintą teiginį, iš kokios programos operatorius skaito
  laiškus ir siunčia atsakymus. Google MX patvirtina gaunamo pašto vaidmenį,
  ne konkretaus Workspace plano ar ES pašto saugojimo įrodymą.
- Visas pirminis checkbox paaiškinimas išbrauktas. Tikra forma sako
  „Sutinku, kad šie duomenys būtų naudojami atsakyti į mano užklausą.“
  Juodraštis negali to pervadinti vien susipažinimo patvirtinimu. Taisant
  pagrindą dar reikės suderinti formą ir pranešimą; formos kodas čia nekeistas.
- Visa pirminė pastraipa apie sandorių, apskaitos, ginčų, žurnalų ir kopijų
  saugojimą išbraukta: konkreti tvarka nepatikrinta. Gemini D neįstatytas,
  nes pridėjo atskirą duomenų saugojimą ir bendrą atsarginių kopijų išimtį,
  kurių nepatvirtinome. Nepalikta priklausomų sakinių nuotrupų. Šios spragos
  neišnyko: jos atskirai įrašytos `draft-result.json` factChecks.
- Nei senos prekybos funkcijos, nei teiginys „naršydami sutinkate su
  slapukais“ neperkeltas. Nepridėta GA, GTM, reklamos, rinkodaros prenumerata,
  failų įkėlimas, DPO, išgalvotas UAB ar teisinės atitikties garantija.

## Šaltiniai ir tikrinimo ribos

Faktinis formos, saugojimo bei siuntimo kelias sutikrintas su PUBLIC
`components/niche/signaturepads/render.mjs`, `app/niche/[siteId]/lead/route.ts`,
`lib/niche-lead-fields.mjs` ir ankstesniais šios migracijos pašto / naršyklių
įrodymais. Slapukų inventorius yra ankstesnė 10 normalių kontekstų patikra,
ne naujas visų galimų Cloudflare iššūkių auditas.

[DPC skaidrumo paaiškinimas](https://www.dataprotection.ie/en/individuals/know-your-rights/right-be-informed-transparency-article-13-14-gdpr)
pagrindžia pranešimo informacijos patikrą. Tai nepatvirtina, kad vien domeno
pavadinimas pakankamai identifikuoja faktinį valdytoją. Šis klausimas lieka
teisinės patikros srityje; savininko pasirinkto viešo pavadinimo nekeičiame.

[DPC terminų paaiškinimas](https://www.dataprotection.ie/en/individuals/exercising-your-rights/how-long-will-it-take)
sutikrintas su vieno mėnesio atsakymu ir sąlyginiu pratęsimu.
[Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/),
[Hostinger DPA](https://www.hostinger.com/legal/dpa) ir
[Google privatumo politika](https://policies.google.com/privacy?hl=lt)
naudojami tik viešai skelbiamoms tiekėjų taisyklėms. Konkrečių paskyrų
sutartys, tarptautinio perdavimo priemonės ir pašto / kopijų terminai šia
patikra nepatvirtinti. ES D1 jurisdikcija nepaversta visų duomenų ES pažadu.
Pilnas perskaitytų ir nepavykusių atverti šaltinių registras – `sources.json`.

## Core peržiūros sritys

- Usefulness: aiški užklausų ir techninių duomenų paskirtis, 6 mėnesių
  atskaita, gavėjai, teisių kanalas ir išimčių patikros ribos. Galutinė
  Claude peržiūra dar negauta; Codex jos nesufabrikuoja.
- Facts: savininko pavadinimas ir terminas priimti. Likę 7 konkretūs
  factChecks neuždaryti. Tai ne facts PASS prieš approve.
- Sources: tik pirminiai perskaityti institucijų / tiekėjų puslapiai.
  EUR-Lex robotų patikros ir EDPB429 turiniu nesiremta.
- Media: politikos puslapyje medijos nebuvo; naujos nereikia. Nuotraukos,
  jų teisės ir galerijos šiuo tekstų darbu nekeičiamos.
- Links: esamas `sp-page-30273dda6cc8`, `/musu-slapuku-politika/`;
  kontaktų formos taikinys – `sp-home`, `/#kontaktai`. Nekuriamas antras URL,
  nepakeičiami redirectai ar kitos svetainės nuorodos.
- Presentation: 30 blokų, H2, pastraipos ir sąrašai; H1 nedubliuojamas,
  privačios pastabos į viešo teksto laukus nepateko. Draft-result schema
  tikrinama kanoniniu JSON Schema su esamu Ajv. Tai dar ne realaus V2
  puslapio desktop / mobile maketo patikra: nei Studio, nei rendereris
  šia užduotimi nepakeisti.

## Kitas leidžiamas etapas

Claude galutinė peržiūra pagal START; atviri faktai ir vidinio saugojimo /
teisių prašymų proceso priėmimas. Tik po jų – esamo Signaturepads StudioV2
juodraščio Core kelias, tikras renderio patikrinimas ir tikslios revizijos
Roko patvirtinimas. V1 failas yra mainų artefaktas, ne pakeitimas į seną
Studio ar ranka suformuota native approval.

Jokių approve, release, deploy, DNS, originalaus WordPress, pašto duomenų
šalinimo ar naujų bandomųjų laiškų šiame etape neatlikta.
