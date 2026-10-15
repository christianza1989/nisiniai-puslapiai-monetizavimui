# Native medijos jungties perdavimas

Šis paketas yra source pataisa. Priimtų klientų bylų, veikiančių API/Studio, provider ar DB nekeičiau. Root valdo orchestratoriaus/UI prijungimą ir tikrą adoption.

Sava šaka `codex/verslomatika-native-media-connector-20261015`, bazė `9c618026bb7f57dadfbe77f4e93e30dbdbf92b8c`; paired main `808581d919d06cb4a2d151cc7f9ec1be1782aba2`, public `1a26f289092cecadc5799de898e809dc1769498a` / main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Du atskiri upgrade: `0e38a8dc-d99e-43f4-b9b1-b0a3aec4f2db` ir papildomai suderintas testinio companion importo `d195793f-c76d-44e3-a5b2-ad83714356c5`.

Kvietimas: `await pinet_core.creation.media.attach(tx, session, creation_id, MediaAttachment(...))`. Rezultato kelias yra `result["attachment"]["changed"]`; dabartinis bendras turinio vaizdas yra `result["completion"]`. Kvietėjas valdo SQL transakciją. Adapteris laiko esamus admission actor/Creation užraktus ir atsisako aktyvaus GUIDE, archyvo, source/Session/priimtos revizijos dreifo. Istorinei native medžiagai būtinas dabartinis aiškus S6. Root fiksuotas operatoriaus inbox turi teikti griežtą serverio prašymą, o ne browser pasirinktus kelius ar komandą.

Pilna schema ir kvitų semantika: [sprendimas](../decisions/VERSLOMATIKA_NATIVE_MEDIA_ATTACHMENT_2026_10_15.md). Failas jau turi egzistuoti tame pačiame `revision-N/media-inputs/`. Jokio generavimo neprašo ir neatlieka. Naujam GUIDE kviesti prieš prepare/admission; užbaigtai bylai – tik esant neaktyviems rašytojams.

Svarbios atkūrimo ribos:

- Originalų `MediaAttachment` išsaugoti. Kvitas susietas su originaliais trimis expected hash. Neperrašyti jų vien gavus stale.
- `imported` po nesėkmingo amend leidžia tęsti tą patį importą, kai originalus kontekstas tebėra tikslus.
- `prepared` yra neapibrėžtas importas, todėl automatiškai nekartojamas. Nutrūkimas po puslapio įrašo, bet prieš attached kvitą taip pat stabdomas hash patikra ir reikalauja aiškaus sutikrinimo.
- Jau importuota tiksli šeima naudojama iš naujo; keli tikslūs variantų šeimų sutapimai yra konfliktas. Jau pagrindiniu vaizdu esanti šeima ir completed replay nekeičia puslapio/peržiūros.
- Kvitas nėra editorial/source/media acceptance. Istorinė approval, publishedRevision ir release baitai išlieka.

Galutinės patikros:

| Patikra | Rezultatas |
|---|---|
| Naujas adapteris + esami studio/dependency/stable-root offline testai | 74 PASS / 7,86 s |
| Platesnė native workflow + raster/metadata/HTTP regresija prieš paskutinę race pataisą | 25 PASS / 75,455 s |
| Visi medijos priskyrimo scenarijai po paskutinės tikslaus importo perėjimo patikros | 9 PASS / 22,234 s |
| Jau priskirta šeima esant tikrai 60 variantų ribai po ID dedupe | 1 PASS / 3,346 s |
| Tikras konkuruojantis modelio rašymas ir jau priskirtos šeimos no-op | 2 PASS / 3,322 s |
| Papildomai suderinto statinio companion testo pataisa | 1 PASS / 3,746 s |
| Scoped Ruff, Node syntax, git diff whitespace | PASS |

Originalūs 2 FAIL dėl neegzistuojančio attach-media ir vėlesni 21/1 bei 23/1 platesnių testų setup/portability rezultatai išsaugoti sprendimų dokumentuose. Galutiniai testai naudojo tikrą konfigūruotą readonly companion; kopijos/junction nekurtos. Python basetemp ir visi Node fixtures buvo atskiri privatūs sintetiniai katalogai.

Baigiamoji source peržiūra rado papildomą tarpą tarp sėkmingo importo ir naujo site snapshot skaitymo: nesusijęs rašymas galėjo patekti į po importo expected hash. Dabar tikslus perėjimas išvedamas iš originalaus site ir realių grąžintų šeimos įrašų; imported kvitas išsaugomas, o bet koks papildomas pokytis atmetamas. Paskutiniai 9 scenarijai apima abi tikro modelio lenktynes. Papildomo plataus ciklo nereikėjo; root atskirai tikrina tikrai kviečiamą savo hook.

Po pirmo frozen source `e8f4eddf34aad180f8ee8a634b1524b357583dbc` vienas tikras ribinis scenarijus parodė 1 FAIL / 3,703 s: jau esantis pagrindinis ID prieš 60 esamų variantų sudarė 61 elemento patch sąrašą. Vienos eilutės Set dedupe išsaugo tą pačią 60 ribą ir leidžia tikrą no-op. Paimti ir atskirą follow-up commit; schema ir kvietimo sutartis nekinta.

Committed aprėptis `9c618026..e8f4edd`: PASS, 2 shared paths, 0 uncovered/errors. Numatytasis viso main → HEAD tikrinimas grąžino BLOCKED per 373 inherited shared pokyčius su senų svetimų journal URL/check ir kitomis istorijos klaidomis. Šio paketo abu upgrade buvo verified. Globali main parengtis neskelbiama; svetimos istorijos netaisiau ir neperrašiau. Root gauna konkretų atskirą faktą koordinuoti platesnę bazę.

Paleisti iš core šaknies, nustačius tikrą absoliutų `PINET_PUBLIC_CORE_PATH` ir `STUDIO_NETWORK_SETTINGS`:

```powershell
node --test content-studio/test/customer-content-workflow.test.mjs content-studio/test/image-pipeline.test.mjs content-studio/test/draft-media-metadata.test.mjs content-studio/test/media-import.test.mjs
```

Runtime kataloge naudoti esamą testų Python aplinką su `PYTHONPATH=src`, `PYTHONDONTWRITEBYTECODE=1`, own basetemp ir:

```text
python -B -m pytest -q -p no:cacheprovider -o asyncio_mode=auto --basetemp <own-new-temp> offline_tests/test_creation_media.py offline_tests/test_creation_studio.py offline_tests/test_studio_dependency_preflight.py offline_tests/test_stable_content_artifacts.py
```

Kito repo source, provider konfigūracija, biudžetas, agentų aktyvavimas, main merge ir actual adoption į šį paketą neįeina. Root service/worker hook yra atskiras susietas pakeitimas; vien šios funkcijos buvimas nėra autonominio visos grandinės veikimo įrodymas.
