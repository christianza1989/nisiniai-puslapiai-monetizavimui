# Offline scheduling candidate

Repeated unchanged finite offline runs re-read all sealed prepared artifacts
after every child and 20-second sleep. A measured 30.54-second sample recorded
2.58 GB of logical reads by the offline process, alongside Native capture.
Logical I/O can include cache and the whole-drive measurements are not causal
per-process attribution. This establishes extra work, not a quantified overall
Native slowdown.

The candidate keeps the accepted immutable offline-v5 finite worker, verifier,
compiler, preserved-row certificate and existing fingerprints unchanged.
`watch_closed.py` only schedules that worker. It performs a mandatory initial
full audit, polls completed-source/checkpoint/artifact metadata every 20 seconds,
and wakes the full worker on changes, missing artifacts or unresolved rows.
Stable input is fully audited again after 900 seconds. Metadata has no PASS
authority; even metadata-preserving tampering is covered by the periodic audit.
All pins are fully hashed on every poll. Failures propagate without incrementing
the successful-child count; a subprocess exit remains distinct from model PASS.

The pre-child snapshot is retained so changes during the child require a second
confirming invocation. A single lifetime renewal lock protects idle periods.
Stop is cooperative between children, never inferred from an inner queue return.

Validation includes schedule timing, metadata-preserving mutation audit,
artifact changes/deletion, new closed models, ignored unrelated Native queue
updates, path traversal rejection, exact immutable worker/session invocation,
subprocess failure, owner stop and pin-drift fail-closed behavior.

Operational adoption additionally requires a real isolated full AXO
480-state/5280-edge raw/geometry/PBR/runtime proof, complete output hashes and
original-source identity, actual idle polls and no-duplicate lock rejection.
The original raw/source, production prepared rows, published ledger and accepted
Native-v8 must remain unchanged by this proof. Unit tests alone do not authorize
adoption. Before/after total throughput is not yet an established speedup.

Private execution evidence is kept under
`D:/Core/output/ergonomic-chairs-structure-20261017/offline-scheduling-20261019T1925`.
Source delivery, pilot completion and live adoption are separate statuses.
Rollback is the original immutable offline-v5 watcher only after the new outer
and every verifier/compiler child are really absent and all normal gates pass.
