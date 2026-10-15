# Scoped native episode schema handoff

Base519df2565036ef9bde1508cf80b584e12f59ce92; own branch
`codex/verslomatika-native-episode-proof-20261015` in `work/episode-proof`.
Ownership and rationale: [decision](../decisions/VERSLOMATIKA_NATIVE_EPISODE_PROVENANCE_2026_10_15.md).

New migration `0041_workspace_agent_episode` follows `0040_calibration_task_budget`.
It adds `control_workspace_team_events.native_episode_task_id VARCHAR NULL`, FK
to `control_tasks.id`, exact author CHECK alternative and a narrow current-fence
patch. `workspace_team_native_episode(tid VARCHAR, src VARCHAR) RETURNS BOOLEAN`
is SECURITY INVOKER, PUBLIC execute revoked, runtime execute allowed. Set the
existing business GUC before native proof reads; hold native parents before Task.

Root must add the nullable mapped column and omitted-for-legacy wire field in its
owned code. It must supply this event's own Task ID only for coordinator/answer,
no Attempt, and retain a real coordinator participant. Flush and `SET CONSTRAINTS
workspace_team_fence IMMEDIATE` before marking Task terminal, then restore the
normal deferred mode as current preparation completion does. Exact native
receipts and typed output must be reconciled by that handler before summary.

Planned restricted PostgreSQL command from runtime in a NEW disposable 0041 DB:

```text
python -m pytest -q tests/test_workspace_episode_provenance_pg.py
```

The 16 collected selectors include an injected-provider-zero ordinary role
regression and synthetic native metadata under the maintained customer fixture.
No operational DB, credentials, paid provider, model setting or serving flag is
part of this window. Root can launch private QA from the frozen source and send
sanitized diagnostics. Offline anchor checks: 10 PASS; scoped Ruff PASS; actual
PG execution is pending. The subsequent anchor hardening has 13 offline PASS;
it preserves literals and semantic boolean grouping, with no proof SQL change.
Do not describe collected tests as executed acceptance.

Downgrade refuses any retained native answer; otherwise it reverse-patches the
exact branch and CHECK, then removes only the new helper/FK/column. Historical
old rows and old role provenance remain unchanged.
