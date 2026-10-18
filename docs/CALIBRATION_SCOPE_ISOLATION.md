# Synthetic calibration scope isolation

A completed trial can leave a canonical contact hold, refusal and conversation.
Reusing its original synthetic campaign/recipient in a later source trial must
not clear those records. The actual 39dd0a7f correction was correctly refused as
`recipient_marketing_contained` before any Task or provider call. The ten prior
charged model calls and that zero-call failure remain retained.

`RoleCalibration.recipient_namespace` is an optional UUID fixed for one admitted
saved-agent grant team. For that sealed calibration only, `manifest()` first
validates the original source hash, original campaign/cases, grading hash and
bindings. It then derives an effective synthetic campaign ID and `.test`
recipient from the original identities plus the namespace. Facts, questions,
personas, labels, corpus bytes and evaluator remain unchanged. Normal work with
no calibration namespace retains its original identities and serialization.

Both technical identities need isolation: recipient policy is shared across
campaigns, while correspondence also uniquely binds campaign/prospect. Changing
only one would still collide with a prior retained trial. These derived transport
identities are not model-facing business context or real lead identities.

The existing complete-reference retention check in Python and SQL pins the
namespace along with manifest path/hash across all consumed authorizations.
Only `case_id` varies for different sealed cases. A caller cannot change namespace
on already consumed grants; a new bounded trial requires fresh admitted authority.
Parent equality still forbids crossing trial lineage. No SQL/table migration,
suppression reset, arbitrary real address or live sending path is introduced.

This is not permission to change identities for actual marketing or bypass an
opt-out. Source/Config approvals, per-role/aggregate budgets, current ownership,
source expiry, capture-only transport and retained failed-stage accounting remain.
Future source rounds seal earlier ledgers and retain cumulative charges separately.

Acceptance covers legacy exact serialization, deterministic isolated identities,
unchanged original corpus/need, existing legacy eight-task execution, and a new
sealed trial coexisting with a retained old contact hold and conversation. It
also rejects namespace changes and renamed manifests on consumed grants. All
fixture transport/models are inert; actual calibration acceptance is separate.
