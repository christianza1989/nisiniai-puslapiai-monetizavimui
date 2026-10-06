# Facebook acquisition core: local increment

2026-10-07: the [current implementation roadmap](../FB_AGENT_ROADMAP.md) adds checkbox milestones, transport acceptance and a PhoneBridger acquisition experiment. It is a plan, not an enabled collector/sender, new API or repeat of this module's dated QA. Keep this document as the actual implementation contract until a scoped code change is accepted.

2026-10-01. Implemented private per-niche policy, metadata/signal registry, durable preparation queue, operator GUI, bounded CLI drafting and database integration. This is not a running personal-profile browser collector, Page webhook or external sender. Actual acceptance: [QA](../research/facebook-module-2026-10-01/QA.md), [UI](../research/facebook-module-2026-10-01/UI-CHECK.json), [CLI](../research/facebook-module-2026-10-01/CLI-PROBE.json). Target architecture and real platform access: [FB_ACQUISITION_PLAN](../FB_ACQUISITION_PLAN.md).

## Use the existing core

The small integration is `runtime/src/pinet_core/api.py` router registration and `runtime/migrations/env.py` metadata import. `facebook/` owns its implementation. Existing `models.py`, conversation `jobs.py`, mail, sales and voice contracts remain unchanged. Use existing `Business`/siteId, restricted DB role, `db.transaction`, approved `knowledge.projection`, current public contact configuration and core `Case`/`CaseSource`.

Additive migration `0009_facebook` follows `0008_mail`. Its two tables have forced RLS. `facebook_records` holds scoped policy/group/signal/action/draft/audit/model_attempt/test-fixture records. Composite case FK rejects cross-site/environment links. `facebook_account_leases` contains only environment/account coordination metadata; it intentionally serializes one account across niches and has environment RLS. No people, cookies or tokens belong in this coordination table. Historical migrations are immutable. The module's disposable-schema checker proves the 0009 head; the older generic 0008 checker does not prove 0009.

Production flags are unchanged. No module policy was enabled in the `local` environment by these tests. Each registered niche defaults to `enabled=false`, `paused=false`; the private daily preparation limit defaults to 20. This limit is our bounded work quota, not a Meta rate allowance or guaranteed free model usage. Template drafts and model attempts share one UTC-day quota; failures consume attempts. Default registries are empty.

## Operator UI and endpoints

When the core is started from this source, open `/operator/facebook-ui` on its existing local port. The running older core process was not restarted; loading a new router requires a coordinated normal restart by its owner. The HTML login shell is public and contains no data/secret; every data/mutation endpoint requires existing operator authentication. Use the existing private operator key; do not put it in a URL, browser localStorage, public package or this document.

`GET /operator/facebook/sites` uses the real registry. UI selects a site and shows its module policy, group rules/metadata, anonymous signals, queued actions, private drafts, separate demand metrics and control audit. Enable, pause and disable apply to the selected site only. Site changes clear old data and disable mutations while loading; writes serialize in the UI. Password state remains in memory and is cleared on logout/failure. Displayed content uses DOM text, not executable HTML.

Paths below share `/operator/sites/{siteId}/facebook`:

| Path | Method | Result |
|---|---|---|
| `/` | GET | Scoped dashboard and current policy revision |
| `/policy` | PUT | Compare-and-set revision, policy and reason; disabling/pausing cancels queued/drafting work |
| `/groups` | POST | Idempotent canonical Facebook group metadata, rules URL and reuse classification |
| `/signals` | POST | Minimal scoped signal with buyer/supplier/referral/employment role, fit, timestamp and data class |
| `/actions` | POST | Bind a private draft action to an existing same-site signal |
| `/tick` | POST | Prepare at most one deterministic private need-brief draft |
| `/actions/{actionId}/send` | POST | Always rejects: live external transport not connected |

The root dashboard path has no trailing slash in the implementation. POST/PUT bodies are limited to 20,000 bytes. Unknown sites/other-site IDs reject. Same idempotency key with different input rejects with 409. Input `reuse=allowed` is an operator assertion, not a technical proof of permission. Anonymous classification is also a factual responsibility; this module is not a certified anonymizer. No real group post text or people were imported during acceptance.

Worker authentication is separate. `/internal/sites/{siteId}/facebook/tick` prepares one template draft. `/inbound-fixture` requires `allow_simulation` and an isolated `test-*` environment; synthetic Page/sender/message identifiers deduplicate into existing CaseSource with type `facebook_page_fixture`. It is not a live Page webhook. Such cases, metadata signals, supplier conversations and button clicks are not customer demand. Real incoming needs and external sends remain zero in this version.

## Bounded generation and recovery

From `runtime/`, use its existing `.venv/Scripts/python.exe`:

```text
-m pinet_core.facebook.worker --site auksarankiams --generator brief
-m pinet_core.facebook.worker --site traktoriupadangos --generator codex
```

Each invocation consumes at most one queued job. `brief` uses useful narrow need questions without a provider call. Optional `codex` reuses existing CodexLab: no tools/network/plugins, read-only ephemeral task, at most two CLI calls and 100 seconds per call. It generates and reviews a private plain-text draft. A second call to the same provider is not an independently calibrated reviewer. No new subscription is installed; CLI account limits and local compute still apply.

No slow model work holds a DB lock. Claims have a 240-second lease, task token and policy revision. Completion rechecks current projection, instruction hash, contact/operator and host. Changed facts/context, disabled/paused module, expired task or a rejected review cannot publish a draft. Permitted personal-source data is not sent to the model in this increment; only anonymous or synthetic inputs are eligible. Missing current knowledge allows a need question, not invented prices, stock, partnerships or service capacity.

Actions: `queued → drafting → prepared` or `blocked`, `cancelled`, `uncertain`. The next active tick/claim marks expired drafting work `uncertain` and its attempt `expired`; it does not blindly rerun the task. A stopped queue does not have a hidden background recovery loop. Account lease epoch/fencing has actual cross-site tests; there is no browser adapter or live lease-taking endpoint yet. Existing conversation jobs cannot be reused as generic pre-customer acquisition jobs.

Drafts store instruction sources/hash, facts hash, site context, qualification reasons, generator and usage/review. They do not count as comments sent or received client requests. The local queue/worker is event preparation, not an always-on hosted FB service. Retention/export/group rule version editing and live channel adapters remain explicit later work; do not assume the existing case-retention job cleans every new acquisition record.

## Verify and isolate disposable acceptance

```text
-m pinet_core.facebook.check_schema
-m pytest tests/test_facebook.py -q
-m pinet_core.facebook.acceptance preview
-m pinet_core.facebook.acceptance probe
-m pinet_core.facebook.acceptance cleanup
```

The acceptance helper uses only named environment `test-facebook-preview-20261001`, synthetic local auth, port 8843/loopback, no SMTP/voice/knowledge refresh and no FB account. Do not expose this test server publicly. `cleanup` removes only that helper's test environment. The preview server was stopped after real desktop/mobile checks. The probe makes at most two actual Codex CLI calls; its report contains synthetic text, not private CLI logs. First probe's encoded JSON body defect was preserved separately, fixed with a schema validator/prompt and re-probed successfully.

## Remaining external integration

Current Meta automated collection permission is UNVERIFIED; owner approval alone is not that platform permission. Groups API was removed; do not invent a working replacement endpoint. Official business Page messaging requires actual Page/app access/scopes, authenticated webhook verification, Page/scoped-ID-to-site association, deduplication, conversation-window/opt-out rules and send receipts. Personal Messenger and group posts are different channels. The source research records the precise current limitations.

Before live collection/contacting add a verified permitted source and concrete adapter tests; preserve single account serialization, per-site opt-out and immediate pause, unknown-send recovery, traceable demand attribution and real case isolation. No paid ads, subscriptions, DNS, real client emails/FB messages, joining or commenting were performed by this increment. Phase-one business fulfilment and expansion gates remain in force.
