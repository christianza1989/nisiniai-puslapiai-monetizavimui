# Durable mail display schema,0047

The schema adds `mail.display_translate` to common Task/Run/Event. It does not
dispatch a model, enqueue from GET, enable an actor or modify sealed MailMessage.
Root owns policy administration, materialization, handler/worker integration,
current Git/executable/content checks, translation validation and HTTP projection.
Existing0046 acquisition model permission and its three-role budget are separate.

## Two retained records

`DisplayPolicy` / `control_mail_display_policies` is explicit bounded authority:
tenant, owner/portfolio/exact Grant and Session, source revision, instruction hash,
LT, fixed `gpt-6.1-sol`/`high`, maximum calls1–30, mail creation cutoff, approval,
expiry and immutable fingerprint. Expiry is at most one hour and cannot exceed
the authorizing Session. Only enabled true→false is mutable. The runtime can
SELECT, not insert/update/delete. Root's trusted administrator supplies and
verifies the canonical fingerprint; SQL does not reproduce its Python digest.

`DisplayJob` / `control_mail_display_jobs` is an immutable exact Task/Policy/
MailMessage/Case binding, one-shot Run reservation and private derived Record.
The composite foreign keys retain tenant and exact new Task kind. Mail.case_id
must match Job.case_id. The unique source key is Business/environment/Mail id/
source SHA/instruction SHA/LT; a new Policy id or execution SHA cannot replay it.
The stable constraint name is `uq_mail_display_source`; a caller must handle
only that specific23505 source race, not swallow other integrity failures.
There is no Job status, second queue or separate attempt table. Common TaskRun
is the single attempt. Runtime has SELECT/INSERT only; typed functions perform
reservation and Record mutations. No row may be deleted.

Both tables use forced owner/environment/current enabled Grant/member/User RLS
without an ambient Business requirement. The control_ namespace is excluded from
bootstrap's general CRUD grants. Public function execution is revoked; fixed
search_path is pg_catalog,public. The four execution/accounting helpers and one
separate read-only business-mail projection receive runtime EXECUTE.

## Reservations and authority

Job insertion locks Task then Policy. Its cap includes all reserved Jobs plus
unreserved queued/running Tasks. A terminal unreserved Task frees admission
capacity but retains the source dedup key. Duplicate insertion still reaches the
unique constraint at a full cap, supporting the caller's conflict reconciliation.

`mail_display_reserve(t,r,u,e,src) → bool` locks Task→Run→Policy→Job and repeats
DB-clock/current authority checks after waiting. It requires current enabled
owner/User, verified customer Account, exact enabled Grant, live Session/Policy,
current execution-source signal, eligible Mail/Case and exact running Task/Run.
The lifetime cap counts every reserved Job, including failed/unknown calls. A
true result creates the first durable reservation and resets Run usage to SQL
NULL before IO. Repeated reservation returns false; it never authorizes retry.
Commit this reservation before invoking the model.

The caller takes canonical owner/Session/Grant and Mail/Case parent locks before
Task/Run/Policy/Job. The SQL helpers add no actor locks after child locks. Fixed
new-kind metadata fences retain Task identity, Session/source/request and its
first Run id, and Run identity/model/effort/adapter/creation time. Common status,
lease/result/event and Run usage/finish fields remain available to the worker.

SQL compares persisted identity/hash fields and the source GUC; the caller must
verify actual clean Git/executable, current POLICY_SHA, sealed provenance and
canonical source_digest before IO and final commit. SQL does not read source
files, reconstruct Python JSON hashes or certify semantic Lithuanian translation.

## Accounting and private Record

Usage input is a plain map of input_tokens/output_tokens/cached_input_tokens/
reasoning_output_tokens, strict integers0–1e9. SQL NULL, JSON null and empty map
are unknown. Invalid/extra keys and caller counters are refused. Costs remain
NULL; CLI usage is not an authoritative invoice.

`mail_display_run_usage(t,r,u,e,src)` returns only usage (known token map or null),
model_calls0|1, unknown_usage_calls0|1 and usage_complete. Counts come from the
Job's Run id/reserved timestamp, not usage truthiness. An exact pre-IO common Run
with an unreserved Job reports0 calls/0 unknown/complete true. A reserved unknown
Run reports1 call/1 unknown/complete false. Unknown never invents token zero.
Read-only accounting accepts the exact old-source tuple after authority loss;
it exposes no Record and cannot authorize IO.

`mail_display_settle_task(t,r,u,e,src,usage,reason,event_uuid) → bool` permits only
the source-fixed reasons authorization_revoked, provider_error,
mail_translation_invalid, mail_authority_changed, worker_interrupted, run_timeout,
output_invalid, translation_runner_unavailable, translation_deadline_invalid,
and usage_observed. Normal reasons mark a running Task/Run failed, retain one
common event, clear result/lease/cost, and keep observed token knowledge by MAX.
Existing failed/cancelled state/code/time/event is preserved. Exact replay writes
nothing. Pre-IO accounting cannot accept nonempty observed tokens or set Job
reservation fields. It can finish an interrupted unreserved Run with0 calls.

The special usage_observed reason requires a reserved Job and updates only
monotonic Run usage/counters/cost. It preserves Task/Run status, timestamps,
result, events and Job Record, including after Grant/source loss. It never
becomes a failure code. Root checkpoints provider-return usage in its own
transaction before returning from the handler, closing the completion-cancel
gap without a fifth helper or another attempt ledger.

`mail_display_store_record(t,r,u,e,src,record,usage) → bool` requires current live
authority and a charged exact Run. It validates bounded exact Record envelope,
scope/Mail/source/instruction/LT/model/high, aware non-future timestamp and text
shape. It permits NULL→Record once and exact replay, never replacement. Run
usage immediately becomes MAX(previously known,supplied), with DB counters.
Unknown supplied usage cannot erase a checkpoint. This helper does not mark
Task/Run terminal or add an event. Root commits Record+Task/Run succeeded+Event
atomically; a reader must require both succeeded states before projecting ready.
Failed accounting never writes a Record. `DisplayJob.record` deliberately uses
JSONB(none_as_null=True); common Run SQL/JSON null are both treated as unknown.

## Historical business-owner projection

`mail_display_projection(b,mail,u,e,sha,instruction) → JSONB|null` is read-only.
It requires exact ambient user/environment, enabled User, current enabled owner
Membership/BusinessGrant and the canonical Mail/Case in that Business. Historical
reading has no Policy TTL/source requirement; the API checks its Session.
It exposes only state+Record, never Job/Task/Policy ids or usage. A ready Record
is copied with usage JSON null; the stored Record is not modified. Other current
owners may already read this canonical Mail, and can now read its LT display
without broadening owner-scoped Task/Policy/Job RLS or minting another call.

With sha SQL NULL, any matching Business/environment/Mail/instruction/LT Job,
from any owner, returns claimed/null. A strict common Task legacy marker also
counts: same kind/Business/environment, cancelled, no Run, failure code
mail_display_legacy_retained, and exactly state/mail_id/source_sha256/
instruction_sha256/target_language in result. That result says legacy_retained
and LT with a valid source SHA. Root validates file provenance and creates such
metadata markers without Job/Run/model IO. This lets bounded materialization
skip already handled legacy files durably without starving later new Mail.

With an exact SHA, a matching Job returns ready only when Task+Run succeeded and
Record exists; queued/running is pending, otherwise unavailable. It cannot fall
back to a legacy file. Only an exact strict legacy marker returns legacy_retained
and authorizes Root's existing sidecar reader. No match or lost business-owner
access returns SQL NULL. The projection never creates a Task, reservation or IO.

## Migration and checks

0047 recognizes exact0046 Task kind/Session/Business checks and one exact typed
business classifier fragment before persistent DDL. It changes only kind/Session
checks and that fragment; all older kinds/direct-null-Business rules remain.
Original expressions avoid PostgreSQL recompile spelling drift. Empty downgrade
restores exact0046; any Policy/Job/new-kind Task history refuses downgrade.

Offline tests cover frozen names, predecessor/roundtrip refusal, grants and ORM
encoding. Opt-in `tests/test_mail_display_schema_pg.py` uses real maintained
register/verify HTTP, synthetic trusted Grant/Case/Mail and restricted runtime
transactions in a NEW labelled isolated PostgreSQL QA. History is retained.
`PINET_MAIL_DISPLAY_PREFIX_BASELINE=1` intentionally reproduces the0046 refusal;
it is excluded from post-migration acceptance. No provider/channel/operating
database or closed ledger is part of this schema package. Source delivery,
main merge and actual adoption remain separate.
