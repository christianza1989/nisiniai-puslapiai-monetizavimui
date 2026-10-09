# Verslomatika / Madbeauty sesijų koordinavimas

2026-10-10. Savininkas nurodė šioms sesijoms dirbti kartu. Bendras pasiekiamas koordinavimo šaltinis: [issue66](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66). Kiekviena sesija komentare patvirtina repo, savo branch, pilną SHA, tikslius rašomus failus, PR ir priimtą contract_version/schema SHA. Prieš pakeitimus skaito aktualius komentarus ir vykdo Git freshness. Šis dokumentas nėra distributed lock ar patvirtinimas, kad visos sesijos jau jį perskaitė.

| Sesija | Patvirtinta darbo sritis | Ko dar laukiame |
| --- | --- | --- |
| Root 01a1225a-4db6-7aa1-a679-67d01d7cb104 | Shared acquisition paketai ir v1 kontraktas savo codex/acquisition-core-20261009 / PR59 | Durable pipeline, native adapterio ir hosted testų priėmimas |
| „madbeauty.lt agentas“, 01a11268-7ab2-7a23-973c-598322dba15a | Savas Madbeauty backend/Workers; invitation/outbox/native lifecycle po savo platformos išleidimo | Konkretaus v1 adapterio ir signup kelio priėmimas |
| 01a122ec-9cfa-79b3-966b-43aa3f39ab58, kitas PC | Savininkas pateikė ID; iš šio PC read nepavyko | Jos repo/branch/failų ir atsakomybės patvirtinimas |
| 01a0dcf8-8ade-7883-877b-8d5dba4e8c79, kitas PC | Savininkas pateikė ID; iš šio PC read nepavyko | Jos repo/branch/failų ir atsakomybės patvirtinimas |

[Issue64](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/64) jau rezervuoja atskirus Verslomatika identity/portfolio pasiūlymo dokumentus; jis nėra sutapatintas su konkrečia kito PC sesija be jos atsakymo. Jo failų neperrašome ir nesiimame antro konkuruojančio registry.

## Ką dabar perduoti kitam PC

> Perskaityk christianza1989/nisiniai-puslapiai-monetizavimui issue66 ir naujus jo komentarus, PR59 head codex/acquisition-core-20261009, agent-business-core/verslomatika-plan/INTEGRATION_HANDOFF.md bei contracts/acquisition-v1/README.md. Taip pat peržiūrėk issue64 identity/portfolio rezervaciją. Užfiksuok pilną perskaitytą SHA. Issue66 komentare nurodyk savo session ID, repo/branch/full SHA, owned files, PR, actual vs planned API ir priimtą schema versiją. Suderink scope prieš bendro runtime/models/migrations/registry redagavimą. Core acquisition ir Madbeauty backend adapteris kuriami atskirai; nejunk į neegzistuojančius operator/v2 endpointus ir nerodyk fixture kaip gyvo agento. Agent registry/chat/report turi aptarnauti visų verslų agentus. Kontraktas0.1.0 yra ištestuotas kandidatų paketas, jo HTTP/DB/hosted pipeline dar turi būti realizuotas ir priimtas.

Kito PC sesijos nesimato vien dėl to, kad paskyra ar Git repo sutampa. 2026-10-10 patikra grąžino host unavailable; žinutės pristatymo toms dviem sesijoms netvirtiname. [Oficiali Remote connections instrukcija](https://learn.chatgpt.com/docs/remote-connections) nurodo Settings → Connections → Control other devices, kai funkcija prieinama. Reikalinga ta pati paskyra/workspace ir online desktop app. Prijungus hostą reikia pakartotinai patikrinti konkrečių thread read/send; pati nuoroda ar įjungtas setting nėra pristatymo įrodymas.

## Kontraktas ir darbo eilė

[Acquisition0.1.0](../agent-business-core/contracts/acquisition-v1/README.md) turi canonical Python→JSON schema, raw-byte Python/Web Crypto signature vector, invitation/resolve/native lifecycle/capture shapes. Native registracija nepadaro profilio aktyvaus; tam reikia tikro Madbeauty eligibility/operator approval. Testinis capture neišsiunčia laiško į išorę.

1. Sutarti scope/auth/identity pagal aktualų Verslomatika kodą ir issue64. Bendro core generinių agentų registry/chat ownership patvirtina juos kurianti sesija.
2. Root pateikia acquisition durable storage/router/worker ir operator projection su vienu versijuotu kontraktu; Madbeauty priima savo native outbox/ref adapterį. Tikslūs bendri migration/API failai rezervuojami issue66.
3. Uždaras actual model/capture/site-backend testas, tada realios visos Lietuvos šaltinių paieškos juodraščiai su kategorija×vietove ir organizacijos dedup. Nežinomas ketinimas prisijungti lieka unknown.
4. Verslomatika rodo to paties backend būseną, aktyvumą, correspondence, runs, stop ir report evidence. Direktorinis chat nekeičia serverinės mandatų/leidimų kontrolės.
5. Actual hosted priėmimas ir testavimo launch tik po native callback/replay/scope/stop bei tikro paieškos vykdymo patikrų. Faktinės siuntimo teisės/transportas/biudžetas neatsiranda nuo Git merge.

Dashboard [planas](../agent-business-core/verslomatika-plan/README.md) paruoštas, 35 ekranai, D0–D9. Jis atskirtas nuo dar nepriimto įgyvendinimo. Pilnas agentas ir viso pipeline testavimo paleidimas šiame kontrakto etape nedeklaruojami.

## Kontrakto patikra

2026-10-10 lokaliai: 42 acquisition offline regresijos PASS (31 ankstesnė +11 naujų kontrakto/security testų), 3 Node/Web Crypto patikros PASS, canonical schema/vector exact check ir scoped Ruff PASS. Pirmas bandymas turėjo import ordering FAIL ir dvi test fixture TypeError dėl dubliuoto body argumento; pataisytas tik testas, jo tamper assertions nepašalintos. Produkto signature/scope/lifecycle vartai nesušvelninti.

Actual DB/HTTP/site/frontend/replay testų šiame pakete nevykdėme. Docker executable yra, daemon nepasiekiamas; šiame etape svetimas runtime ar duomenų bazė neperimta. Tolimesnės actual DB patikros turi savo izoliuotą aplinką.
