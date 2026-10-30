# Promedical: redagavimas svetainėje ir failų eilė

2026-10-30 Roko patvirtintos apimties įgyvendinimas. Šaltinis parengtas atskirose CORE/PUBLIC šakose. Diegimas, gyvos DB migracija, naujas raktas ir 3510 užduoties aktyvinimas reikalauja atskiro Roko leidimo. Šis dokumentas nėra toks leidimas. Istorinio PR80 diegimo, atsarginės kopijos ir 20 juodraščių įkėlimo nekartoti.

## Roko kelias

Prisijungęs per `/admin/login` Rokas grįžta į įprastą svetainę. Gido, kategorijos ir produkto puslapyje atsiranda valdymo juosta. Lankytojams valdikliai nesukuriami: viešas puslapis neturi juodraščio duomenų, o sesija tikrinama atskirai be podėlio.

- **Taisyti** atveria naujausią juodraštį vietoje. Pavadinimą, aprašymą, pastraipas, antraštes ir sąrašo punktus galima keisti; esami vaizdai išsaugomi. Išsaugojimas kuria tik juodraštį. Struktūriniam blokų pridėjimui lieka išsamus admin redaktorius.
- **Perrašyti** į eilę įrašo visą naujausią juodraštį ir pastabą.
- **Perdaryti dalį** įrašo pažymėtą tekstą, jo blokų kelius, tikslius UTF-16 poslinkius ir pastabą. Serveris patikrina citatą. Jei rodomą viešą tekstą jau pakeitė naujesnis juodraštis, prašoma pirma peržiūrėti juodraštį. Kelių pastraipų pažymėtas tekstas pakeičiamas vienu teksto fragmentu, išsaugant nepažymėtą pradžią/pabaigą ir vaizdus; antraštės/aprašymo negalima jungti su turinio pažymėjimu.
- **Dar nematomi tekstai** pateikia juodraščius, dar neviešus ir konfliktuojančius tekstus. Senas viešas tekstas ir naujas juodraštis rodomi greta; telefone vienas po kitu. **Patvirtinti** atveria esamą Roko patikros dialogą su šešiais patvirtinimais. Tik pats Rokas pateikia galutinį publikavimo veiksmą. **Perrašyti dar kartą** įrašo naują užduotį.

Naujesnis to paties puslapio prašymas pakeičia ankstesnį laukiantį prašymą. Pasikeitus tekstui kitame lange, atsakymas neperrašo naujesnio juodraščio. Įvedimo laukai išlieka po sesijos klaidos ar konflikto. Codex ir programa neatlieka approve/release/publish. Kategorijų dienos ribas taiko Rokas. Automatinis naujo gido juodraščio importas laukia, jei jau yra kito gido nepaskelbtų pakeitimų.

## 3510 programa be AI

`scripts/content-rewrite-bridge.mjs` vienu paleidimu perskaito serverio eilę, išsaugo naujas užduotis, patikrina baigtus atsakymus ir įkelia tik jau dvigubai patikrintą kandidatą. Ji nekviečia modelio ir nekuria teksto. Naujam atsakymui vieną kartą siunčiamas `codex queue` pranešimas šiam TX-GEM pokalbiui, kad Codex atliktų tikrą faktų/Core patikrą. Tai nėra automatinis PASS. Claude patvirtinimo programa laukia.

Eilė serverio D1 lentelėje `content_admin_rewrites` išlieka po perkrovimo. Vietinis SQLite WAL žurnalas saugo užduoties ID, nekintamą numerį ir įkėlimo kvitą. Numeracija prasideda po visų esamų failų ir vietinių rezervacijų; `001-iso.md` nekeičiamas. Naudoti vieną eksportuotoją šiame aplanke: failų sinchronizacija nėra kelių eksportuotojų užraktas. Dingus atsakymui po serverio įrašymo, tas pats importas pakartojamas idempotentiškai. Atsakymo ir patvirtinimų failai prieš importą perskaitomi dar kartą.

Transportas leidžia tik HTTPS `promedical.lt` ir tris rewrite-bridge veiksmus: `list`, konkretaus ID `status`, konkretaus ID `draft`. Naujas atskiras `CONTENT_REWRITE_BRIDGE_TOKEN` nesuteikia savininko sesijos. Esamo DraftOnly rakto teisės lieka gidams/kategorijoms. Tokenas nerašomas į Drive, Git, argumentus, žurnalus ar užduoties XML. Windows paleidiklis jį iš DPAPI failo įdeda tik į savo proceso aplinką ir po darbo pašalina.

## Failų sutartis

Užduotis: `uzduotys/NNN-rewrite.md`, pagal esamą `001-iso.md` struktūrą, su svetainės URL, užduoties ID, pradine versija, apimtimi, tikslia pažymėta dalimi, Roko pastaba ir esamu tekstu/šaltiniais. Pabaiga `--- PABAIGA ---`. Antigravity toliau vadovaujasi `RASYTOJAS.md` ir `NE-AI-RASYMAS.md`.

Atsakymas: `atsakymai/NNN-atsakymas.md`. Pirmos eilutės `Atsakymas į: NNN`, `Modelis: ...`, gale `--- PABAIGA ---`. Viso teksto atsakymas turi pavadinimą, iki 155 simbolių meta aprašymą ir turinį. Dalies atsakymas turi tik pakaitinę prozą. Nepilnas failas nenaudojamas.

Codex perskaito aktualias tekstų taisykles, patikrina faktus pagal šaltinius, Core struktūrą, kalbą ir nuorodas. Prieš kitą įkėlimą pašalina nuorodas į atsisakytus gidus 459, 460, 495, 454, 471, 486, 489, 492, 447, 1910, 498; neperrašo saugomų 254/260/266 partijų vien dėl šio darbo. Patikrintas struktūrizuotas kandidatas įrašomas `patikra/NNN-codex.json`:

```json
{
  "jobId": "<serverio užduoties ID>",
  "etag": "<užduoties pradinė versija>",
  "answerSha256": "<viso atsakymo failo SHA256>",
  "reviewer": "Codex",
  "verdict": "PASS",
  "checks": {"facts": true, "core": true, "links": true, "language": true},
  "evidence": "Konkreti faktų, šaltinių, struktūros ir nuorodų patikra; nuoroda į ataskaitą.",
  "candidate": {
    "changes": {"title": "...", "description": "...", "body": [{"type": "paragraph", "text": "..."}]}
  }
}
```

Dalies užduočiai `candidate` yra tik `{"replacement":"patikrintas pakaitinis tekstas"}`. Serveris pats pritaiko jį tik pažymėtai sričiai. Viso teksto `changes` nekeičia URL, publikavimo datos, pritarimo, vaizdų ar katalogo specifikacijų; vaizdų ID ir tvarka turi sutapti. Faktų PASS negalima generuoti vien todėl, kad failas yra tinkamo formato.

Claude peržiūri atsakymą ir tikslų Codex kandidatą, tada pats įrašo `atsakymai/NNN-patvirtinta.md`:

```text
Atsakymas į: NNN
Užduotis: <tas pats užduoties ID>
Atsakymo SHA256: <atsakymo failo SHA256>
Codex patikros SHA256: <NNN-codex.json failo SHA256>
Patvirtino: Claude
Sprendimas: GERAI
--- PABAIGA ---
```

Hash skaičiuoti iš tikrųjų UTF-8 failo baitų, išsaugojus galutines eilučių pabaigas. Pakeitus kandidatą ar atsakymą reikia naujo Claude patvirtinimo. Vien bendras „GERAI“ žinučių kanale šiam automatiniam importui netinka. Failų autoriaus tapatybė remiasi sutarto kanalo ir katalogų prieigos taisyklėmis; SHA susieja patvirtintus baitus, neįrodo autoriaus. Rašytojas nerengia savo patvirtinimo.

Po importo programa rašo `patikra/NNN-ikelta.md`. Netinkamų ar pasenusių failų netrina ir neperrašo; priežastis išlieka vietiniame dienos žurnale.

## Parengtas diegimas, šiuo metu nevykdomas

Po atskiro Roko leidimo atsakingas diegėjas:

1. Patikrina abu main ir PR šaltinius bei exact tuo metu gyvą Worker. Ši šaka nėra leidimas perrašyti gyvą bazę ar kartu diegti istorinius PR75/646.
2. Taiko tik pridedančią PUBLIC `db/content-admin-rewrites.sql` migraciją; ankstesnes admin lenteles gyvas PR80 jau turi. Diegia peržiūrėtą, su gyvu šaltiniu suderintą build. Rollback: grąžinti ankstesnį tikslų Worker, sustabdyti tik šį bridge; papildomą eilės lentelę palikti, duomenų netrinti.
3. Atskirai suteikia Worker ir 3510 tą patį naują rewrite tokeną. Nenaudoja esamo DraftOnly ar savininko slaptažodžio. DPAPI failą sukuria tame Windows vartotojo kontekste, kuriame veiks užduotis, su tik tam vartotojui skirta prieiga. Kiekviename PC DPAPI reikia provisionuoti atskirai.
4. Už Git/Drive išsaugo `rewrite-bridge.example.json` kopiją. Patikrina `root`, `state`, `tokenFile`, Node (šiuose bandymuose naudota 24.21.0), esamą `codexJs` ir šio pokalbio `threadId`. Konfigūracija kol kas `enabled:false`.
5. Vykdo `scripts/install-content-rewrite-bridge.ps1 -Config <privati-konfigūracija>`: sukuriama **išjungta** `Promedical-Rewrite-Bridge-3510` užduotis. Esamos užduoties scenarijus neperrašo. Jokių kitų gaudytojų nekeičia.
6. Tik patvirtintam aktyvinimui nustato `enabled:true`, vieną kartą vykdo `run-content-rewrite-bridge.ps1 -Config ...`, tikrina žurnalą ir įjungia būtent šią užduotį. Ji vyksta kas minutę, be matomo lango, be persidengiančių paleidimų, tik prisijungus Drive vartotojui. PC turi būti įjungtas ir Drive prieinamas; neprieinamas katalogas dirbtinai nekuriamas.

Žurnalai: šalia `state` esančiame `logs/YYYY-MM-DD.log`; atsakymai ir kvitai – sutartame Drive aplanke. Duomenys/minutės tikrinimai nekeliami į AI. Codex pranešimo neaiškus rezultatas paliekamas `notices.state=dispatching`; automatinio siuntimo pakartojimo nėra. Pirma patikrinti šio pokalbio eilę ir `patikra/*-reikia-patikros.md`; tik įrodžius, kad pranešimas nepasiekė pokalbio, atskirai atstatyti konkrečią vietinio notice eilutę. Importo kvitai ir numeracija dėl to nekuriami iš naujo.

## Vietinė patikra

- PUBLIC `npm run test:core`, TypeScript, pakeistų failų ESLint, `npm run build` ir vietinis SEO smoke.
- CORE `node --test tests/content-rewrite-bridge.test.mjs`.
- PUBLIC `node tests/content-admin-rewrites-workerd.mjs <absoliutus CORE checkout katalogas>`: workerd, izoliuotas D1, realus failų transportas, tik fiktyvūs patvirtinimai.
- `node tests/browser/content-inline-fixture.mjs`: atsitiktinis tik localhost portas, fiktyvi paskyra, realus renderer/API/SQLite. `tests/browser/content-inline-editor.mjs` tikrina pažymėjimą, pastabą, juodraštį, palyginimą, Roko dialogą jo nepateikdamas, konfliktą ir telefono plotį. Fiktyvus slaptažodis naudojamas tik šiame neprieinamame iš tinklo testiniame serveryje.

Visos šiame etape naudotos DB yra vietinės. Gyvų juodraščių, slaptažodžių, tokenų ir publikavimo būsena nekeista.
