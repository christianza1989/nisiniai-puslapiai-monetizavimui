# S7 lifecycle source handoff

Scope, configuration and rollback: [S7 decision](../decisions/VERSLOMATIKA_EXECUTOR_LIFECYCLE_S7_2026_10_14.md). Upgrade `1a237dab-47fe-4989-9961-3909a8a388c9`, own branch `codex/verslomatika-executor-lifecycle-s7-20261014` from integratedbbb20ed/public1a. Root owns ordinary-account/portal operations and actual adoption. This packet has no runtime/model/channel activation.

Private ignored evidence in `agent-business-core/runtime/artifacts/s7-lifecycle/`:

- `tests-e30777d1.log`: baseline4 FAIL in14.35s, actual selected Discovery/Creation queues beyond20 and absent API lifecycle wiring.
- `tests-e9789257.log`: first positive14 PASS/2 FAIL in45.82s. An inert plan had no canonical host, so actual intake correctly refused it; a cursor test incorrectly compared strings andNone. Original results retained.
- `tests-42c5eda1.log`: diagnostic1 FAIL in22.54s, exact `private_intake_missing` refusal. Test-only explicit example.test host correction; no production gate change.
- `tests-3f695fb7.log`: focused19 PASS in91.01s. Actual selected discovery/creation/native-GUIDE beyond20, explicit approval and three maintained native GUIDEs across restart, owner-RLS keyset wrap/foreign denial, source drift, stale latest and failed GUIDE no retry, defaultOFF/allowlist/cancellation/wiring. GUIDE competitor rows are queue-only FK/RLS fixtures and were not executed.
- `tests-8bd60ca8.log`: expanded44 PASS in383.35s, adding the105-older-approval read-scanner proof and maintained Discovery/site-build/S6 PostgreSQL cases. Original one-argument100-row selector excludes the newer target; the new owner keyset reaches all106 rows.
- `tests-bb9d00f2.log`:9 targeted PASS in48.44s. Real enabled control-API lifespan automatically consumes an allowed owner's newly posted queue with an injected inert role and joins/stops at shutdown; eight direct selected-overload checks preserve original eligibility, reject Session/User/Account/Membership loss, production/unknown targets and PUBLIC execute privilege. Queued rows remain queued after refusal.
- `prepare-migrate.log`, `prepare-bootstrap.log`, `migrate-62359ab3.log`: new owned QA prepared0036 then additively upgraded0037. These logs and database are retained. Original preview0032/all table counts/restricted-role attributes were checked unchanged before/after every batch.

The expanded100-older-approval scanner test uses historical read-only selection fixtures with normal binding/FKs/RLS and an inert no-execution callback. It does not claim native intake, semantic acceptance or model work for cloned rows. Actual pipeline acceptance uses the separate real HTTP/SQL/native Node path with injected provider-zero role outputs.

Scoped Ruff and `git diff --check` pass. Source code was unchanged between the expanded44 and targeted9 groups; only additional assertions were added. Exact staged safety, committed upgrade coverage and PR receipt follow below. Scope source/test paths remain reserved until delivery. Raw credentials, runtime data and artifacts are excluded from Git. Original preview/ordinary clone, flags and foreign worktrees remain untouched.

Target adoption requires current-source restart and the explicit0037 migration on the intended owned database. Keep `site_build_api_runner_enabled=false` until root reviews source and authorizes its configured allowlist/activation. Internal task status is not an always-online guarantee; monitor a failed task and investigate its source/configuration failure before restarting. Foundation semantic acceptance and actual model/ordinary UI calibration remain separate.
