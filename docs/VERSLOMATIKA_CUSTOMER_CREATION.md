# Customer creation acceptance and portable execution

2026-10-10 human scope: autonomously finish the usable test-customer idea → AI business/site draft → delivered preview/downloads → criticism → immutable revised draft journey, then continue wider core/platform calibration. The initial bounded draft slice is not a full phase-one accepted/public business. Customer UI belongs to the director chat; this branch owns the shared HTTP/storage/executor adapter.

## Exact interfaces

- Creation wire: [OpenAPI](contracts/verslomatika-customer-creation.openapi.json), canonical Git bytes at `c6b29f93b8396a7e839b3dd65c1a17cc6d2ff284`, SHA256 `f6e6258a3ae501af9522f623a08381e8c5585d5a631fc38d83238601283260fb`.
- Domain wire: [OpenAPI](contracts/verslomatika-domain-catalogue.openapi.json), source `bf6a0291ffedfa1129068ffea0ff1fe7d37f3ccb`, SHA256 `731e8ac26cc63575f7ce4f07e970a88b3e14a568a5ddb3abf35e8722d25a8402`. Source PR78 is integrated by scoped cherry-picks; it is not merged main.
- Existing opaque verified customer session and current own portfolio remain authoritative. No email/domain-derived grant or existing Business binding is created by a draft.

## Implemented mechanism

Migration0013 adds five FORCE-RLS tables. Current verified identity, enabled owner membership and exact portfolio/environment apply to every row. Delivered revisions/artifacts/events have SELECT/INSERT only. API admission locks current User before session/creation, serializes global daily admission, bounds20jobs/creation and100creations/customer, preserves idempotency before admission checks, rejects stale base revisions. Unknown availability remains unknown for all45324 inventory rows; TOP200/source ranks and classification provenance are retained.

The explicit local worker reserves one provider execution across cooperating workers, leases the current task, checks live authorization each second, and stores three files atomically only after typed validation/current authorization/base revision. Cancel/reset/revoke/timeout cannot promote a late result. Failures preserve earlier delivered files and require an explicit new retry key; there is no blind provider retry. Queue discovery excludes inaccessible stale jobs while reserving any unexpired running lease. Fixed SECURITY DEFINER discovery exposes only IDs/status/lease and daily aggregate count; it has no arbitrary query/write capability.

One bounded CLI transport is shared with existing consultation. The creation adapter pins server model/executable/hash, ignores user configuration/rules, uses read-only sandbox and denies shell/MCP/apps/plugins/browser/image/multi-agent tools. Optional live web search has at most6 distinct actions. Actual web items and usage are observed from the bounded private CLI trace. Model source claims are not proof each complete page was reviewed. Costs remain unknown, never fabricated zero. Prompt loads current canonical builder/business-validation/business-tools/language-quality files and stores its exact instruction hash. Customer text cannot choose paths/tools/model.

Typed output is rendered by escaped server-owned text/theme enums into a **private preview**, with restrictive CSP/no script/forms/remote resources. The frontend must additionally use a sandboxed iframe with no allow tokens and verify actual UTF8 byte length/SHA256. The JSON download uses `verslomatika.business-draft.v1` and `publicationApproved:false`; it is not the approved shared content-package release or a second public SEO/media engine. Full replacement revisions preserve old files/messages and state the changes.

## Local runbook

Use the existing portable PostgreSQL/restricted-role/bootstrap runbook, migrate through0013 and configure a separate private database/outbox/workspace. Do not copy another PC's authentication, DB or customer data into Git. Set `PINET_CUSTOMER_ENABLED=true`, `PINET_CREATION_ENABLED=true`, `PINET_CREATION_RUNNER_ENABLED=true`, `PINET_CREATION_WORKSPACE` to an absolute existing directory inside this runtime's ignored `artifacts/`, `PINET_CREATION_RUNNER_SECONDS`30..300, daily customer1..20/global1..100. Existing `PINET_CHAT_CODEX_EXECUTABLE`, SHA256 and `PINET_CHAT_MODEL=gpt-6-luna` pin the target PC's verified CLI. Original consultation flags can remain OFF. Optional `PINET_CREATION_WEB_SEARCH_ENABLED=true` enables the bounded source research; it is not permission for other tools.

With a clean exact Git source pin, run from runtime:

```powershell
.venv/Scripts/python.exe scripts/control_portable.py check
.venv/Scripts/python.exe scripts/customer_creation_worker.py check
.venv/Scripts/python.exe scripts/control_portable.py api --port 8860
```

In another owned terminal run `scripts/customer_creation_worker.py worker`. Backend stays loopback. Source is rechecked between jobs; changing code while the worker is live requires a deliberate clean checkpoint/restart. No unattended installer/tunnel/production route is created.

## Acceptance record

| Evidence | State | Receipt |
| --- | --- | --- |
| Isolated actual PG queue, immutable files, idempotency, feedback/history, foreign scope, revoked actor, cancel/late result, timeout/no retry, flags/quota, catalogue HTTP | PASS | First focused8tests, private `artifacts/creation-first.private.log` |
| Existing consultation transport + whole catalogue offline | PASS | 53tests before final HTTP wiring changes |
| Instruction pin, trace/tool bounds, invalid typed result, fixed preview sink | PASS | First4offline tests; empty-match warning removed |
| Combined relevant prior/new suite | Original FAIL retained; corrected retest running | First duplicate basename collection error; second111PASS/22FAIL/41teardownERROR: omitted existing post-migration bootstrap business SELECT/seed in our new DB. Existing `scripts/bootstrap.py` applied, control privileges unchanged. Third receipt separately retained |
| Ruff | PASS | Scoped runtime/tests/scripts check after import fixes |
| Fresh migration downgrade/re-upgrade | PASS | Own empty `pinet_customer_creation_rehearsal_20261010`: head →0012→head, all exit0; private migration receipts |
| Real CLI model/business research/draft | UNVERIFIED | Explicit next acceptance, no provider pass inferred from synthetic adapters |
| Actual customer UI creation/preview/critique/revision/reload | UNVERIFIED | Paired3019/8860 test next |
| Full UI signup/reset password mutation | UNVERIFIED | Browser automation credential-entry handoff restriction; HTTP lifecycle independently tested |
| Full shared F1 publishing/contact/media/audit/business readiness | UNVERIFIED | Draft slice does not satisfy these remaining gates |
| Public/other-PC hosting, real delivery, operational worker uptime | UNVERIFIED | Loopback alone is inaccessible to a hosted portal/customer |

Keep the first model FAIL, raw private bounded output/trace, exact source/model/instruction/usage and intervention history. Private receipts never enter public artifacts/Git. Finite test cases cannot prove an ideal system or commercial demand. Issue77/journal `upgrade-8487ac2f-6c9a-4487-8bfe-e7e9c70c95ec` track this source increment; the platform task continues after it.
