# Explicit agent preparation and one native scenario

Protocol checkpoint only; implementation, PostgreSQL migration and serving
adoption remain separate. Source base e4794c59e19d533b1673e408e38fbe104157d6f6,
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
