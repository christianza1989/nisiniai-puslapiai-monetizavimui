# Explicit agent preparation and one native scenario

Source implementation and offline verification; PostgreSQL execution and
serving adoption remain separate. Source base e4794c59e19d533b1673e408e38fbe104157d6f6,
main533/publicec8. Upgrade-a3f791c5-1fce-46ec-943b-5e2917b7a6c0.

The independent contract is `workspace-agent-workflow.v1`. POST
`.../team/agent-workflows` accepts one `PrepareAndTest` with purpose
`site_chat`; GET `.../agent-workflows/{workflow_id}` observes; POST its
`/cancel` cancels. Existing preparations remain draft-only. GET and historical
notes never dispatch. Unknown fields and unsupported purposes are refused.

One original human event authorizes a durable intent bound to owner, topic,
Creation, original Session, source and deadline. Canonical S4 completion saves
the exact Agent/Config receipt in its existing effect savepoint. Only after
commit may the maintained Tasks worker admit one deterministic native S5 child,
with the existing call allowance, lab and independent Quality review. A server
coordinator assignment records this continuation; it never forges a human
message or rewrites the terminal parent Task result.

The public view includes the original `owner_event`, `preparation` Turn,
`test` Turn or null, exact `agent` receipt or null, stage, failure,
cancellation and original deadline. One saved-example scenario always retains
`calibration_status=UNVERIFIED`, `module_admission=not_admitted` and
`channel_activation=not_performed`. Protected calibration and real channels
are outside this source packet.

Protocol verification: original missing workflow provenance produced 1 FAIL,
10 PASS, 2 deselected, log SHA256
`010f7aaccb61151279ecea8376ac08bc1875f9596b9862239a433d3d13fd2b90`.
The new wire then passed13 cases, including fake-human/Attempt/native-answer
refusals, unsupported purposes, exact routes and generated-document equality.
No DB, provider or operating process was used. The initial log redirect targeted
a nonexistent parent folder and did not execute tests; the corrected run above
is the preserved actual baseline.

Text review: the bounded coordinator assignment describes an automatic saved
example test without claiming calibration or activation. Portal typography,
desktop/mobile rendering and actual adoption remain Root's separate checks;
this packet changes no frontend style or layout.

## Durable state and lock order

Migration0045 follows0044 and adds one forced-RLS table,
`control_workspace_agent_workflows`, plus one optional scoped provenance FK
on team events. An88-table predecessor is expected to become89; that count has
not been observed against a database here. The migration validates exact0044
author/native anchors before any DDL, preserving ordinary, native and direct
branches byte-for-byte. A retained intent prevents destructive downgrade.

The owner request gets a separate fingerprint marker, so a previously accepted
ordinary preparation UUID cannot acquire automatic-test meaning. Immutable
intent identity includes owner/organization/portfolio/business/grant/topic,
Creation, original Session/source, deterministic child Task/request/origin IDs
and the original queued parent deadline bounded by Session expiry. Claiming the
S4 parent can shorten its own execution deadline without renewing this overall
deadline.

S4's existing native completion savepoint atomically saves Config, coordinator
receipt and pending→prepared outbox transition; SQL checks the exact native
Config revision/hash/session/request and settled current plan Attempt. Worker
failure rolls those effects back together and preserves actual call usage.
Clarification creates no receipt or continuation.

The fixed TeamHandler reconciliation runs before actor/Task claim locks. It
reads only prepared explicit intents, finishes metadata-only native preflight
and its read transaction, then obtains the maintained admission lock followed
by the intent row. The canonical admission path creates the deterministic
child, existing native allowance and trusted coordinator assignment; the
intent's prepared→dispatched transition validates them together. Queued event
constraints are checked before commit, while the child is queued. A repeated
reconciler observes the bound child and creates nothing. No provider runs in
these transactions.

Native S5 executes through the existing lab/Quality adapters and accounting.
Every child authority use checks its original intent, cancellation, deadline,
Session/source and exact native plan. Terminal children are never retried
automatically. Admission/preflight refusal is recorded once on the intent;
unused child records and allowance roll back. Parent Task results stay immutable.
GET reads state only and cannot repair or schedule anything.

Cancellation locks parent Task→intent→child Task before marking cancellation.
It rereads child completion under that lock; a result that already committed
stays completed. Existing Task cancellation/lease/usage settlement remains the
only execution cancellation path. Repeated cancellation and completed-history
reads do not renew authority.

## Verification and handoff limits

Protocol checkpoint `0b182dc23a0f7e72689f2200f62672bf58108bf9` freezes the
wire/generator and Git-byte workflow JSON SHA256
`deb7e9643fb2277729c435452a556d1cf552135f653bbc056e05729229fae717`.
The runtime increment does not change those wire bytes.

Final pure offline regression:295 PASS/2.66s, including92 workflow cases plus
ordinary/native episode, preparation, team, website-context and direct-chat
regression. Log SHA256
`a5ebaaf91d79b378604dab304eae4a62ed03736aa8555317ec71155a809b8794`.
The scalar state CHECK is also executed with SQL NULL semantics in SQLite
(only the regex operator is adapted); this is not PostgreSQL/RLS execution.
Original missing-provenance failure, initial redirect error, mistaken nonexistent
test path (no tests ran), earlier13/33/130/92-case passes and earlier295-case
run remain separate local logs; no original failure was overwritten.

`tests/test_workspace_agent_workflow_pg.py` contains12 ROOT-ONLY isolated
integration cases. They were collected, not executed:1.80s, log SHA256
`6370e50be2a9acf870cdc58de7532441b17d284c92d34fa9575c03f866bd0422`.
Cases cover actual route→S4→S5/native receipts, immutable parent result, read-only
polling, restart-style reconciliation, concurrent reconcilers, cancellation
before/after child admission, clarification, effect rollback/usage, source,
quota, original Session and Config revision refusal, old-key reinterpretation
and forged database transitions.

Root must apply0045 and execute those tests with the maintained inert native
transports in its isolated QA database before serving adoption, then run the
authorized actual UI/provider acceptance separately. No helper DB connection,
migration, provider, model CLI or operating service change occurred.

Known unexecuted races: forced OS/process death at each commit boundary,
database restart, running-provider drain through the new workflow-cancel route,
and an interleaved actual PG completion/cancel lock race. The deterministic
outbox design and offline guards do not claim those actual observations.
Running native cancellation/usage regressions remain in the maintained S5
suite and should accompany Root's workflow gate.
