# Verslomatika dashboard and portable backend

## Current owner instruction — 2026-10-10

**Mode: DEVELOPMENT/TESTING, complete dashboard implementation and prepare for another PC; no public deployment.** The owner first requested a fully updated site, complete dashboard and public login. They subsequently said “pala”, asked whether Supabase can be used, instructed “jei ne tai as tada kitam pc padarysiu, ne sitam tu tik paruosk viska”, then clarified “mes vistiek dar tik kuriam ir testuojam”. We continue with current PostgreSQL without adding Supabase now. This later instruction replaces the proposed current-PC public tunnel/service rollout. The existing live site is preserved. The local assignment is still in progress; a contract checkpoint alone does not complete it.

Core owner: chat01a122ec-9cfa-79b3-966b-43aa3f39ab58, branch `codex/verslomatika-owner-release-20261010`. Portal owner: “Kordinatorius A”, chat01a0dcf8-8ade-7883-877b-8d5dba4e8c79. Portal code remains in its own repository/worktree. Neither this status nor another agent's message creates owner authorization.

Baseline: private main `d4ea8bf7384b70c4ea62a344001e3f8158812c56`, public main `d0fd6b7d296303bfcaafadc4071945e675a72b96`; accepted local I1/I2 source `120a84ac6afc5b642b71735c2cba0d39acdf6650`. The original acceptance evidence is retained in [I1](../../docs/VERSLOMATIKA_LOCAL_PORTFOLIO.md) and [I2](../../docs/VERSLOMATIKA_LOCAL_CHAT.md).

## Required surfaces and acceptance

| Surface or path | Authoritative source / action | Current status | Next evidence |
| --- | --- | --- | --- |
| Public homepage / audit / invitation consultation | Existing reviewed portal release | Existing release preserved | Portal regression; no new inference for unchanged provider paths |
| Owner login/logout | One core password/session registry; Secure hosted cookie | Local I1 verified; signed bridge preparation tested locally | Portal plus current continuation integration |
| Portfolio / business detail | Existing Business UUID and current organization/grants | Local I1 verified; responsive completion underway | Actual desktop/mobile/search/navigation and unknown/error states |
| Agent catalogue / task launch | Accepted executor registry and existing persisted task admission | Core implemented and PostgreSQL tested | Portal actual normal/disabled/launch state |
| Task history / events / report | Existing core task/run/event/result rows | Core implemented and PostgreSQL tested | Portal page/reload/saved report, actual usage/null costs |
| Portable PostgreSQL setup | Existing SQLAlchemy/Alembic/RLS and restricted role; configurable loopback ports | Helper and target runbook prepared | New helper regression and local preflight; actual second PC unverified |
| Another PC API / worker | Fixed server configuration, own authentication and verified CLI | Preparation in progress | Transfer/start instructions and source integrity; actual second PC unverified |
| Hosted owner deployment | HTTPS BFF bridge to a verified backend | Deferred by latest owner instruction | Actual TLS/login/task/recovery only after target setup |
| Business creation / other executors | Existing builder/planner/audit and future accepted broker | Not implemented by earlier I1/I2 | Keep explicit remaining work; no fictitious ready roles |

No customer signup, owner-authentication pool for customers, cold email, client-system writes, subscriptions or financial actions are enabled. This does not reduce the requested dashboard completion to a screenshot or PR receipt. Complete the executable implementation and preparation work, and identify genuine target-access dependencies separately. Canonical operations/production-envelope checkpoint `a0402e53a48d3503be0c5b36f7ed00c394c60308` is an unmerged branch interface, not adopted main. Shared upgrade journal: `upgrade-fbea2507-21fa-45fd-95c1-ce17c8778a98`; GitHub scope [issue70](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/70).

## Preparation versus deployment

Supabase can supply managed PostgreSQL and optionally Auth. The existing custom core session/grant contract remains authoritative until a separately tested identity adapter is selected. Supabase Edge Functions are a Deno/TypeScript runtime, not a host for the current Python/Codex CLI worker. A compatible starting arrangement is the existing Vercel portal, managed PostgreSQL and the API/worker on the selected PC. Database hosting alone does not make the worker continuous.

The currently running local I1/I2 servers are retained as historical accepted pilots. This continuation uses a separate private dashboard rehearsal DB, copied from our accepted pilot to inspect its saved answer without another provider call. It is development evidence, not production data. No new public tunnel, scheduled service or live Supabase project is created on this computer. Production secrets, authentication files, private task history and database dumps are excluded from Git and transfer packages. [Portable control runbook](../../docs/VERSLOMATIKA_PORTABLE_CONTROL.md) documents a fresh empty target setup, distinct from this private read-only history rehearsal.
