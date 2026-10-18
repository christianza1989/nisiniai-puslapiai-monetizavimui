# Native editorial review and batch approval

The two explicit Session endpoints bridge the existing CONTENT_CORE model. They
record supplied evidence of work already performed and approve a selected native
batch. They do not perform the review, invent PASS, clear factual notes, widen
editorial_preparation authority or create a release/deployment.

| Endpoint | Request |
| --- | --- |
| POST `/customer/v2/creations/{creation_id}/editorial-reviews` | `RecordReview`: exact context, one page pin and six explicit evidence notes |
| POST `/customer/v2/creations/{creation_id}/editorial-approvals` | `ApproveBatch`: exact context and 1–200 unique page pins |

Both use SafeRoute with a 131072-byte body bound and reject query parameters,
unknown fields and supplied actor/reviewer/commands. Context is accepted_revision,
candidate_sha256, canonical_host, operation_id (UUID), expected_site_sha256.
Each page pin is page_id/revision_sha256/planning_sha256. Evidence requires
meaningful 20–4000-character notes for usefulness, facts, sources, media, links and
presentation; there are no default notes or generated review outcomes.

The caller uses a real current authenticated Session in its restricted SQL
transaction. The maintained native_mutation_guard checks current actor/owner,
source, exact accepted candidate/host, explicit S6 after source changes, and no
active Creation/GUIDE before/during/after Node work. Actor and reviewer identities
are derived as `session-user:<actual user UUID>`. They are never accepted from the
request. Original/executing Session identities remain private in operation files;
a new authorized Session for the same user can reconcile the same durable receipt.

## Owner workflow

1. Read current content-completion and the actual current page/media views. Resolve
   real blockers through their existing authorized paths; this bridge cannot
   change facts, source flags, media, links or content.
2. Actually inspect the final text, facts, sources, media, links and presentation.
   Record those specific findings against the exact current page/revision/planning
   and site hashes. Do not substitute boilerplate or a future inspection promise.
3. Refresh content-completion after each review, because the full site hash also
   binds private review state. Select the exact dependency-complete page batch and
   submit fresh pins and site hash to editorial-approvals.
4. Canonical recordEditorialReview/approveReviewedBatch remain the only writers.
   Review binding, factual notes, verified sources, image metadata/files, internal
   link closure and atomic V2 package gates remain unchanged. A refused batch
   writes no partial approval and does not clear its blockers.
5. Use the existing authenticated Foundation candidate/release path separately.
   This bridge always returns release/deployment `not-performed` and full-site/
   launch `UNVERIFIED`. An older published snapshot remains distinct from a newly
   reviewed current draft; its original approval hash is retained.

## Durable operation boundary

The fixed `review-editorial` Node wrapper calls a separate helper. No generic
invoke, reviewer selection, filesystem path, executable or release command enters
the public DTO. Immutable before/dispatch/applied/rejected JSON files are stored
inside the exact native case's editorial-review-operations directory. Each binds
the operation UUID, complete request, stable actual user actor, execution source,
accepted context and full native snapshot. File creation is exclusive and synced;
the case lock is owner-token checked and never stolen automatically.

A complete applied receipt can be replayed only under fresh authority, with the
same operation/request/actor/source and the exact retained current native state.
It returns the existing receipt without invoking the writer again. Later native
edits cause a stale-context refusal; the bridge never rebases an old operation.
A dispatched operation without a provable applied/rejected receipt is uncertain
even if some current fields look plausible. It is refused rather than guessed
from timestamps, retried or overwritten. A known canonical refusal is retained
and replayed as refusal. Source loss, timeout or SQL rollback does not turn a
native write into an unperformed write or grant a second attempt.

The result contains a safe completion view plus bound operation/hash/page receipts,
without raw notes, native documents, local paths or Session credentials. Completion
retains its existing language/SEO/F1/release/launch UNVERIFIED states. An applied
receipt is historical evidence, not renewed execution or deployment authority.

## Validation and delivery boundary

Source tests use isolated synthetic native cases, no customer data or AI provider.
The opt-in `tests/test_editorial_review_bridge_pg.py` prepares actual HTTP/RLS/Node
cases for the integration owner: real owner/replay, foreign owner/forged actor,
stale page/planning hashes, current facts and atomic readiness refusal, lost
response reconciliation, and changed execution source requiring S6. The helper
collects these only; Root supplies a fresh dedicated QA database and owns actual
execution, operational-case acceptance, coordinated serving adoption and portal.

The Foundation preview peer's files and all frozen S42/restore repair journals are
outside this packet. The bridge is based on Root7eb; Root integrates its separate
restored-schema compatibility fix. Private content approval is distinct from a
full-site preview, release readiness, public hosting and launch acceptance.
