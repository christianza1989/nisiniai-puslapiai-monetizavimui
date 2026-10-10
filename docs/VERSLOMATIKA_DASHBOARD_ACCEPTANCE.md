# Verslomatika dashboard and portable control acceptance

2026-10-10. Development/testing only. The owner's later instruction defers public deployment and prepares a fresh setup for another PC; current PostgreSQL is retained, Supabase is not introduced. This extends accepted [I1](VERSLOMATIKA_LOCAL_PORTFOLIO.md) and [I2](VERSLOMATIKA_LOCAL_CHAT.md). It does not accept customer business creation, other executors, production migration or hosted deployment.

## Exact sources and interface

- Core operations/envelope contract checkpoint `a0402e53a48d3503be0c5b36f7ed00c394c60308`; implementation `8aaa175246564d2a0dc4fba6b6aef45f7b605bfa`; paused-read correction `b9a648cda3d7358b1f20b2f85042350aa6edd545`.
- Actual continuation API binds only127.0.0.1:8854 using `pinet_core.control_api:app`. It uses a separate private development DB copied from our accepted I2 pilot, including the original answer. Old8846/8848 services and DB remain unchanged. This is history reuse, not a new inference or production inventory migration.
- Portal owner “Kordinatorius A” owns loopback3016 and its separate source/evidence. Canonical schemas are consumed through Git committed bytes, not a generated dirty working file. Operations digest `435a795260965402d8ec1740094ad8716b2400c9925724efb9e52c1f03a4fb62`. Earlier working-file CRLF digest83c5892b was corrected before source pin adoption.
- Core upgrade journal `upgrade-fbea2507-21fa-45fd-95c1-ce17c8778a98`, [scope70](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/70). Both fresh mains remained private `d4ea8bf7384b70c4ea62a344001e3f8158812c56` / public `d0fd6b7d296303bfcaafadc4071945e675a72b96`, ancestors of the current work. Unmerged branch source is not adopted main.

## Backend checks actually run

| Gate | Status | Actual evidence / limit |
| --- | --- | --- |
| Catalogue, launch, duplicate key and changed-input conflict | PASS | Actual PostgreSQL operations tests; single actual business-planner/chat.consult; disabled executor refuses launch |
| History pagination and source/set/filter/actor/session cursor binding | PASS | Disjoint pages, forged/filter/new-session denial, inserted task409/reload |
| Report/result/usage survives connection pool disposal | PASS | Persisted synthetic executor answer, actual stored input_tokens12 and costnull; no raw CLI/config/log output |
| Foreign organization and revoked business grants | PASS | All operations reads return404; launch denied; inherited current-session/grant/RLS paths retained |
| Paused executor still permits authorized read/cancel | PASS | New task history/detail/thread/events/report remain readable; cancel commits; new submission403 |
| Signed hosted transport preparation | PASS local only | Exact method/encoded target/query/body,45s clock, persisted concurrent/reconnect nonce replay409, separate session401, owner allowlist, bad host/origin/signature403 |
| Minimal control-only server | PASS | Restricted role startup; no legacy channel/operator/mail routes or docs/health surface |
| Portable setup inputs and non-overwrite | PASS | Configurable instance/ports, generated OFF defaults, invalid input rejection, existing private files byte-preserved, bad binary pin refuses before CLI |
| Fresh empty PostgreSQL17 migrations/bootstrap | PASS local rehearsal | New private DB → role-only → Alembic head → restricted grants → explicit9source registrations → preflight; no copied task/organization fallback |
| Fresh HTTP defaults | PASS corrected v2 | Owner login,9registrations, catalogueOFF, history200empty, unknown report404, true zero task counts, immediate logout401 and pool reconnect |
| Actual target PC | UNVERIFIED | Prepared [runbook](VERSLOMATIKA_PORTABLE_CONTROL.md); hardware/account access has not been supplied |
| Actual hosted ingress/TLS/production owner migration | DEFERRED | Latest owner instruction. Future ingress must strip Forwarded/X-Forwarded headers or use a separately reviewed policy; defaultdeny remains |

Actual commands from `agent-business-core/runtime`:

```text
.venv/Scripts/python.exe -m pytest tests/test_control_operations.py tests/test_control_bridge.py tests/test_control_portfolio.py tests/test_control_tasks.py offline_tests/test_control_codex.py -q --tb=short
55 passed in72.13s
.venv/Scripts/python.exe -m pytest offline_tests/test_control_portable.py -q --tb=short
5 passed in1.81s
.venv/Scripts/python.exe -m pytest tests/test_control_operations.py tests/test_control_tasks.py tests/test_control_bridge.py -q --tb=short
26 passed in27.57s after paused-read correction
```

The55/5/26 are separate runs, not an invented aggregate. Scoped Ruff and exact-staged repository safety passed. Private receipts/logs stay ignored in `runtime/artifacts`: `dashboard-tests-first.log`, `portable-tests-first.log`, `dashboard-paused-delta.log`, `portable-rehearsal/receipt-v2.json`. The first fresh rehearsal receipt's `empty-history/report404` label was inaccurate: it asserted history403 and did not test report404. That receipt is retained but invalid for those fields. Actual corrected v2 asserts both paths after the code fix. Initial private DB copy failed due to assumed admin usernamepostgres; correction used the existing private URL username without changing the original DB.

## Paired actual portal path

Portal owner reported actual production-build loopback3016→BFF→8854 browser gates:9authorized portfolio rows, actual catalogue/overview, saved answer/report and reload, modelgpt-6-luna with input13762/output325 and unknown costnull. Answer digest `e4ed78750daf73ef20ce0c73b443ed454f10f18c11369780da448e59931e653c` matches the original I2 answer; this does not represent a second model call. A clearly labelled synthetic generic task was created queued, immediately cancelled with no worker running, and persisted in history/counts after reload. Expanded actual BFF reads/events/reports, both-organization404, missing-cookie401 and logout revocation passed. Portal source/screens and outage/reconnect proof are recorded in its own handoff; final source pin and recovery confirmation are still awaited before marking the local package complete.

No provider inference, public tunnel, deployment, live email/customer actions, Supabase project or Windows service installation occurred in this continuation. Source preparation, current local verification, reviewed main adoption and eventual public deployment remain separate facts.
