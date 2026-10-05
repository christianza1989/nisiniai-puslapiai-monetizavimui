# FB integracijos perdavimas

2026-10-01. Savininkas autorizavo šios root sesijos bendravimą su `01a0f1fa-3e13-7ab0-867b-d0091e73e1b7` (local, „Suplanuoti AI skambučių platformą“). [FB planas](../../FB_ACQUISITION_PLAN.md) papildo ankstesnį [core/kalibravimo perdavimą](../client-acquisition-2026-10-01/COORDINATION.md).

## Siūloma sutartis

- Vienas account/channel koordinatorius ir minimalus per-nišą router/worker kontekstas; vienas FB browser writer, API per-thread ordering atskirai.
- Tas pats Business/siteId ir CaseSource. FB įvykis nevirsta MailMessage, public signalas nevirsta gauta užklausa. Naujo adapterio DB/RLS/receipt kelias reikalingas prieš veikiantį e2e.
- Common → role → niche → current facts → channel policy → case context; atskiri instrukcijų ir faktų hash. Filesystem skill nėra automatiškai pakrautas runtime fragmentas.
- Source/recipient/provider/owner permission vartai atskirai; asmeninės grupės ir oficiali Page Messenger nėra vienas transportas. Nuolatinio personal-profile collector teisės neįrodytos.
- Kalibravimui: wrong niche/city/scope, buyer vs supplier/employment, stale signal, per-page identity, changed facts/policy, injection, duplicate/uncertain write, messaging window / response latency, atsisakymas ir realių poreikių metrika.

## Būsena

Konkreti papildoma žinutė su šiais failais ir ribomis 2026-10-01 išsiųsta per `send_message_to_thread`; tool grąžino tikslinį threadId. Kompaktiškas snapshot rodė sesiją aktyvią, naujausias darbas — jos pardavimų / instrukcijų kandidato kalibravimas, ne FB integracijos patvirtinimas. Cursor išsaugotas [COORDINATION.json](COORDINATION.json). **Abipusis patvirtinimas ir FB runtime e2e negauti.** Kitos sesijos `agent-business-core/runtime/` bei `voice-agent-plan/` šioje root užduotyje neredaguoti; jos aktyvių kalibravimo procesų nestabdėme.
