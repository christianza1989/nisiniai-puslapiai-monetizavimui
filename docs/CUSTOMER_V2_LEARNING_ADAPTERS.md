# Pure V2 learning metadata adapters

This first increment adds two unused, data-only modules on source
`30071c65de2d5cf786a2a29c9c0ebb8f006ff351`. It does not execute calibration,
change V2 readiness or admission, select a behavior release, or activate learning.
Root owns later integration. Coordination: issue66/comment6241343169.

## Target contract

`customer_agents.learning_target.capture_target(scope, binding, evaluator_sha256)`
revalidates supplied native `ProvisioningScope`, `quality.Binding`, a saved-Config
`lab.Episode`, and its retained High execution pin. The scope, profile, admission,
registration, original Session and execution-source metadata must agree. Missing
pins, Preview instead of Episode, revoked profile metadata and inconsistent
Config/Profile fields are rejected. This validates data consistency; it does not
query current permissions, leases, expiry, release state or native receipts.

The frozen target stores detached JSON. Accessors revalidate it and return fresh
data. `parent_hash` calls the existing `quality.parent_binding`; no parallel
parent algorithm is introduced. `target_key` includes the complete native owner
scope, source, canonical Config/Profile parent and evaluator. It excludes login
Session and per-trial script/episode identities. `operation_key` additionally
pins the original Session. `require_same_parent` requires both identities, so
a renewed login cannot continue an existing comparison. `native_snapshot`
projects the existing Snapshot shape without claiming it is current authority.

## Diagnostic report contract

| Function | Supplied inputs and checks |
| --- | --- |
| `report_plan` | Target; unique case IDs and script hashes; immutable train/holdout split; corpus, manifest, expectations, origin and existing typed-plan fingerprints. No split rewriting. |
| `case_report` | Same target and original Session; native protected Proof; exact current diagnostic typed report; explicit replica, instruction label, conversation and Quality job UUIDs; usage and execution observations. |
| `replica_report` | One declared replica in the maintained fixed count; same plan and instruction label; unique case, conversation, Quality job and Episode references. |
| `merge_reports` | Exactly the existing `learning_controller.REPLICATES` slots, currently two. Calls maintained `merge_replicates`; refuses reused observations across replicas. |
| `report_data` | Fresh conventional report containing supplied checks, references, hashes, usage and flags. Raw scripts, expectations, need state and transcript text are omitted. |
| `compare_reports` | Same plan/target/Session; incumbent label equals canonical parent; no conversation, Quality job or Episode reused across arms. Calls maintained `protected_compare`. |

Case reports accept the ten existing boolean checks without recomputing Quality
or competence scores. The existing typed evaluator must already have produced
them. Numeric/string booleans, invented PASS summaries, incomplete checkpoints,
duplicate checkpoint references and changed protected/typed pins are rejected.
All failures remain in both replica observations; they are never averaged away.
Incomplete declared cases or usage cannot become a complete passing report.

Usage is required explicitly in the existing evidence shape. Unknown token
totals stay `None`; supplied attempt/settlement counters remain distinct;
`cost_status` remains `UNVERIFIED`. External-action and test-visibility flags
are required explicitly and may be unknown. Unknown never becomes a claim that
an external action happened or did not happen. These inputs are caller-supplied
metadata, without DB/signature verification. Even apparently consistent UUIDs
and hashes are not evidence that native execution occurred.

The maintained comparator retains its minimum six cases, three unique holdouts,
fixed repeats, unchanged judge, strict improvement, all-case success, external
action and instruction-safety requirements. No thresholds are relaxed or copied
into a new acceptance algorithm. Existing typed reports have purpose
`diagnostic_seen_regression`; a train/holdout label does not make them unseen.
The returned comparison therefore **always** has `state: rejected`,
`calibration_status: UNVERIFIED`, `module_admission: not_admitted`,
`activation: not_performed`, `activated: false`, and `production_eligible: false`.
It adds explicit diagnostic/native-receipt/unbound-trial reasons while preserving
the maintained comparator's metrics and rejection reasons. Instruction hashes
are declared labels here; they do not establish an executed behavior version.

## Verification and remaining work

Dedicated synthetic offline tests cover target/Session isolation, detached
metadata, native pin/proof conflicts, preserved failures and unknown usage,
replica and cross-arm replay, unchanged comparator gates and unconditional
non-adoption. Related pure protection, typed checks, competence, Quality,
workspace episode/planning and legacy learning tests are run separately from
actual DB/provider acceptance. Private local logs and SHA-256 evidence are
recorded in the unique core-upgrade verification event. Initial missing-module,
cross-arm replay and test-authoring failures are retained, not rewritten.

No existing runtime file imports these adapters. The legacy static-site learning
controller and adaptive instructions are unchanged. SQL, DTOs, worker budgets,
native authority/lock order, customer prompt assembly, workspace workflow and
readiness/admission remain unchanged. Existing evaluator fingerprint discovery
includes new `customer_agents/*.py`, so future private manifests must capture the
new fingerprint; historical manifests, approvals and receipts are not changed.

Later authorized increments still need native private-case execution and
accounting, a protected trial instruction/behavior binding, an evaluator contract
that distinguishes diagnostic regression from unseen evaluation, dynamic-target
controller/adaptive integration, durable execution grouping within actual native
budgets, and independently verified new-session adoption and rollback. They must
recheck current native authority for every operation. None is implied by this
pure adapter's test results. Reverting the two unused modules and their dedicated
tests/docs removes this increment without changing a runtime schema or pointer.
