# Xbot paleidimas ir perdavimas

Šis katalogas yra privatus vietinis modulis. Vienas koordinatorius, viena patvari DB ir vienas vykdytojas. Jo operatoriaus raktas nėra Verslomatika kliento sesija. [PLATFORM_CONTRACT](PLATFORM_CONTRACT.md) aprašo prijungimą prie maintained core.

## Pradžia

Prieš naują darbą ar Git perdavimą repo šaknis turi praeiti canonical `scripts/git-freshness.mjs`. Toliau komandos vykdomos šiame kataloge:

```powershell
uv sync --locked --group dev
uv run xbot init
uv run xbot serve
```

Atidarykite http://127.0.0.1:8893. Raktas saugomas privačiame `data/.operator-key`; nerodyti jo loguose. Naują išjungtą profilį galima sukurti GUI arba aiškiai nurodyti:

```powershell
uv run xbot init --site mano-verslas --canonical https://example.com
```

Vien `init` nesukuria nišos. Senas actor-probe failas, įdiegtas Treg ar istorinis bandymo biudžetas nepriskiriami naujam profiliui.

## Codex ir faktai

Kopijuoti tik `.env.example` struktūrą į ignored `.env`. `XBOT_CODEX_MODEL` yra aiškus šio modulio CLI pasirinkimas; app modelio pavadinimas nebūtinai yra CLI modelis. 2026-10-11 šiame kompiuteryje actual draft/review praėjo su `gpt-5.5`; kitame PC prieigą reikia patikrinti. Nėra automatinio modelio fallback. CLI auth lieka savininko vietiniame CODEX_HOME, jo į Git nekelti.

`XBOT_CODEX_ENABLED=false` numatyta. Įjungus tik vietinį ruošimą, per-nišos profilis papildomai turi būti enabled/nepaused su patvirtintais tos nišos faktais, jų šaltiniu ir data. `XBOT_CODEX_CALLS_PER_DAY` riboja visų verslų bandymus vienoje DB; draft rezervuoja dvi užklausas. Timeout ir klaida taip pat sunaudoja bandymą. Token usage nėra patvirtinta piniginė kaina.

Kiekvieno CLI bandymo kvitas saugo tik žinomus žetonų skaičius, net jei paskesnė peržiūra, source tikrinimas ar proceso baigtis nepraeina. Apskaita apima DB gyvavimo laiką; nežinomas kvitas ir rezervuoti kvietimai be žinomos usage rodomi atskirai. CLI timeout/cancel sunaikina savo proceso medį ir išsaugo jau gautą usage; gyvo outbound nutraukimas palieka nežinomą rezervą, pristabdo profilį ir nekartoja siuntimo.

```powershell
uv run xbot day --site mano-verslas
uv run xbot tick --site mano-verslas
```

Planavimas idempotentinis dienai ir politikos versijai. Politika pasikeitus, laukiančių veiksmų review nebegalioja. Codex tekstas išsaugo facts/instruction hash ir atskirą peržiūrą. Pakeistas tekstas yra nauja versija; source draft association negali pridengti kito teksto.

## Treg ir gyvas kanalas

Vietiniam vienam prisijungimui `TREG_TOKEN` laikomas tik privataus proceso aplinkoje. Daugiau paskyrų: `XBOT_CREDENTIALS_FILE` nurodo ignored JSON su `credential_ref → token` žemėlapiu. Viešas profilis saugo tik nuorodą ir `treg_tool`; kredencialai nekeliauja į snapshot ar Codex procesą.

Identity probe kodas reikalauja expected_actor_id, įjungto nepaused profilio, skaitymo ir teigiamų bendrų/per-nišos biudžetų. Kanalo paskirtis ir patvirtinti faktai turi būti priimti prieš turinio ar publikavimo bandymą. `uv run xbot probe --site mano-verslas` biudžeto pats nesukuria ir nepaveldi senos paskyros. Paskyros neatitikimas blokuoja susiejimą.

Treg own X jungtis metered; prieš kiekvieną užklausą tikrinamas katalogas ir konservatyvus rezervas. Rezervai ir nežinomos sumos įskaičiuojami į ribas. Pasenusi paskyros patikra, neužbaigtas siuntimas, netinkamas URL/recipient, neaktuali review ar pakeistas source stabdo vykdymą. Neaiškus write nepradedamas iš naujo. Reconciliation renka ledger/result įrodymus, pats neatleidžia rezervo.

PNG/JPEG importas GUI nemokamas ir vietinis: originalas iki 4 MB / 20 MP, kilmė, alt, patikrintos teisės. X upload ir alt nustatymas atskirai mokami; jų rezultatas turi actor ir expiry. Nėra upload vien dėl importo. Svetainių WebP optimizatorius lieka MEDIA_CORE.

Inbound klasifikavimas priima tik šiame versle gautą paminėjimą su call_id ir author_id. Opt-out išlieka. Tyrimo signalas nėra CRM klientas. Reply/DM reikia atskiro X AI approval, scopes ir žmogaus iniciatyvos įrodymų; jie numatytai OFF.

## Koordinatorius ir patikros

```powershell
uv run xbot worker --cycles 780 --interval 60
uv run pytest -q
uv run ruff check xbot tests
node --check public/app.js
uv run python tests/probe_codex.py
```

Worker pats neįjungiamas ir nėra scheduler paslauga. Jis naudoja kiekvieno verslo darbo valandas ir viena DB saugomus paskyros lock/kvotas. Nevykdyti paraleliai dviejuose PC su kopijuotomis DB. Probe_codex naudoja sintetinius faktus ir du actual modelio kvietimus; jokio Treg ar publikavimo.

Vietinis UI/API klausosi tik loopback. Neskelbti jo viešai ir neperduoti operatoriaus rakto klientų dashboardui. Produkcijos auth, revokacija ir bendras CRM priklauso maintained core. UI, CLI ir mokamos funkcijos nėra to paties priėmimo įrodymai.

Prijungiant prie platformos naudoti vieną DB kiekvienai environment. Susietos organization/business/environment/site tapatybės negalima pakeisti ar pašalinti įprastu policy/rebind. Nesusieto profilio ankstesnių darbų automatiškai neperkelti klientui: sukurti švarią instanciją arba atskirai audituoti migraciją. Tos pačios tapatybės rebind atšaukia laukiančias užduotis ir reikalauja iš naujo įjungti vietinį ruošimą. Maintained async resolverio ir customer sesijos patikros laidai turi atskirą e2e priėmimą.
