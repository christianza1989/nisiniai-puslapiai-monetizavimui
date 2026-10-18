# Explicit acquisition model preparation schema

`0046_acquisition_model_prepare` adds the database contract for the one-shot
`acquisition.model_prepare` kind on the existing Task/Run/Event queue. It does
not approve a model call, enable a worker, configure an actor, invoke a provider,
or grant capture/work permissions model authority. The approval, current-source
and private-file checks, handler, adapter and worker integration belong to the
integrating caller. Existing `acquisition.reviewed_capture` and workspace kinds
retain their predecessor checks and direct-context classification.

The fixed execution identity is `gpt-6.1-sol`, effort `high`, adapter revision
`acquisition-model-prepare.v1`. A model Task requires both a Business and an owned
authorizing Session. The existing exception permitting a null Business only for
an exact `workspace.direct_turn` remains unchanged.

## Retained records

* `ModelAuthorization` / `acquisition_model_authorizations`: an explicit caller
  UUID and exact native Registration, Creation, owner/portfolio/Business,
  SavedConfig, Session, source, module snapshot and work-registration digest.
  Maximum attempts is 1–30 across all Tasks using this authorization; the lease
  is at most 3,600 seconds. All metadata is immutable. A privileged containment
  operation can change enabled from true to false; it cannot re-enable it.
  The authorization fingerprint excludes enabled.
* `ModelTaskBinding` / `acquisition_model_task_bindings`: immutable input and
  digest, with composite foreign keys to the exact common Task kind/tenant and
  authorization. Insertion requires the new queued Task and current authority.
* `ModelAttempt` / `acquisition_model_attempts`: a committed pre-IO reservation
  for the exact common Run, immutable packet/instruction digests, ordinal and
  role. A reserved slot is charged even when interrupted, failed or still
  unsettled. There is no delete, reset, automatic retry or refund operation.

The three tables use forced RLS. Ambient control user and environment, enabled
BusinessGrant, enabled owner membership and enabled User determine visibility.
No ambient Business/acquisition scope is necessary: the common worker discovers
its private binding before it knows the Business. The runtime has SELECT only
on authorizations and SELECT/INSERT on the other two tables. It cannot update or
delete receipts or mint authorizations.

Binding and reservation triggers compare the actual current module snapshot,
Registration and Creation revision/idle state, enabled owner/Grant, verified
account, live Session, current Agent/SavedConfig and execution source signal.
Module snapshot timestamps are compared as timestamps; its other fields match
the maintained `module_admin.snapshot` JSON exactly. Disabled or expired
authority refuses new reservations and successful output settlement.

## IO, locks and bounded values

The caller must commit a reservation before model IO. Reservation locks the
common Task, Run and then authorization. The authorization lock serializes the
global cap across different Tasks. Clock checks happen after that wait.
Valid role sequences are researcher → reviewer or researcher → writer → reviewer.
Each predecessor must have succeeded before the next reservation; an unsettled
or failed predecessor blocks continuation. The ordinal is unique per Task.

The integrating caller locks canonical owner/Session/Creation/Agent authority
before taking Task/Run/authorization locks. Accounting after loss of authority
must not acquire fresh actor locks in the reverse order. The SQL helpers take
Task → Run → authorization → attempt locks and read current authority without
adding actor locks. Holding current authority through an actual output commit
remains the caller's responsibility.

Once bound, a Task retains its tenant, thread, sequence, kind, request identity,
fingerprint, creation time, Session and source. Run id can move from null to its
first Run once; clearing or replacing it is refused. Bound Runs retain their
identity, creation time, model, effort and adapter. Normal common status, lease,
result, event and usage fields remain available to the common worker. Old kinds
do not enter these new metadata barriers.

Input and packet must be JSON objects of at most 256 KiB in PostgreSQL JSONB
representation; output must be an object of at most 128 KiB. The caller may use
stricter limits. SQL checks SHA-256 syntax, not Python canonical hash equality:
PostgreSQL JSONB text is not the caller's canonical JSON encoding. The caller
must verify all canonical hashes, the real clean source and the maintained
private work-registration file before reservation and output. The schema never
opens that private file or treats a user-supplied source GUC as filesystem proof.

Attempt usage is SQL NULL when unknown. Known usage is exactly
`{"known":true,"tokens":{"input_tokens":12}}`, with at least one of
`input_tokens`, `output_tokens`, `cached_input_tokens`,
`reasoning_output_tokens`. Values are strict nonnegative integers at most 1e9;
extra keys, booleans, fractions and invented zero usage are refused.
`JSONB(none_as_null=True)` is deliberate for attempt usage/output. Raw SQL callers
must bind Python None for SQL NULL, rather than serialize it as JSON `null`.

## Accounting-only helpers

All helpers have a fixed `pg_catalog,public` search path and PUBLIC execution
revoked. Only these three receive runtime EXECUTE:

* `acquisition_model_settle_attempt(a,r,u,e,src,state,usage,output) → boolean`:
  true means an exact terminal receipt was recorded or identically replayed.
  Conflicts and wrong identity return false. Success requires current authority;
  after revocation, only explicit failed/SQL-NULL output can retain observed
  bounded usage. An unsuccessful success-settlement does not automatically
  record failure: the caller must explicitly settle failed/null in its finalizer
  and handle false. Terminal receipt replay does not revive execution.
* `acquisition_model_run_usage(t,r,u,e,src) → JSONB`: exact old-source Task/Run
  binding and ambient user/environment are required, while current Grant or
  Session authority is unnecessary for accounting. Returns only `usage` (known
  token sums or null), `model_calls` (all reservations), `settled_calls`,
  `unknown_usage_calls`, and `usage_complete`. No packet or output is returned.
  Normal SELECT remains hidden when owner/Grant visibility is revoked.
* `acquisition_model_settle_task(t,r,u,e,src,observed_tokens,event_id) → boolean`:
  handles only this new kind after authority loss. Exact immutable old-source
  Task/Run/Binding/authorization identity and ambient user/environment are
  required. It cannot overwrite successful history, publish a result or revive
  execution. It terminates a running Task/Run as failed,
  `authorization_revoked`, SQL-NULL result/lease/cost, with one common event.
  Exact already failed/cancelled receipt replay does not add an event.

Task settlement receives SQL NULL or a plain map of the four token keys,
strict nonnegative aggregate integers at most 30e9. It stores a flat Run usage
map using the maximum of the retained known Run usage, DB-known sum and caller's observed aggregate
for each token key. Caller counts are prohibited. All four count/completeness
fields are derived from DB reservations; unknown tokens stay absent. This is an
aggregate reconciliation, not a sum that would double-charge the same calls.
Reconciliation can increase known usage or update DB-derived completeness on an
already failed/cancelled Run; it cannot revive its terminal state or add an event.

The old Director settlement whitelist is unchanged. Its false result for the
new kind must not be ignored; the caller must use the typed helper and check
the returned boolean. These accounting helpers do not authorize any model,
mail, channel, public result or business effect.

## Migration and verification

The migration requires a trusted migration owner and recognizes the exact
0045 Task kind/Session/Business checks plus one exact legacy-business fragment
in `workspace_direct_task_boundary`. Both anchors are validated before changing
persistent DDL. It extends only that recognized fragment and the two checks;
every other predecessor branch is preserved. CHECK DDL uses original reviewed
expressions, avoiding PostgreSQL's non-idempotent array-coercion spelling when
recompiling `pg_get_expr` output. Downgrade refuses any new table row or model
Task, preserving charged reservations and native history. An empty downgrade
restores the recognized predecessor.

Offline tests exercise exact predecessor recognition, roundtrip, unknown
predecessor refusal, ORM SQL-NULL encoding and runtime privileges. The opt-in
`tests/test_acquisition_model_schema_pg.py` uses maintained native synthetic
Registration/Agent fixtures, restricted runtime transactions and privileged
read-only assertions in a newly owned isolated QA database. It never invokes a
model or operating channel. Set `PINET_ACQUISITION_MODEL_SCHEMA_QA=1` and the
maintained private-preview opt-in only with a dedicated migrated QA database.
The optional `PINET_MODEL_SCHEMA_PREFIX_BASELINE=1` reproduction intentionally
fails on true0045 even after temporary CHECK relaxation, exposing the unchanged
typed direct boundary. It is excluded from post-migration acceptance.

Source delivery, main merge and actual operating adoption are separate. This
change does not migrate the operating0045 database or change any closed ledger.
