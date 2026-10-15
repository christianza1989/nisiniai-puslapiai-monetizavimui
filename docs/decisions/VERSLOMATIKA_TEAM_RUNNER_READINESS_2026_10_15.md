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
- Added three native PostgreSQL cases: roster and new-send reject blank workspace/bad checksum without Task/Turn/Thread/Event/Attempt; queued exact replay survives config loss while the worker fails with zero Attempt/provider calls.
- Broader workspace offline files plus readiness and team boundary tests: **125 PASS in 6.09s**, actual exit0 (the 18-case subset is not additive). AST comparison preserves **41 existing qualified signatures**. Wire/contract/policy/quota/episode source have no diff.
- First frozen `d2338796063dd3e45a673f305e4dd67026138546` native run: **21 PASS + 3 setup errors in 256.25s**. All three new readiness and 18 team cases passed. The two preparation cases and one native caller failed earlier at Creation private draft intake, before the team readiness boundary; Root's safe `team-runner-readiness-native.log` terminal summary was inspected. Root diagnosed missing explicit companion `PINET_PUBLIC_CORE_PATH` / `STUDIO_NETWORK_SETTINGS` in the new frozen parent, which has no sibling checkout. No assertion or core source was relaxed.
- Rerunning only those three with the explicit companion configuration: Root reported **1 native caller PASS + 2 preparation FAIL in 35.18s**. The preparation fixture uses `text_customer`, not the updated `team` fixture, and had no valid team executable/workspace configuration. The readiness refusal is the intended new precondition. Root explicitly requested the same checksum-pinned Python/absolute temporary workspace in `prepare_customer`; only this fixture is corrected, with no bypass or functional source change. First outcomes above remain preserved.
- Final frozen `7c4a5be1ba9ca94cdac1f16d3a8be5f329d41b82`: **5 PASS in 41.06s**, actual exit0, comprising the three new readiness cases and two corrected preparation cases. Root's safe `team-runner-readiness-final.log` summary was independently read; frozen checkout HEAD and cleanliness were checked. The three core source files are byte-identical between d233 and 7c. The independent native caller passed on the same functional bytes in the preceding rerun. Thus **24 distinct native cases are accepted across these exact cohorts**: 3 readiness +18 team +2 preparation +1 native caller. There is no claim of a single final 24-case run; the repeated three boundary cases are not counted twice.
- Final Ruff for all three source and four affected test files: PASS. Source signatures and contract/policy/quota checks remain as above; the last change was test fixture configuration only.

Current state: locally verified final candidate `7c4a5be1ba9ca94cdac1f16d3a8be5f329d41b82`. Preserve existing actual failures and receipts. Root will integrate source after its separately owned read-only workflow-context work and perform integration QA. Shared source delivery, integration QA and actual wrapper/service adoption are separate receipts. This helper changed no provider/configuration/local service and claims no main merge or full platform acceptance.

Acceptance metadata only: `f9268fb95030ea684edc80f82ac462ae30dc1d2c`, immutable event `b88d3c89-e0bc-4f6e-b552-a72a4985af64`. Exact owned `27fe2924..f9268fb` coverage PASS: 3 shared paths, zero uncovered/errors. Paired handoff at 2026-10-15T06:13Z PASS against main808/publicec8; own checkout clean.

Created/attached [draft PR 157](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/157). Root has the functional candidate and should take acceptance metadata separately after source integration. This later PR receipt is optional. GitHub creation reported remote base6463878d and mergeable=false; exact conflict blocks were not inspected. Owned scoped coverage is distinct from the broader remote PR history and whole-branch merge readiness.
