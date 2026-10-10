# Verslomatika customer accounts, public projects and dashboard

## Active expanded instruction — 2026-10-10

**Mode: DEVELOPMENT/TESTING. Full local website implementation continues; P3/P4 core work is in progress.** Human authority was verified directly in director chat01a0dcf8-8ade-7883-877b-8d5dba4e8c79 turns01a124e1-b3ea-7591-a18d-ab3071f8a31d ("igyvendinkite viska") and01a1248e-c9d9-7040-b5b2-13ecbafb5dc6. Earlier owner dashboard/portable acceptance below remains historical and does not complete this expanded instruction. The owner in this chat reaffirms that we are still developing/testing.

Current core branch `codex/verslomatika-customer-public-core-20261010`, managed worktree `verslomatika-customer-core`; portal/BFF/UI remain with Kordinatorius A in its own repository. New core8855 and portal3017 are reserved; old services untouched. Canonical customer/public checkpoint191ed795e6d4aa5c67d8e1abf849dcaf00cea857 follows integrated private main13c9649/publicec8a9c0. [P3/P4 scope and pending acceptance](../../docs/VERSLOMATIKA_CUSTOMER_PUBLIC.md), [issue73](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/73).

Authorized now: local verified customer signup/login/recovery, real persisted claim/create intake with reviewed grants, and a separate revision-approved public project projection. Local private development outbox only. No Supabase, external email, public deployment/tunnel, autonomous worker execution, domain-derived ownership, payments or client-system writes. PostgreSQL actual storage/RLS, deny/revoke/race and paired browser tests are required before acceptance. Runtime source is being implemented; no new PASS or complete product claim yet.

## Current owner instruction — 2026-10-10

**Mode: DEVELOPMENT/TESTING; the current local dashboard and another-PC preparation package are complete. Public deployment is deferred.** The owner first requested a fully updated site, complete dashboard and public login. They subsequently said “pala”, asked whether Supabase can be used, instructed “jei ne tai as tada kitam pc padarysiu, ne sitam tu tik paruosk viska”, then clarified “mes vistiek dar tik kuriam ir testuojam”. We continue with current PostgreSQL without adding Supabase now. This later instruction replaces the proposed current-PC public tunnel/service rollout. The existing live site is preserved. This bounded package does not complete later business creation, customer execution or production adoption; those remain separate roadmap modules.

Core owner: chat01a122ec-9cfa-79b3-966b-43aa3f39ab58, branch `codex/verslomatika-owner-release-20261010`. Portal owner: “Kordinatorius A”, chat01a0dcf8-8ade-7883-877b-8d5dba4e8c79. Portal code remains in its own repository/worktree. Neither this status nor another agent's message creates owner authorization.

Baseline: private main `d4ea8bf7384b70c4ea62a344001e3f8158812c56`, public main `d0fd6b7d296303bfcaafadc4071945e675a72b96`; accepted local I1/I2 source `120a84ac6afc5b642b71735c2cba0d39acdf6650`. The original acceptance evidence is retained in [I1](../../docs/VERSLOMATIKA_LOCAL_PORTFOLIO.md) and [I2](../../docs/VERSLOMATIKA_LOCAL_CHAT.md).

## Required surfaces and acceptance

| Surface or path | Authoritative source / action | Current status | Next evidence |
| --- | --- | --- | --- |
| Public homepage / audit / invitation consultation | Existing reviewed portal release | Existing release preserved | Portal regression; no new inference for unchanged provider paths |
| Owner login/logout | One core password/session registry; Secure hosted cookie | Local verified; signed bridge preparation tested locally | Hosted actual deferred |
| Portfolio / business detail | Existing Business UUID and current organization/grants | Actual portal9source rows, searchable/mobile portfolio and workspace verified | Target PC test after setup |
| Agent catalogue / task launch | Accepted executor registry and existing persisted task admission | Actual generic queued/cancelled path, PostgreSQL and paused-runner UI verified | New AI execution requires target PC worker |
| Task history / events / report | Existing core task/run/event/result rows | Actual saved answer/report/reload/outage/recovery and mobile history/report verified | Target PC test after setup |
| Portable PostgreSQL setup | Existing SQLAlchemy/Alembic/RLS and restricted role; configurable loopback ports | Preparation complete;5helper tests and actual fresh empty PostgreSQL bootstrap/HTTP passed | Actual second PC unverified |
| Another PC API / worker | Fixed server configuration, own authentication and verified CLI | Source/role/RLS/binary preflight and loopback start prepared | Actual second PC own Codex account/model check and worker start |
| Hosted owner deployment | HTTPS BFF bridge to a verified backend | Deferred by latest owner instruction | Actual TLS/login/task/recovery only after target setup |
| Business creation / other executors | Existing builder/planner/audit and future accepted broker | Not implemented by earlier I1/I2 | Keep explicit remaining work; no fictitious ready roles |

No customer signup, owner-authentication pool for customers, cold email, client-system writes, subscriptions or financial actions are enabled. This does not reduce the requested dashboard completion to a screenshot or PR receipt. Complete the executable implementation and preparation work, and identify genuine target-access dependencies separately. Canonical operations/production-envelope checkpoint `a0402e53a48d3503be0c5b36f7ed00c394c60308` is an unmerged branch interface, not adopted main. Shared upgrade journal: `upgrade-fbea2507-21fa-45fd-95c1-ce17c8778a98`; GitHub scope [issue70](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/70).

Core source delivery [PR71](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/71), stacked on69/65, initial CI preflight passed. Paired portal code `ec99bfced5a6e9289a7fa141dd880b556d08a3e6`, final documentation/source-bundle `fa6d6d3a1b5f8f120d1c49f22928314d01f5e5c0`, stay local/source-bundle to avoid automatic Vercel preview while deployment is deferred. Full evidence: [dashboard acceptance](../../docs/VERSLOMATIKA_DASHBOARD_ACCEPTANCE.md). Current test API8854 has executor OFF and no worker; actual UI refuses agent selection/send, while saved reports/history remain visible. New AI execution requires deliberately configured/started target PC worker. Dedicated keyboard-only new-agent journey was not separately claimed; native control focus was reviewed, earlier I1 login keyboard acceptance remains historical.

## Preparation versus deployment

Supabase can supply managed PostgreSQL and optionally Auth. The existing custom core session/grant contract remains authoritative until a separately tested identity adapter is selected. Supabase Edge Functions are a Deno/TypeScript runtime, not a host for the current Python/Codex CLI worker. A compatible starting arrangement is the existing Vercel portal, managed PostgreSQL and the API/worker on the selected PC. Database hosting alone does not make the worker continuous.

The currently running local I1/I2 servers are retained as historical accepted pilots. This continuation uses a separate private dashboard rehearsal DB, copied from our accepted pilot to inspect its saved answer without another provider call. It is development evidence, not production data. No new public tunnel, scheduled service or live Supabase project is created on this computer. Production secrets, authentication files, private task history and database dumps are excluded from Git and transfer packages. [Portable control runbook](../../docs/VERSLOMATIKA_PORTABLE_CONTROL.md) documents a fresh empty target setup, distinct from this private read-only history rehearsal.
