# Exact laiškų ir anti-spam būsenų patikra

2026-10-10. Žmogus tiesiogiai paprašė asmeniškai peržiūrėti atrinktus teikėjus ir laiškus bei pilnai pataisyti / kalibruoti tekstą ir siuntimo ribas. Tai atskiras kokybės etapas po [šaltinių tyrimo](ACQUISITION_LT_DRAFT_DISCOVERY_QA_2026-10-10.md) ir [papildomos atrankos](ACQUISITION_LT_DRAFT_GAP_REVIEW_2026-10-10.md). Ankstesni 20 MANUAL juodraščių skaičiai nebuvo recipient-copy priėmimas. [Redacted kvitas](ACQUISITION_COPY_REVIEW_RECEIPT_2026-10-10.json) saugo exact hash / usage / ribas.

## Asmeninė peržiūra

Root perskaitė visus20 originalių ir galutinių subject/body, patikrino minimalius pirmosios šalies paslaugų / vietos faktus ir dabartinę žmogaus all-LT/all-beauty apimtį. Atranka:11 pirminio fit,7 papildomo native kvalifikacijos / aktyvacijos tikrinimo,2 further-research hold. Nežinomas noras prisijungti ir nepatvirtinti kontaktai nėra klientai ar sutikimas. Vienas paslaugų tinklas lieka viena organizacija; neaiški paslaugų pasiūla nespėjama.

Actual original wrapper kopijavo `fact` į vienodą laišką: visuose trūko opt-out / konkretesnės naudos, dviejuose nutekėjo vidinės geografijos patikros pastabos, viename – paslaugų nežinomybės pastaba. Maintained researcher/reviewer instrukcijos jau aprašė personalization / benefit / vieną žingsnį / opt-out; tai manual-wrapper ir neįvykdytos exact-copy peržiūros klaida, ne modelio runtime įrodytas gedimas. Source-backed list size ir techniniai testai šio turinio nepatvirtino.

Root perrašė20 atskirų juodraščių pagal patvirtintą paslaugą; neįrašė kainų, nemokamumo, garantuotų klientų, veikiančio CTA ar patvirtintos kvalifikacijos. Atskirti vidiniai notes ir recipient prose, pridėtas vienas proporcingas klausimas ir atsisakymas. Nepriklausomi tool-free Codex CLI procesai patikrino2 senus FAIL ir20 revised-v1:19/20 PASS, viename atmesta užuomina apie nepatvirtintą vieno profilio funkciją. Ji pašalinta, papildomai patikslinta vieno laiško tema; abi revised-v2 exact patikros PASS. **Final20/20 content/operator PASS**,24 actual copy CLI calls. Tai nėra engine `draft_ready`, kontaktavimo teisė ar modelių šeimų nepriklausomybė.

Privatus final packet SHA `75e228fc999b880f12440d13070f0edf2b7fe41111652bf2021759e945fdab5b`, skaitymui MD `4ff4a2d7951ec94616d378a895b2ebe9f15fffa5f632dc409299a42d06a77e61`. Original15 ir5 candidate paketai, pirmi FAIL, source expiry ir hash nekeisti. Exact review receipt hash sutampa su kiekvienu galutiniu tekstu. Organization/letter/contact exportų Git nėra.

## Actual dialogų radiniai ir pataisos

| Run | PASS | CLI calls | Private report SHA256 |
|---|---:|---:|---|
| copy-source-reply-20261010-a | 4/6 | 37 | b88a7d56ace236bfbb976dde402c61a3867b34a5405718aed92bc75f9088c656 |
| copy-source-reply-20261010-b | 5/6 | 38 | 99e15cab11e2f887ba063253726b4ea06a547184f3932584b828166030e5256c |
| copy-source-reply-20261010-c | 5/6 | 34 | 41b162dc6ec4ea5878c3b66d76028b1e17fc322f74a7012c4148012997d56eab |
| copy-source-reply-20261010-d | 6/6 | 40 | f78cfa83a32bab11965c1637168c2ad70eb4b758e798f6f814535fd25040c462 |

A:4/6 PASS. Clinical a03 atsisakymas + request apie mūsų publication/deletion būseną gavo unsupported privacy reply ir INCOMPLETE. Viešas paslaugų puslapis tokios mūsų būsenos nepatvirtina. Naujas `privacy_handoff` turi tikslų inbound quote, tuščią laišką / refs, stop/hold ir operator-required receipt; `handoff_executed=false`. Source-only privacy reply vartas nesusilpnintas. Suppression reikalavimas išlieka net blocked reply. Fiksuoto tikro FAIL inbound1CLI replay PASS; papildomi3 general/medical reply atvejai PASS (source-only prašyta informacija, informacinis publication handoff, medical refusal).

A a05 agentas teisingai sustabdė, kai dinaminis gavėjas aiškiai paprašė pasiūlymo netęsti, bet too-narrow wrong-person-only oracle davė FAIL. Original FAIL paliktas. A ir B korpusai yra atskiri: B wrong-recipient persona pateikia tik nebedirbimo faktą be opt-out, klinikos persona papildyta actual atskleista rights situacija. Acceptance slenksčiai nenuleisti; known cases nėra blind.

B:5/6 PASS, a04 first FAIL paliktas. Agentas teisingai neprisiminė senos nemokamo piloto kainos, tačiau leidimą rašyti tik patvirtinus sąlygas išsaugojo tik tekste ir grąžino marketing_hold_required=false. Pataisa: `interest/hold`, tikslus `resume_condition_quote`, jokio papildomo laiško ir hold state. Quote nėra automatinio resume leidimas; lab receipt `resume_authorized=false`. Fiksuotas B gavėjo inbound1CLI replay PASS.

Terminal refused/complaint record su suppressed=false ankstesnis helper resetino į new ir bandė modelį. Du sentinel first FAIL (actual CLI calls0) išsaugoti. Dabar abi status būsenos sustoja prieš modelį; after probe2/2 PASS. Post-stop rights Case apdorojimas lieka atskiras nuo marketing helper.

C:5/6 PASS; a04 pirmas current price klausimas buvo per anksti interpretuotas kaip būsimo kontakto leidimas, todėl gavo hold be prašyto atsakymo. Grade true neperrašė label FAIL; root perskaitė actual tekstą ir pataisė tą pačią conditional-hold instrukciją: dabartinis klausimas / sprendimo atidėjimas nėra aiškus kito kontakto apribojimas. Fiksuotas C inbound1CLI replay dabar question/reply PASS; istoriniai C / A / B FAIL nekeisti.

D:6/6 PASS, visi exact implementation/instruction/corpus snapshots unchanged. Root asmeniškai perskaitė visus final-D subject/body ir gavėjų atsakymus / state / captured `.eml`. Dabartinis kainų klausimas gauna faktinį atsakymą, būsimo kontakto kainų ir funkcijų sąlygos lieka hold; atsisakymas stop su post-stop0model guard; netinkamas gavėjas neskatinamas; nepatvirtinti klinikiniai ir pajamų pažadai atmetami; vidinių notes laiškuose nėra. Tai šeši deklaruoti žinomi scenarijai (24 A–D case observations), ne visas400 generatorius, blind holdout ar actual inbox delivery.

## Vykdymas ir perdavimas

Iš `agent-business-core/runtime`: `uv run --locked python scripts/acquisition_dialogue_lab.py --run-id NEW-UNIQUE --corpus evals/acquisition/copy-regression-20261010-b.json --limit 6 --max-calls 48 --max-turns 3 --timeout 120`. [Original baseline corpus](../agent-business-core/runtime/evals/acquisition/copy-regression-20261010.json), [atskiras B/C corpus](../agent-business-core/runtime/evals/acquisition/copy-regression-20261010-b.json), [exact turinio vertinimo rubric](../agent-business-core/runtime/evals/acquisition/copy-review-rubric-20261010.md), [lab apimtis](../agent-business-core/acquisition-plan/CALIBRATION.md). Visi adresai / evidence `.test`, neutralūs organizacijų ID. Naujo ID reikia, old `.eml` / receipts neperrašomi. Agentas negauna persona, expected labels ar reviewer corpus; procesų atskyrimas neįrodo skirtingos modelių šeimos.

Local78offline/33subtests, scoped Ruff, acquisition skill/hash/links ir4exact external contracts PASS. Naujo unittest pirmas FAIL buvo price fixture oracle question vietoje testuojamo conditional-interest; jis suderintas tik tame naujame fixture, istorinių A/B FAIL neliečiant. Trys code upgrades ir vienas workflow upgrade turi atskirus immutable journals:330571ff, f889ae30,5b2a5d54,871e1bc0. Source baseline3e28/model-run dirty exact hashes ir būsimas committed source/CI yra atskirai; main / other-PC / normal adapter / hosted adoption nėra PASS.

Actual šiame etape CLI calls `179`; usage kvite, USD attribution nežinoma (null), ne USD0. Sender / search / SQL services nepaleisti. **External sent=false / campaign_ready0 / real recipient addresses0**. Source-use, contact basis, actual opt-out persistence/transport, current native qualification/price/CTA, normal privacy Case/resume/daily runner ir hosted site→core→portal lieka atskiri priėmimo vartai. Pilnas agentas /35dashboard ekranai / heartbeat neužbaigti. Kitas konkretus owner veiksmas: normal grant/0012/mount/projection/typed execution adoption pagal issue66; naujos hold/suppression/handoff būsenos turi būti pritaikytos tam pačiam normal runtime, ne vien išaiškintos laiške.
