# Team runner readiness before admission — 2026-10-15

Upgrade `upgrade-503ad500-e596-44a3-9f09-ad84163724eb`; issue [66](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66), reservation comment6185517519. Own branch `codex/verslomatika-team-runner-readiness-20261015`, exact base Root `27fe292424598eb92e3a3a90f71c28c50be2865b`. Paired fresh start 2026-10-15T05:55Z PASS: core main808581d9, companion1a26f289/public mainec8a9c03. Root explicitly owns private launch configuration and local service restart; this packet does not change either.

## First failure and shared cause

Root reported a real ordinary Chrome/UI team turn `c0da1137` failing `runner_unavailable` in four seconds with one reserved/settled Attempt and UNKNOWN usage. Its private adoption wrapper omitted the absolute `PINET_CHAT_WORKSPACE`. Root corrects that local configuration; the original Attempt/UNKNOWN receipt is retained.

The shared defect is independently reproduced: the team roster/new-send `blockers` checks team flag, actor, daily bound and canonical current source, but not the fixed executable/workspace/hash configuration. `handler.reserve` writes a native Attempt before `adapter.run` performs its inline configuration check. Original offline baseline: **2 FAIL in 3.87s**. The incapable runner was advertised with no blockers, and reservation reached a deliberately forbidden native scope.

The customer text `runner_ready` cannot be used directly: it requires the customer-text runner flag and Luna `chat_model`; ordinary team execution has its own existing fixed Sol High policy and is independent of that module. No new registry, executor or model selection is needed.

## Canonical rule and repair

Factor the existing team adapter's executable/workspace/seconds/hash predicate into `workspace_team.adapter.runner_ready`. Use the same predicate for roster/new-send admission, before a genuine provider reservation, and again at actual adapter execution. Failed filesystem observation returns False. The existing canonical `source_current` helper and checks remain in place.

Known-incapable configuration means `team_execution_disabled` in the existing roster/blocker contract and no new Task/Turn/Thread/Event from a new send. If configuration becomes incapable after earlier valid admission, exact owner replay stays readable; the worker refuses before native Attempt reservation or provider work. This is a configuration preflight, not a provider-health guarantee: configuration or remote availability can change after the check, and actual execution still checks it again.

Contracts, model/effort/argv, actor and Task fences, queue/lease logic, quota arithmetic, retained history/replay and frozen usage settlement remain unchanged. New native acceptance tests use the existing restricted PG/customer fixtures; the shared inert team fixture now supplies a checksum-pinned Python executable and absolute temporary workspace because it previously omitted all runner configuration while injecting providers. Python is not executed by these tests.

## Verification and delivery

- Baseline **2 FAIL in 3.87s**, retained above.
- New readiness offline cases plus existing team boundary tests: **18 PASS in 0.26s**. Invalid empty/relative workspace/executable, checksum, time bounds, disabled flag and unreadable binary are denied; actual adapter and reservation stop before transport/native scope. Capable ordinary team configuration does not require the customer-text module.
- Ruff for three source files and three test files: PASS (two unused test imports removed). `git diff --check`: PASS.
- Added three native PostgreSQL cases: roster and new-send reject blank workspace/bad checksum without Task/Turn/Thread/Event/Attempt; queued exact replay survives config loss while the worker fails with zero Attempt/provider calls. Native results are pending Root's separate clean frozen QA.

Current state: fixing; no local-verified, PR or operational adoption claim yet. Preserve existing actual failures and receipts. Root will receive an exact frozen candidate for native verification; shared source delivery and actual wrapper/service adoption are separate receipts.
