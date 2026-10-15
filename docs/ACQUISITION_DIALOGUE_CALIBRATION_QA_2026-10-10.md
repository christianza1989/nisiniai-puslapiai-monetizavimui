# Acquisition dialogų laboratorijos patikra

2026-10-10. Scope: explicit provider_signup rolė ir uždaras Codex CLI laiškų kalibravimas. [Metodas ir komandos](../agent-business-core/acquisition-plan/CALIBRATION.md), [roadmap](../agent-business-core/acquisition-plan/ROADMAP.md). Source base `a61a9b5bc54f2f8b5b4f9f075c8c5fab70f4348b`; patikrinti pakeitimai vykdymo metu buvo uncommitted, todėl privačios ataskaitos saugo exact implementation/instruction hashes, ne tik HEAD. Vėliau paskelbiamas scoped PR59; main/production adoption nepatvirtintas.

## Atlikta

- 31 offline unittest regresija PASS: ankstesnės 14 ir 17 naujų. Role/tenant, nesutikęs kontaktas, realaus adreso/source blokavimas, tyla, suppression be naujo modelio kvietimo, svetimi offer/evidence refs, source-only atsakymas prieš invite, privacy request quote, bendras budget, diverse subset ir protected corpus raw SHA tamper prieš modelį.
- Scoped Ruff PASS; wheel build PASS, trys nauji lab/dialogue moduliai ir visi penki MD fragmentai yra wheel pakete. Privačios ataskaitos/.eml/wheel neįtraukiami į Git.
- 400 žinomų regresijos kombinacijų generavimas/schema admission: 25 archetipai × 8 reprezentatyvios kategorijos × 2 organizacijos kontekstai. Tai generatoriaus aprėptis, ne 400 įvykdytų modelio dialogų ir ne oficialus Madbeauty kategorijų sąrašas.
- Actual model runs žemiau; ataskaitose per rolę išsaugoti calls/usage, pirmas FAIL, pilni dialogai ir events. Nė vienas dialogų batch nėra full suite / blind holdout. Exact CLI model ID esamas CodexLab neatskleidžia; visi procesai tool-free ir ephemeral.

## Actual vykdymai ir išsaugotos nesėkmės

| Run ID | Rezultatas | Modelio calls | Priežastis / įrodymas |
|---|---|---:|---|
| actual-dialogue-a-20261010 | INVALID_FIXTURE, nutrauktas | Pilna usage nepatvirtinta | Public testiniuose domenuose buvo archetipų žymos; išsaugotas originalas, neutralūs hash IDs įvesti prieš priėmimą |
| actual-dialogue-b-20261010 | 6/6 PASS | 29 | Interest, price, refusal, OOO, silence, no-consent |
| actual-dialogue-c-20261010 | 3/4 PASS, pirmas FAIL paliktas | 26 | Skeptic/changed need/injection PASS; informacinis privacy klausimas klaidingai complaint/stop |
| actual-dialogue-d-20261010 | 1/2 PASS, FAIL paliktas | 12 | Company privacy PASS; individual reply turėjo aiškų opt-out, teisingas stop neatitiko question-only oracle |
| actual-dialogue-e-20261010 | 2/2 PASS | 10 | Refusal ir OOO po privacy instrukcijos pataisos |
| actual-dialogue-f-20261010 | 1/2 PASS, vienas INCOMPLETE paliktas | 9 | Mišrus privacy-optout PASS; informacinį atsakymą serveris blokavo, nes reikalavo komercinių fact refs |
| actual-dialogue-g-20261010 | 1/2 PASS, FAIL paliktas | 12 | Source-only privacy PASS; mišrus opt-out + aiškus informacijos prašymas liko be prašyto atsakymo |
| actual-dialogue-h-20261010 | 2/2 PASS | 12 | Abu galutiniai privacy atvejai; suppression išlieka, prašytas privacy reply atskiras nuo marketingo |
| medical-regression-20261010 | 6/6 PASS | 12 | Esamo medicininės įrangos preparation korpuso cross-sector regresija |

B–H dialogų vykdymai turėjo 20 case stebėjimų ir 110 calls; medicininės įrangos papildomi 6 stebėjimai/12 calls. Kai kurios case versijos kartotos po diagnozės; jų negalima pateikti kaip 26 unikalių archetipų ar final source full-suite priėmimo. A invalid vykdymas nepridėtas prie priėmimo ir pilnų sąnaudų sumos. Jokio FAIL nepakeitėme istoriniu PASS, vertinimo slenksčiai nenuleisti.

## Actual priežastys ir pataisos

1. Fixture leakage: case ID pašalintas iš public prospect domeno, naudojamas neutralus deterministinis hash. Agentui neperduodama persona/expected labels.
2. Agentas privacy klausimą painiojo su skundu: informacinis klausimas gauna tik faktinį atsakymą be registracijos CTA; aiškus atsisakymas lieka marketing stop.
3. Dinamiškas gavėjas pakeitė stance: išskirtas informacinis privacy ir privacy-optout archetipas; model grade + klasės mismatch lieka FAIL su atskira diagnostika, ne automatinis PASS.
4. Serverio vartas klaidingai reikalavo offer refs: pridėti scoped evidence_ids informaciniam atsakymui; invite tebereikalauja patvirtintų offer facts. Foreign evidence atmetamas.
5. Opt-out nepanaikina paties gavėjo prašyto privacy atsakymo: naujas privacy_reply turi tikslią inbound request citatą, source-only refs, suppression prieš capture, atskirą privacy_information purpose ir post-stop guard. Vien šaltinio citata nėra savarankiškas teisinio leidimo ar semantinio tinkamumo įrodymas — actual evaluator/operatorius tikrina ir tekstą; iki live reikalingas M6/GUI priėmimas.

H actual tekstai ir events peržiūrėti rankiniu būdu: nežinoma email kilmė/retention/deletion pripažinti, neskelbiama kad profilis aktyvus ar duomenys jau ištrinti, po mišraus opt-out vienintelis atsakymas skirtas prašytai informacijai. Pinet capture purpose yra marketing arba privacy_information; tai ne SMTP submission. Marketing sequence lieka stopped.

## Privačių galutinių ataskaitų SHA256

| Run | report.json SHA256 |
|---|---|
| B | 218e6adee6aa951c645276ce9e052d30f91c565f9131277a6155e12fb4771573 |
| C | 7deea29c89697853e85174f4b329c98d6f3ea52bd282fa3df0b0f48ea03cb73d |
| D | e7b98c56fc7fbe6e7532cdcda4576f63c9852b379d01190c201c9e577d6628ad |
| E | 006550342658c56e83e2b2a0e12da58f2dcda47953362b7acc20633bfd9729e4 |
| F | 6532ec2aa4369468a36bc7daab1d4b61160a020b2f470c5469ece303555d55e7 |
| G | be4f789a28c79fab90a7387d41c31702e987ddeb54ede7d6298cf0f4a31fa983 |
| H | 0a97d3e4c107522985ea7b1e861ffdfd8c4b6cfb1db1c61552f7c4e5075e3e69 |
| Medical | e53b1fe90c58a9e463717974eb72dcb95167af199e992becc74c6f2c9ad49da6 |

Visi B–H source/corpus snapshots per atskirą run nepakito. Snapshot ir persona/evaluator versijos tarp taisymo ratų gali skirtis; čia diagnozės/regresijos eiga, ne protected baseline/candidate statistinis eksperimentas. Private candidate `--patch-file` infrastruktūra yra, tačiau šiame darbe taisytas Git source/prompt; private adaptive promotion neatliktas. Production release/adoption/rollback lieka UNVERIFIED, source rollback — scoped commit revert.

## Ribos prieš live

Captured .eml nėra actual inbox delivery; synthetic replies nėra realių gavėjų susidomėjimas; simuliuotas signup nėra backend account verification ar aktyvus profilis. Gyva Treg paieška, mokamos provider užklausos, SMTP, PostgreSQL jobs/outbox, hosted Madbeauty onboarding ir visas 400 modelio suite čia nevykdyti. M3/M4/M6/M8/M9 bei protected M5 priėmimas lieka roadmap. Tolesnės žinios turi remtis aktualiu visų grožio kategorijų Madbeauty katalogu ir realiu patvirtintu pasiūlymu.
