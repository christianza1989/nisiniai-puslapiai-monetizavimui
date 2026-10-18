# Fresh approved-plan reads in the preview graph

The retained Serving182 failure includes a9.41167s/170taskSQL authority check
and9.44984s pulse gap against the unchanged3s heartbeat. An isolated read of the
same source performed172SQL in1.63955s. The graph is sensitive to load; a warm
timing or reduced query count alone does not accept the actual preview lifecycle.

`business_discovery.service.approved_build_context` previously performed one
schema probe followed by four separate PK-linked approval/report/discovery/job
reads, twice per complete two-phase authority verification. It now keeps the
fresh schema probe and reads those four entities in one current RLS snapshot.

All joins must remain LEFT joins on the original stored PKs. An absent approval
returns None. A visible approval with a hidden/missing report or discovery must
still reach `invalid_approved_plan`; a missing or unusable exact report Job must
still reach the unchanged `source_context.build` validation. Do not substitute a
latest/sibling Job, cache permission, omit populate_existing or bypass fingerprints,
bindings, report reviews, source-context checks or either final graph.

Do not move a historical anchor read into an earlier parent read across the
`native_sources` await. Optional discovery/archive schema also prevents blindly
joining the Archive table: SQL CASE does not protect an absent relation at parse
time. This repair does not change those checkpoints, TTL, cadence or deadlines.

The first restricted-PG regression failed with5SQL instead of2 in17.03s;
SHA2562ea743ab86fde2a873bf3d4c8acfd74fb998cdee7b44144a2396f01c0489cd5f.
Five new PG cases pass31.74s, SHA256
82bd9621f18efa59649de3a8e264c401ecac96dfef6beb3acbddb6e8f0325bfe:
three repeated current reads/actual foreign-RLS absence, explicitly labelled
nullable-child ORM visibility seams and committed parent/Job drift with a populated
identity map. The visibility seam leaves real RLS enabled and does not pretend to
corrupt the immutable composite foreign keys.

Four existing source-context/real-Node cases pass52.06s, SHA256
e19a0008a195bb07cda6be783f3887ecbd375991b221d7038030d4550b961dae,
including source marker removal before/after native output. The first offline
run retained101PASS/84fixture setup errors because its fake SQL leaf did not
implement the joined result. Only that leaf was adapted; all existing mutation,
actor/source/refusal assertions remain. The same185 cases then pass13.52s.
Scoped Ruff passes. Upgrade8822f0d8 owns this repair; runtime adoption and actual
lifecycle acceptance remain separate, with all original failures retained.
