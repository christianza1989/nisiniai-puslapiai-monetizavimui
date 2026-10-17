# Live-preview authorization cadence

The monitor used to wait another second after completing each authorization
callback. Actual d904 verification took 1.3912–1.5267 seconds, leaving less than
0.61 seconds for scheduling within the existing three-second heartbeat. Retained
native first-refusal receipts show expiry margins of −62 ms before ready and
−124 ms after ready. Reaching ready alone did not establish stable preview use.

The maintained studio transport now accepts an internal `authorization_interval`
with its original default of one second. Only the fixed live-preview `serve`
caller selects 0.2 seconds. Inspection, generation and unrelated callers keep
their original default. The keyword is server-owned and absent from customer
wire schemas. Before authorization or process creation, the transport rejects
booleans, non-numeric or non-finite values, and intervals outside 0.05–1 seconds.

Each callback is still awaited serially. There is no separate pulse timer or
completed permission cache. EOF still drains the active monitor callback, then
runs the shielded final authorization. Failure, timeout and repeated cancellation
still join callback cleanup and the owned child before returning. The three-second
heartbeat and existing preparation, inspection and producer deadlines are unchanged.

The original caller/monitor baseline was one failure and one pass: the actual
serve caller selected one second, while the unrelated caller correctly retained
one second. After repair, 61 focused tests pass, including invalid-value rejection
before side effects, fixed serve/default caller selection, and a gated EOF test
that requires callback completion → interval wait → fresh final refusal with no
overlapping callback. Two old transport wrappers now forward keyword arguments
so their synthetic cleanup failures still exercise the intended production path.
The intermediate one-failure/60-pass run is retained separately from the final
61-pass run; its fake wrapper rejected the new keyword before entering the child.

This source repair complements the separately versioned authority observation
optimization. Higher check frequency increases database work; it cannot guarantee
stability under an unbounded event-loop or database stall. Actual PostgreSQL,
ready/hold/close, expiry, revocation, application-lifespan and browser checks remain
required before runtime acceptance. Original failures, site bytes, databases and
lease tombstones must be preserved. Source verification, serving adoption, reviewed
main delivery and platform acceptance remain distinct.

The final combined cadence/lease/inert-child run passed 70 tests in 20.04 seconds,
with the one actual SQL cleanup test explicitly deselected. This includes rejection
of arbitrarily large integer intervals without numeric conversion exceptions.
Log SHA256: `234912fcd6493da89be3fcfd95773bae94a3b3410ea66fc871409e6fcce0d6b5`.
