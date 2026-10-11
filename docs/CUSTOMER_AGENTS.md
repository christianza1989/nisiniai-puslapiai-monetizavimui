# Customer agent task configuration

Owner request2026-10-11: a business dashboard add-agent button and an explicit DI request enter the same purpose/discovery/specification path before calibration. This increment provides durable private task drafts. Calibration jobs, module execution admission, protected connectors and activation remain separate unfinished work; this is not the full wizard or a running agent.

## Scope and authority

`customer-agents.v1` is additive to the maintained full and minimal local control API. The separate `PINET_CUSTOMER_AGENTS_ENABLED` flag defaults OFF. It requires local control, the verified customer account, current session/owner membership, the exact registered creation/business/grant and a clean current execution source pin. It does not require or renew a current knowledge/Profile TTL to edit task metadata. No models, tools, connectors or public channels are called.

The server selects the business from its immutable Registration; clients cannot supply user/tenant/business/site/grant/source IDs, prompts, providers, tool permissions or activation flags. Purpose is one of `site_chat`, `customer_research`, `email`, `custom` and is immutable for that draft identity. These are task-discovery choices, not four installed runtimes. A different purpose creates a separate draft for the same business; no new niche is created.

The specification stores a name, goal, audience, inputs, outputs, boundaries, escalation, proposed autonomy, source references, examples and unknowns. These are private proposed data. A reference or desired action does not confirm a business fact, fetch a URL, authorize contact/send or grant runtime permissions. Connector secrets belong to protected setup, never this form/chat. Unknowns remain visible.

## Canonical routes

Canonical generated contract: [verslomatika-customer-agents.openapi.json](contracts/verslomatika-customer-agents.openapi.json), from actual routes and strict Pydantic DTOs.

| Method and suffix after `/customer/v2/creations/{creation_id}` | Behavior |
| --- | --- |
| GET `/agents` | Current owner lists saved draft metadata and actual purpose capabilities; signed pages, limit20 default/1–50. Server `can_create_draft` and blockers distinguish a current business from a revoked/stale/pending registration. |
| POST `/agents` | UUID request, purpose and specification; atomically saves draft + revision1. Response201 has explicit `created`/`replayed`; replay does not create another identity. |
| GET `/agents/{agent_id}` | Reopens exact server identity/current specification/readiness. |
| POST `/agents/{agent_id}/revisions` | UUID request, exact positive `expected_revision`, specification; optimistic conflict409. Purpose and business identity stay immutable. |
| GET `/agents/{agent_id}/revisions` | Bounded descending immutable revision metadata; signed pages. |
| GET `/agents/{agent_id}/revisions/{revision}` | Exact retained specification/hash/source receipt for one version. |

Request UUID uniqueness is per owner/environment across drafts and creations. Same UUID/material reconciles the original exact configuration even after later edits; current agent metadata still describes the latest version. Changed material/scope conflicts. Current actor/grant/business write eligibility still applies. Read/replay never grants execution authority.

Cursors are HMAC signed and bound to current user/session/environment/creation/purpose, and to the agent for revision pages; they expire after300s and do not renew on paging. Invalid/foreign cursor400; expired/wrong-purpose409. Expiry requires an explicit first-page reload. List bodies omit full specifications. Responses are private/no-store and use safe errors.

## Persistence and actual admission boundaries

Additive migration0022 creates forced-RLS `control_customer_agent_modules` and `control_customer_agent_configs`. Exact Registration and parent foreign keys bind ownership/business identities. Configs are immutable; only the module's next revision pointer/timestamp can change. A deferred exact current-config FK prevents a committed pointer without its matching configuration. Populated downgrade refuses history destruction. No old schema, admission, usage, creation, content or conversation history is rewritten.

Registration lifetime is held before actor/creation/module locks, matching canonical admin order. Current owner/session/grant and exact Registration are revalidated after the final awaited Git check and before commit. Terminal registration history remains readable to the current permitted owner; new task writes require current unrevoked registration and no pending creation. Grant revocation denies reads and writes. Source/Session failure rolls back both new identity and configuration.

Readiness reports `configuration_saved=true` plus actual edit eligibility; `enabled`, `provider_execution`, `can_calibrate`, `can_activate` remain false, `calibration_status=UNVERIFIED`, module `not_admitted`, channel `not_performed`. Its calibration/admission blockers are deliberate unfinished capabilities. The portal must render these server values and must not turn an empty browser state, a Profile, a website team result or an example into installed/calibrated status.

## Verification and next path

Actual local adoption on clean pushed1a7c1fa54ffc9d46f7ff7655c7d11e254e85093d/PR80 draft: additive0021→0022 migration, RESTRICT semantic and exactly two empty new tables verified; every old operational row/hash preserved (receiptSHA917228cdff9bc2b8da864121b48437cdcc88cf9d526f94e283c8c93221ae629c). Only source pin and the local draft flag changed. Authenticated actual loopback HTTP saved one synthetic task/revision1, changed its boundary/revision2, reconciled the original UUID, listed/paged/exact-read both versions with all execution/calibration/activation flags false. Every unrelated operational table/accounting/history stayed exact (witnessSHA8af3817485105aa2cc03a9dfd7005189cc18e5b3d89aeeb50be540a0ea98a84a). Explicit owned API stop/restart then reopened both exact versions without any row change (SHA29034d295e83032762996aad51fccfcd84b4e790aef9062c0e847103ca5aa974). Provider/channel0. Canonical Git wire SHAeac95468062f57ab05e60680ae9978e7062c7b13dd6d8d3bd5c14a1bbb17caac/41837B handed to the authorized portal owner. Ordinary BFF/UI remains UNVERIFIED, full calibration/admission/activation is unfinished; this does not certify target-PC/main/public launch.

Original isolated missing-route404 test1FAIL6.37s is retained (SHAa8db673e6084b440147c53deb33523dc2fe838ea19ac850c6a8bd0633d5e844b). First strict-envelope test1FAIL5.96s retained (SHA8d29c5c943cc88d91f2ee446690763786db9f0c26065cc37675f7182fca18a51): the new DTO omitted the existing safe envelope environment field; corrected without changing the shared envelope. Initial positive save/reopen1PGPASS5.41s and26offlinePASS2.61s are a narrow intermediate checkpoint, not full source/UI acceptance.

Final frozen isolated QA:25 restricted PostgreSQL PASS132.31s (logSHAd0b8b5cc07127ad04afcac0afafb39efe177744b70a44ee2f40e5ea9a2ff66fa),26 offline PASS3.79s (SHAdd9513ed626de4dfcee1d468bb0f52720c1e8ad13dcd65f210aa59e27432eb01). Source unchanged, operational database untouched, provider/channel0. Coverage includes UUID replay/material conflict/competing saves and revision CAS, exact reopened versions, foreign RLS and revoked authority, terminal retained reads, owner/session/purpose-scoped pages, final Git/session rollback, immutable rows/current-config FK and populated downgrade refusal. A lost response after commit reconciles the same UUID without a second identity;22 saved versions traverse20+2 pages with exact oldest/current reads. Empty downgrade/reupgrade and synthetic owner fixture cleanup pass. Independent read-only final source review found no P0–P2; it did not run tests or certify UI.

Actual clean operational adoption, authenticated ordinary BFF/UI, calibration/admission/Xbot integration, protected connector and target-PC/public launch evidence remain separate OPEN gates. Existing source-only transfer packets are historical snapshots. Language correction remains paused/UNVERIFIED, Gemini deferred; SMTP/voice/social/public deployment/domain purchase remain OFF.

Independent review identified a revoked-grant UUID collision: RLS hides an earlier own draft but the owner/environment UUID invariant still exists. Actual two-business negative test1FAIL12.65s (SHAe639c5bc43ca16793d1f089b4fa4fdc60db245ffc5fab608acf1d716b3a0148b) returned503. The exact named unique violation is now translated after rollback into409 `idempotency_conflict`, without reading the hidden configuration; final25PG covers this regression.

Retention P2 also reproduced: an older version authorized by loginB disappeared whenB was removed, while original Registration/loginA and current version/loginC remained. Original1FAIL7.43s (SHA50248c17ccd8b022488e4fe96d18930300a48f4eeff748d3b35927851dfe061d) is retained. Both ORM/migration provenance FK and runtime schema guard now require `ON DELETE RESTRICT`; the final three-login test rejects deletion and preserves every Agent/Config/Session field/hash exactly. Logout/revocation remains an update. Earlier22PG/26offline PASS is an intermediate result. Positive int32 revisions have no lifetime20 cap;20 is only the read page-size default.
