# Private Facebook module acceptance

2026-10-01. Scope: additive local core module, per-site controls, RLS, durable private preparation, GUI and optional CLI. No live FB collector/webhook/sender acceptance and no customer-demand evidence.

| Check | Actual result | Evidence / limit |
|---|---|---|
| Disposable schema / migration chain | PASS | 0001–0009 applied in a new UUID schema, 20 tables / 16 FORCE RLS, exact disposable schema removed; existing 0008 rows not changed by checker |
| Local installed migration | PASS | Before `0008_mail`; after additive upgrade `0009_facebook (head)`; no production deployment |
| FB module tests | See TESTS.json | Tenant RLS/FK, wrong auth, default off/per-site flags, revision conflicts, idempotency, source rights/body limits, parallel tick, pause/disable, stale buyer/supplier signals, account fence, synthetic CaseSource, shared quota, changed knowledge, expired model work and private draft body format |
| Relevant core regression | PASS | 43 tests in core/policy/lead_import/mailbox/codex_lab, 138.52 s; mocked mail transport, no client sends |
| Actual GUI | PASS | [UI-CHECK](UI-CHECK.json): login, six real registered sites, auksarankiams private enable, group/signal/action/draft creation, pause, switch to akmenas with empty isolated view, logout. At 390px content width is 390px; actual desktop/mobile screenshots saved |
| Initial CLI probe | FAIL for text quality | [Original probe](CLI-PROBE-FIRST.json) was accepted by model review but encoded internal JSON in body; retained before corrective work |
| Corrected actual CLI probe | PASS | [Final probe](CLI-PROBE.json), two CLI calls, one plain Lithuanian need question, no tool/external actions. Strict body format filter and prompt added. This synthetic example does not prove every future reply correct |
| Lint / catalog / archives / links | See VERIFICATION.json | New owned skill only; original source archives immutable; current final checks recorded |
| Production core process / local flags | Not restarted / unchanged | Existing 8840 process belongs to another session. Test helper environment only; default modules stay off in `local` |
| Live FB source / Page / external sending | UNVERIFIED / NOT IMPLEMENTED | Actual platform facts/access/adapters still required. `/send` returns controlled 503; fixture endpoint cannot impersonate live ingestion |
| Actual customer acquisition / payment / profit | UNVERIFIED | Signals, synthetic cases, screenshots and high technical scores do not establish demand |

The new private increment was authorized by the owner's direct implementation request. Shared router and metadata window coordinated with the existing core owner; `models.py`, conversation jobs and historical migrations were not changed. Preview used loopback 8843 and explicit synthetic auth, then its own process was stopped and only its named test namespace cleaned. Browser viewport reset; own QA tab closed. No original user FB/Gmail tabs changed by this acceptance.

Remaining work is concrete: verified collection/transport permission and Page/app facts; collector/router and live send receipts; opt-out/window rules for actual contacted users; durable unknown-send reconciliation; acquisition retention/rules updates and scheduled runner integration. They are separate from this completed local increment. [Implementation](../../agent-business-core/FACEBOOK_MODULE.md).

![Desktop acceptance](ui-desktop.jpg)
