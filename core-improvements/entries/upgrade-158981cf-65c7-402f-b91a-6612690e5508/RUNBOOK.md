# Actual consultant PostgreSQL repair

The original ea924493 checkpoint and Root's first57-case9FAIL48PASS941.82s log
remain historical evidence. Root subsequently isolated the first Direct create
503: SQLSTATE42883, helper `(name,jsonb)` not found. PostgreSQL's TG_TABLE_NAME
needs an explicit VARCHAR cast at calls to VARCHAR helpers. Fresh0043 generation
now does that for the direct Team and Task-boundary helpers. This is not an
application readiness or provider failure.

New direct Task triggers also reached old revoked accounting after the old Task
was RLS-hidden at deferred commit. The new owner/environment-scoped SELECT-only
SECURITY DEFINER classifier returns only `legacy`, `direct` or `terminal`; it
returns no private message/result, grant or execution authority. Only real known
non-null legacy/unmapped rows skip this new guard; their original output fences
are unchanged. Direct terminal classification requires failed/cancelled state,
SQL NULL result, exact stored scope and run/event linkage. Direct request/run
immutability is checked before the failure-only return. Every live/success/output
path still requires the current invoker RLS, parent, Session and exact graph.

Immutable DirectChat has SELECT/INSERT only. Admission locks the current parent
and actor; the immutable mapping does not take FOR SHARE or receive UPDATE grants.

The408s membership test used a synchronous admin revoke inside an open admission
transaction. The unchanged pre0043 TaskThread->User FK takes KEY SHARE; unchanged
0042 membership revocation takes User FOR UPDATE. That test ordering cannot
complete. The bounded replacement observes pg_blocking_pids, commits admission,
then commits revocation and verifies queued release with zero provider calls.
This is an inherited S37 test-order applicability correction, not a weakened lock
or a claim that the old rollback test passed. Root must confirm actual ordering.

Helper validation:86 focused PASS0.81s, affected Ruff clean,24 native Direct/team
tests collected only. No helper PostgreSQL, provider, customer-case or serving
operation. Root runs fresh dedicated QA0043 and the legacy native/Episode cohort
before any serving adoption. Stage2 preview WIP stays paused in its separate
worktree. Source repair is not actual DB/adoption/main acceptance.

Full offline follow-up at functional eff5b585:1876PASS8SKIP67subtests84.87s; two inherited Pydantic deprecation warnings. Actual Python-to-Node isolated fixtures included through ignored installed-dependency junction. No database/provider/serving adoption proof.

Second actual Root fresh915 cohort:1PASS1FAIL20.43s; create passes, live TaskRun INSERT reaches missing NEW.sequence (and would also miss failure_code). A procedural Event-only outer IF now guards both fields, retaining exact comparisons. Every other distinct NEW field audited for procedural row-type dispatch. Focused87PASS0.91s; nativecollect25 only. New real claim/no-op Run UPDATE/cancel/finish-run case exercises all four Task row types, pending Root actual QA. Root independently confirmed pre0043/3b7 nested membership baseline2s LockNotAvailable; that failure remains preserved.

Root integration retains its separately committed actual fixing event at sequence4. The helper's independently appended sequence4 event remains preserved on metadata-only commit16027ee, which is not cherry-picked here; the full offline result above still refers to that exact functional source and evidence. Subsequent helper events5/6 follow the Root event without renumbering or rewriting either original history.
