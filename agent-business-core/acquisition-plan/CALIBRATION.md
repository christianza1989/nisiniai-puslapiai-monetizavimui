# Tikroviškas uždaras acquisition agento kalibravimas

2026-10-10. Savininkas užsakė ne vien laiško įvertinimą, o įvairių gavėjų atsakymus ir visą tęstinį scenarijų, analogiškai pokalbių agento laboratorijai. Taikoma [business-agent-calibration](../../SKILLS/business-agent-calibration/SKILL.md), tačiau šio acquisition lab nėra conversation learning controller promotion.

Actual vykdymų, pirmų FAIL ir pataisų ataskaita: [QA](../../docs/ACQUISITION_DIALOGUE_CALIBRATION_QA_2026-10-10.md). [Madbeauty būsena](../../sites/madbeauty/ACQUISITION_CALIBRATION_2026-10-10.md) nepatvirtina live launch.

## Kas įgyvendinta

`runtime/scripts/acquisition_dialogue_lab.py` vykdo bendro acquisition `prepare()` ir `prepare_reply()` kelią. Atskiri Codex CLI procesai atlieka tris atsakomybes: mūsų agentas, sintetinį gavėją vaidinantis oponentas ir vertintojas. Kiekvienas kvietimas izoliuotas, be įrankių ir tinklo, per esamą CodexLab. Gavėjo persona ir expected labels lieka runner/vertintojo pusėje; agentui pateikiami tik įprasti patvirtinti kampanijos faktai, vieši testiniai įrodymai ir gavėjo laiškai.

Agentas negauna komandos „dabar testuojamas atsisakymas“. Vieši testiniai domenai neutralūs, be archetipą išduodančių žymų. Pirmas bandymas su užuominomis domenuose išsaugotas kaip invalid fixture, ne acceptance. `.test` adresų, šaltinių ir offer URL vartai apsaugo nuo netyčinio tikro kontaktavimo.

Laiškai iš tiesų įrašomi kaip privatūs `.eml` failai į `runtime/artifacts/acquisition-dialogue/<run-id>/<case-id>/`; jie nėra siunčiami SMTP ir nėra tikra inbox pristatymo patikra. Oponentas perskaito užfiksuotą tekstą, atsako, klausia, patikslina ar atsisako. Agentas analizuoja atsakymą ir parengia kitą žingsnį. Loop ribotas 1–6 gavėjo žingsniais, bendru call budget ir kiekvieno CLI kvietimo timeout.

Tyla naudoja valdomą laikrodį ir nesukuria follow-up mandato; OOO sulaiko seką; refusal/complaint uždaro seką ir papildomai išbando post-stop serverio vartą be modelio kvietimo. Signup yra pažymėtas simuliuotas pradžios įvykis, `profile_active=false`; jis neįrodo tikros registracijos, aktyvacijos ar verslo paklausos.

Mišrus „reklamos nenoriu, bet atsakykite apie mano duomenis“ turi atskirą `privacy_reply`: tiksli inbound prašymo citata, patvirtinti source refs be offer refs, `privacy_information` capture purpose ir marketing suppression prieš vieną prašytą atsakymą. Semantinį tinkamumą tikrina evaluator/operatorius; substring vartas tik įrodo citatos buvimą, ne savaime suteikia siuntimo teisę. Kitą marketing reply post-stop guard blokuoja. Produkcijoje privacy/rights užklausos turi būti perduotos realiam inbound Case ir atsakingam operatoriui, net kai acquisition kampanija paused/expired; šis kampanijos lab helper nepakeičia to M6 handoff.

Atradimo įvestis šiame etape — sintetiniai imported prospect/public-source kandidatai, kuriuos tikras parengimo modelis kvalifikuoja. Laboratorija dar neatlieka gyvos Treg paieškos, produkcinio scheduler/outbox, webhook ar Madbeauty backend registracijos. M3/M6/M8 integration priėmime šiuos stub/capture kraštus pakeisti tais pačiais realiais adapteriais testinėje aplinkoje ir pakartoti scenarijus. Vien ši laboratorija nėra viso acquisition agento užbaigimas.

## Situacijų mastas ir prasminga įvairovė

Generatorius `runtime/src/pinet_core/acquisition/dialogue_corpus.py` sudaro **400 žinomų sintetinių regresijos scenarijų**. Pradinė 384 kombinacijų matrica papildyta atskiru privatumo klausimo + aiškaus opt-out archetipu:

- 25 archetipai: susidomėjęs, užimtas, mokesčių bijantis, skeptikas, konkurento klientas, informaciniai privatumo klausimai, privatumo klausimai kartu su atsisakymu, aiškus atsisakymas, skundas, automatinis išvykimo atsakymas, tyla, netinkamas gavėjas, nuotraukų teisės, pakeistas poreikis, pilnas kalendorius, sezoniškumas, techniškai nepasitikintis, anglų kalba, garantijų reikalavimas, prompt injection, nepagrįstos nuolaidos, jau registruotas, fizinis asmuo be sutikimo, duplikato kontekstas ir kita šalis.
- 8 reprezentatyvios grožio paslaugų kategorijos; jos nėra oficialus Madbeauty kategorijų katalogas. Produkcinė paieška naudos aktualų registry.
- 2 organizacijos kontekstai: įmonė ir savarankiškas teikėjas su tinkamu testiniu sutikimu. „Be sutikimo“ archetipas papildomai tikrina denied kelią.

400 variantų nėra 400 nepriklausomų archetipų ir nėra jau įvykdyti 400 modelio testų. Kategorija ir organizacijos kontekstas keičia faktus bei gavėjo situaciją; interaktyvus oponentas atsako į tikrą agento tekstą. Dedup, timeout, replay, scope ir policy papildomai turi deterministic offline regresijas. Duplikato persona pati neįrodo produkcinio cross-campaign dedup — tam reikia M4 DB priėmimo.

Pridėti naujas situacijas pagal first FAIL ir tikras būsimo piloto kliūtis: kelios darbo vietos/kategorijos, individuali veikla/juridinis salonas, klaidingas kontaktas, kolegos persiuntimas, neaiškus sutikimas, pasikeitęs offer, kalbos, neveikiantis CTA, socialinio kanalo taisyklės, webhook replay, unknown submit ir registracijos nutrūkimas. Vien didinti kombinacijų skaičių nepakeičia trūkstamos rizikos.

## Paleidimas

Iš `agent-business-core/runtime`:

```powershell
uv run --locked python scripts/acquisition_dialogue_lab.py --list
uv run --locked python scripts/acquisition_dialogue_lab.py --run-id my-unique-smoke --only interested-hair-company,price-facial-company,refusal-body-company,ooo-brows-company,silence-lashes-company,personal-no-consent-depilation-individual-consented --limit 6 --max-calls 48 --max-turns 2
```

Run ID nekartojamas: egzistuojančių ataskaitų/.eml runner neperrašo. `--limit`, `--max-calls`, `--max-turns`, `--timeout` riboja vykdymą. Be `--only` parenkamas įvairus archetipų, kategorijų ir organizacijos kontekstų subset, o ne pirmi šeši to paties archetipų bloko variantai. 400 variantų paleidimas turi atskirą kvietimų sąmatą ir batch planą; neįjungti neriboto „mokykis kol idealu“. Kiekvienas modelio kvietimas sunaudoja paskyros išteklius. Actual model identity CodexLab receipt neatskleidžia; production adapterio/modelio priėmimas atskiras.

`--corpus <private.json>` leidžia pateikti atskirai parengtus train/regression/holdout atvejus. Holdout reikalauja `--seal <manifest.json>` su raw failo `corpus_sha256`; hash neatitikimas stabdo prieš modelį. Tai vientisumo ir duomenų atskyrimo kontrolė, ne matematinis nematytumo įrodymas. Žinomas Git generatorius nėra blind holdout; runner niekada savaime nepaskelbia blindness PASS. Saugomą korpusą sudaro atskiras operatorius, agentas/proposer gauna tik train kvitus; po atskleidimo atvejis tampa regresija.

## Taisymas ir versijų palyginimas

1. Užfiksuoti source, instrukcijų, corpus, persona, evaluator ir modelio routing snapshot; paleisti baseline mažą įvairų batch.
2. Išsaugoti pirmą FAIL ir actual dialogą privačiai. Skirti agento faktų/kvalifikavimo, serverio taisyklių, testinės personas, evaluator ir infrastruktūros priežastis.
3. Mažiausia pagrįsta pataisa. `--patch-file` JSON `{ "instruction": "..." }` prideda privatų candidate elgesio fragmentą tik agentui; jis nekeičia serverio vartų, faktų ar protected corpus.
4. Naujas candidate run su tokiu pačiu source/corpus/evaluator; pakartojimai reikalingi dėl modelių kintamumo. Lyginti scenarijų veiksmus ir receipts, ne vien bendrą balą ar signup skaičių.
5. Pakartoti atskleistą regresiją ir operatoriaus paruoštus dar nematytus artimus atvejus. Kritinis FAIL ar incomplete nekompensuojamas kitų PASS.
6. Outbound instruction promotion/adoption/rollback turi atskirą review ir release procesą. Ši laboratorija nieko automatiškai nepromotina ir neįjungia produkcijoje. Geram baseline no-change yra tinkamas rezultatas.

Ataskaita saugo call/usage per rolę, pasirinktos ir visos suite apimtį, pirmą nesėkmę, kiekvieno dialogo state/events ir instrukcijų/source fingerprints. Jei modelio vertinimas teigiamas, bet scenarijaus klasės lūkestis neatitinka, rezultatas lieka FAIL su `scenario_expectation_mismatch`: operatorius tikrina persona, oracle ir klasifikatorių, slenkstis automatiškai nenuleidžiamas. Užfiksuotame D bandyme gavėjas papildė privatumo klausimą aiškiu atsisakymu; teisingas stop neatitiko per siauro question lūkesčio. Istorinis FAIL paliktas; būsimi fixture klausimo ir mišraus opt-out testai atskirti. Kadangi oponentas ir vertintojas gali naudoti tą patį CLI modelį, jų procesų/context atskyrimas nėra nepriklausomos modelių šeimos įrodymas; prieš live reikalingas operatoriaus auditas ir deterministic vartai.

## Užbaigimo vartai

Offline regresijos turi tikrinti tenant/role, unknown fact, stop, no consent, silence, ribas ir realaus adreso blokavimą. Modelio bandymas turi bent šešių archetipų įrodymus; didesnė suite vykdoma etapais ir coverage ataskaita rodo kas neįvykdyta. Release vartai lieka [roadmap M5](ROADMAP.md#kalibravimo-release-kriterijai): 0 kritinių pažeidimų, galiojantys faktų įrodymai, protected įvertinimas ir produkcinio adapterio priėmimas. Actual delivery / reply / hosted onboarding nepasidaro PASS iš capture testo.
