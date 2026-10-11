# StepOver turinio parengimas ir faktinė patikra — 2026-10-10

Parengti visi 28 nauji 47 URL plano tekstai. Po faktų, vaizdų ir realaus atvaizdavimo peržiūros 27 nauji puslapiai patvirtinti; kartu su 19 esamų viešame pakete yra **46 puslapiai**. PS-47 tikro kliento piloto aprašymas paliktas privačiu juodraščiu: nėra tikrų rezultatų ir publikavimo leidimo. Jo neviešina data, paketas, sitemap ar LLM indeksai.

Savininko šešių savaičių nurodymas pakeičia ankstesnio CONTENT_PLAN_20261009 šešių mėnesių leidybos kalendorių. Istorinio plano ir jo tyrimo kvitų neperrašėme. Nauji tekstai ir sprendimai saugomi `content/ARTICLE_DRAFTS_20261010.mjs`, `ARTICLE_DECISIONS_20261010.mjs`, vaizdų alt tekstai — `ARTICLE_MEDIA_ALTS_20261010.json`. Native studija išsaugojo esamų puslapių ID/datas, naujus juodraščius, tikrą redakcinę peržiūrą ir naujų versijų hash. Codex redakcinė peržiūra nėra savininko ar kliento patvirtinimo imitacija.

## Kalendorius

Visos partijos publikuojamos 10:00 **Europe/Vilnius**. Po vasaros laiko pabaigos UTC laikas pasikeičia; tai išbandyta.

| Data | Nauji patvirtinti puslapiai | Bendras matomų puslapių skaičius nuo 10:00 |
| --- | ---: | ---: |
| 2026-10-10 | 5 | 24 |
| 2026-10-17 | 5 | 29 |
| 2026-10-24 | 5 | 34 |
| 2026-10-31 | 5 | 39 |
| 2026-11-07 | 5 | 44 |
| 2026-11-14 | 2 | 46 |

Iki nustatytos 2026-11-21 ribos visi **patvirtinti** puslapiai bus pasiekiami. PS-47 lieka atskira priklausomybė, ne automatiškai publikuojamas pažadas. 2026-10-10 06:43 UTC nuotolinė patikra fiksavo 19 matomų ir 27 dar suplanuotus puslapius.

## Ką tikrinome ir taisėme

- **31 priimtas sugeneruotas vaizdas**: kiekvieno tikri pikseliai peržiūrėti prieš priskyrimą. Tai 27 naujų puslapių ir keturių esamų gidų iliustracijos. Bendras responsive importeris sukūrė 155 naujus WebP variantus; visas release turi 170 variantų. Originalai, promptai ir tikslūs importo kvitai lieka privačioje studijoje.
- Kiekvienam produkto vaizdui pateikta tikra StepOver gamintojo nuotrauka: duraSign Pad 4.3, NG 10 arba nextGen Pad 5. Peržiūrėta korpuso/screen proporcija, rašiklio laikiklis, orientacija, žmonių rankos, teksto artefaktai ir temos atitikimas. nextGen Pad 5 iliustracija yra pagal tikrą reference sutvarkytas produkto vaizdas, ne nauja gamintojo fotografija.
- **Du variantai atmesti ir pakeisti**: PS-21 pradinis tuščias aptarnavimo stalas buvo pernelyg panašus; pakeistas platesne žmonių ir įstaigos scena. PS-46 vaizde atsirado nepatvirtinta valymo instrukcija; ji pašalinta nauja generacija su tuščiu lapu. Nei vienas atmestas variantas nepriskirtas publikuojamam turiniui.
- Skirtingos scenos: sveikatos priežiūra, mokymo įstaiga, viešbutis, teisinių dokumentų biuras, draudimas, klientų aptarnavimas, personalas, gamyba, sandėlis, išvykos, IT bandymas, archyvas ir kitos darbo aplinkos. Kinta žmonės, atstumas ir fotografavimo kampas. Tai aiškiai įvardytos iliustracijos, ne mūsų klientų ar atliktų projektų įrodymai.
- Faktai sutikrinti su StepOver eSignatureOffice, Print2NG, developer/API, Office Plugin, cloud signing ir nextGen Pad 5 puslapiais. Office Plugin aprašytas kaip parašo vaizdo naudojimas Word/Excel, ne PDF ar QES funkcija. eIDAS ir BDAR teiginiai sutikrinti su EUR-Lex; PDF parašo patikra — Adobe dokumentacija. Kainos, likučiai, universalus suderinamumas, SLA ar išskirtinis atstovavimas neišgalvoti.
- Patikslintos kontekstinių nuorodų antraštės, šaltiniai, alt tekstai ir redakcinės metodikos iliustracijų paaiškinimas. Home rodo keturis įvadinius gidus; `/gidai` rodo visus tuo metu tinkamus gidus. Būsimų tikslų nuorodas filtruoja bendras core.

## Patikrų rezultatai

| Patikra | Faktinis rezultatas |
| --- | --- |
| Native redakcija | 37 pakeistų puslapių exact-revision peržiūra ir atominis patvirtinimas; visas approved paketas 46 |
| Native private browser | Visi 37 pakeisti puslapiai Chrome desktop ir 390 px: po vieną H1, vaizdai įkelti, horizontalaus perslinkimo nėra |
| Hosted browser | Tikras Cloudflare gidų puslapis ir visas PDF gidas mobiliame formate; vaizdas įkeltas, alt atitinka, nėra horizontalaus perslinkimo; laikinas viewport grąžintas |
| Immutable release/verifier/import | PASS; 46 approved puslapiai, 170 variantų; q importer `--replace` ir shared compiler 10 paketų PASS |
| Native testai | Pirmas vykdymas 45/46: seno testo fiksuotas devynių paketų skaičius neatitiko dešimties. Pataisius source/compiled ID palyginimą, išlaikius V1 validator/hash/schema patikras: **46/46 PASS** |
| Public core testai | **66/66 PASS** |
| TypeScript/build | `tsc --noEmit` ir framework production build PASS; bendri build perspėjimai išsaugoti, nevadinami klaidomis |
| SEO smoke | Tikras compiled Worker su canonical Host: **19 puslapių PASS** |
| Local preview | Galutinis PASS; pirmas neteisingos bandomosios PREVIEW_HOST konfigūracijos 404 kvitas išsaugotas |
| Cloudflare HTTP | **241 patikra PASS**: 19 due / 27 future, canonical/noindex, CSS/JS, būsimų URL ir tik jiems skirtos medijos 404, robots, sitemap/LLM projekcija, host/origin ribos |
| Publikavimo riba | Izoliuotas compiled Worker su bandomuoju laikrodžiu: šešioms datoms T−1 ms ir T; URL, vaizdai, sitemap, llms.txt, llms-full.txt sutampa; iki 2026-11-21 visi 46 grąžina 200; patvirtinti paketo bytes nepakito |

Laikrodžio bandymas nekeičia PC ar production laiko. Pirmas testinio Host perdavimas Node fetch nuvedė į neteisingą default svetainę; sutvarkyta tik ignored testinė canonical Request adaptacija. Tikras host-aware SEO testas atskirai praėjo. Laikina `dist/server/content-time-audit.mjs` testinė įvestis pašalinta po bandymo; ji nebuvo deploy įvestis.

Privatūs kvitai: `output/parasoplansetes-content-20261010/` — review/approval, media/import/inspection, `remote-check.json`, `publication-time-audit.json`, SEO/local/deploy logai. Studijos data ir kvitų istorija nekopijuojama į viešą repo.

## Release ir įkėlimas

- Release ID: `924b8844-749e-41ba-828e-3c2ee3494806`.
- Content package SHA-256: `78bb031a0c2686bc01a448ef6619d4534400f1ba7411d5f3a5e48b1f09163678`.
- Cloudflare Worker: `parasoplansetes-preview`, version `8534e038-e884-49e3-99db-0991573677d4`.
- Įkelta peržiūra: https://parasoplansetes-preview.pinet-azprekyba.workers.dev/ . Esamas Worker ir D1, jokių naujų planų ar infrastruktūros.
- Core main: `d4ea8bf7384b70c4ea62a344001e3f8158812c56`; companion main: `d0fd6b7d296303bfcaafadc4071945e675a72b96`. Abiejų fetch/ancestor gate PASS 2026-10-10 06:49 UTC; galutinis Git handoff atliekamas prieš push. Darbo šakos PR46 / PR17, naujas source dar nėra main adoption.

## Ribos ir likusios priklausomybės

1. **Tai noindex peržiūra.** `parasoplansetes.lt` dar nesujungtas su production; Google indeksavimui reikia tikro domeno paleidimo ir jo atskirų vartų. Publikavimo data neįrodo Google indekso ar pirmų dviejų pozicijų.
2. PS-47 reikia tikro piloto, rezultatų ir kliento publikavimo leidimo. Parengtas privatus ruošinys jų neatstoja.
3. Naudoti ankstesni 2026-10-09 Treg tyrimo duomenys (bendras istorinis 0.2438 USD); šiame turinio etape **0 naujų mokamų Treg ar runtime inference kvietimų**. Dabar rankų, AI visibility, GSC ar realių užklausų matavimų neturime; tyrimo aktualumo būsena `refresh_due` išlaikyta. Built-in ImageGen naudotas pagal tiesioginį savininko pavedimą; tai nėra Treg/API ledger išlaidų eilutė.
4. Pokalbių/balso/pašto runtime šiame etape nekalibruotas ir neaktyvuotas. Esami chat jungikliai ir ankstesni biudžeto rezervavimai išlaikyti, balsas išjungtas. Laikinas chat backend tunnel nėra ilgalaikio hosted kanalo priėmimo įrodymas.
5. Native testų pataisa registruota `upgrade-dc15fb58-f132-4232-b0a4-3e3a705f13e1`; tai tik išbandomo paketų inventoriaus taisymas, ne publikavimo ar validavimo vartų silpninimas. Istorinis FAIL išsaugotas.
