# Atomic native Turn context freeze

Root reported that repaired 0044 migration/bootstrap passed, but the first native
lifecycle case failed after 20.11s with a query-invoked autoflush violation of
`control_workspace_team_turns_check1`. Remaining cases did not run. The previous
QA database and raw failure stay retained by Root; no raw/customer artifact was
read by the helper for this repair.

The existing CHECK requires context, context_sha256 and context_cutoff to be all
NULL or all populated, with a valid hash and positive cutoff. It does not inspect
the context's JSON protocol. Native context_for assigned context and hash before
awaiting the owner-event lookup. That lookup could autoflush the invalid partial
bundle. The consultant path already observes its rows before assigning all three.

The repair reads and validates the exact owner event first, including task/chat,
owner binding, author, input, source and positive sequence. It then computes the
bounded deadline and sets context/hash/cutoff/deadline together, with no await
before the explicit flush. Missing or mismatched owner history fails before any
context mutation. The existing one-time context and Task/allocation fences remain.

The six-case initial no-DB regression failed at its autoflush-aware read boundary
(6 FAIL, 10 deselected, 3.30s); baseline log SHA-256 is
`1737f6aff21d81ce51b83fb32b9e3d444dee1183ac5c75313e284b2ff05b92ad`.
The final regression uses the actual mapped TeamTurn, enforces the unchanged
all-or-none bundle on query/flush boundaries, validates malformed owner history
and refuses a second context freeze. Final focused cohort: 147 PASS in 4.05s.
Ruff and diff checks pass. This is source/ordering evidence, not actual DB proof.

No schema, migration, CHECK, mutation trigger, JSON admission, Task fence, ledger,
model or provider setting changed. Both Stage2 journals, the consultant journal
and CASE repair journal are unchanged. This separate unique journal records only
the atomic-freeze repair. Root owns actual failure/result event additions and a
new empty QA database run; helper DB/provider/current-case/serving operations are0.
