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

Portal owner source `ec99bfced5a6e9289a7fa141dd880b556d08a3e6` reported actual production-build loopback3016→BFF→8854 browser gates:9authorized portfolio rows, actual catalogue/overview, saved answer/report and reload, modelgpt-6-luna with input13762/output325 and unknown costnull. Answer digest `e4ed78750daf73ef20ce0c73b443ed454f10f18c11369780da448e59931e653c` matches the original I2 answer; this does not represent a second model call. A clearly labelled synthetic generic task was created queued, immediately cancelled with no worker running, and persisted in history/counts after reload. Expanded actual BFF reads/events/reports, both-organization404 including valid-shaped foreign launch in both directions, missing-cookie401 and logout revocation passed.

Actual outage: only verified owned8854 API was stopped; report displayed explicit unavailability/retry instead of a fabricated fallback. API restarted on `887a5f9dc0b716867c23e216627508ebd24d94ac`; same browser cookie recovered the saved/cancelled reports without another login. Old8846/8848 were untouched. Portal tests139PASS plus1unrelated mailSKIP, typecheck and production webpack build PASS;562doc links/150MD and exact-staged secret checks passed. Independent portal source review reported no openP0/P1; core bridge/minimal app/preflight was peer-reviewed by the authorized coordinator.

Private canonical portal screenshots: `.local/evidence/portal-owner-report-2026-10-10.png`, `portal-owner-portfolio-mobile-2026-10-10.png`, `portal-owner-outage-2026-10-10.png`, `portal-owner-workspace-mobile-2026-10-10.png`, `portal-owner-history-mobile-2026-10-10.png`, `portal-owner-report-mobile-2026-10-10.png`; all outside Git. Actual narrow390viewport/document375 width, no horizontal overflow; workspace/history/report readability reviewed by the portal owner and these last3screens independently viewed by core owner. Paused actual UI shows unavailable catalogue and disabled selection/textbox/send while the old thread answer, history/counts and saved report stay visible. Full mobile capture timed out once; actual viewport captures were used and inspected. Native button/form focus source reviewed; dedicated keyboard-only new-agent journey is not separately claimed. This limits that evidence, not an invented keyboard PASS.

Final portal documentation commit `fa6d6d3a1b5f8f120d1c49f22928314d01f5e5c0` preserves accepted codeec99. Source-only incremental bundle `verslomatika-owner-portal-2026-10-10.bundle` in the owner's ignored `.local/exports/` is verified, prerequisite main50e00, SHA256 `f7c4db7e0c03888441188acc4c0fe5803d8f9b0baf0613a1dc6fa9f81db1170f`; sibling README provides exact import/build steps. It includes committed Git source, not private env/DB/credentials/dependencies/build/screens. No portal push/Vercel preview was made. Core [PR71](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/71) is stacked on PR69/65; initial exact head887a5f9 static GitHub preflight passed. No main merge is claimed.

Current continuation runtime intentionally leaves `PINET_CHAT_ENABLED=false` and `PINET_CHAT_RUNNER_ENABLED=false`: no worker is running, so new owner tasks should not be accepted to an unserviced queue. Saved history/report remains authorized/readable. Another-PC worker activation follows the portable runbook and its own target account/configuration; this local package does not claim a continuously running agency.

No provider inference, public tunnel, deployment, live email/customer actions, Supabase project or Windows service installation occurred in this continuation. Source preparation, current local verification, reviewed main adoption and eventual public deployment remain separate facts.
