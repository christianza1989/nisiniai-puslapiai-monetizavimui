# Typed acquisition capture tasks v1

This is one internal stage on the existing generic Task/TaskRun/TaskEvent worker.
It consumes **internally supplied reviewed synthetic copy** and atomically stores
canonical Case/MailMessage/CaseSource plus the terminal Task result. It does not
discover prospects, research, generate/review copy, send or read real mail.
Supplied review flags are not authenticated real-model receipts.

## Execution

Migration0027 follows immutable0026. Kind `acquisition.reviewed_capture` uses a
real approving owner and current organization/business grant, a registered exact
five-coordinate Scope/adapter and the acquisition Module's fixed source/expiry.
It requires `acquisition.capture`, `acquisition.correspondence` and
`acquisition.work`. It has a NULL browser Session: daily automation is authorized
by that explicit current Module mandate, not an invented login or Conversation.
Consultation tasks still require their real Session and old kind.

`PINET_ACQUISITION_TASKS_ENABLED` defaults false. Capture/work registration and
local Docker PostgreSQL restrictions remain required; keys stay private and the
work registration hash is immutable in each task binding.
`PINET_ACQUISITION_TASKS_DAILY_LIMIT=0` removes the optional ceiling. A positive
explicit operator ceiling counts every UTC-day attempt, including failed or
cancelled tasks. No mandatory invitation/model-call ceiling is introduced by
this stage. The immutable campaign-local day is retained for later scheduling.

Internal submission is `tasks.submit_capture(database, CaptureTaskInput)`.
No public POST accepts recipient, Scope, prepared copy or reviewer claims.
The actor UUID admission lock is shared with existing chat; scoped hidden unique
conflicts become409 after rollback without revealing retained historical data.
A target is reserved once per exact campaign/prospect, including uncertain or
cancelled attempts; changing a request UUID does not authorize blind retry.

The fixed dispatcher calls the common worker and common queue/run/event/lease
transitions. This kind invokes no model/CLI/transport and records known zero model
calls when its internal run returns. Current module identity/source/permission/
expiry, campaign and cross-campaign recipient policy are checked at admission,
claim, heartbeat and immediately before effect after row waits. Inbound hold/
stop prevents queued marketing capture. Cancellation and dead lease fence
effects; expired runs fail and are never automatically requeued.
Canonical capture, its receipt, terminal Task/Run and event share one commit.
A failed final fence rolls back effects while preserving the failed attempt.

## Owner reads and cancellation

Existing `chat.v1` and `operations.v1` schemas remain byte-identical. Their Task
read/cancel/history/report surfaces include only consultation tasks, so strict
existing consumers cannot receive the new kind or capture result.

Additive `acquisition-tasks.v1` uses the same canonical task/run/event rows:

- GET `/operator/v2/businesses/{business_id}/acquisition-tasks?limit=20&cursor=...`
- GET `/operator/v2/acquisition-tasks/{task_id}`
- GET `/operator/v2/acquisition-tasks/{task_id}/report`
- GET `/operator/v2/acquisition-tasks/{task_id}/events?after_sequence=0`
- POST `/operator/v2/acquisition-tasks/{task_id}/cancel`

`task_routes.read_page/read_task` are the shared internal reader for portal/tools.
They accept actual server user/session identity and a business or task UUID;
only the server derives Scope/adapter. Every request verifies current Session,
user, owner membership/grant and separate `acquisition.work.read` permission.
Read/cancel can survive marketing Module stop/expiry, never creating new
execution authority. Identity/grant/read-permission revocation denies access.

Pages query at most limit+1 rows (limit1–50), use creation-time/UUID keysets,
session-bound signed cursors and an observed creation-set snapshot. Appending a
new task invalidates the older cursor with409; status remains live on reload.
The snapshot is not a full-payload or semantic-quality hash. Receipts/results
only expose opaque IDs/state; recipient, prepared copy and input binding remain
private. Report model/effort=`none`; actual known zero calls or unknown usage,
USD always null. Captured never means sent/inbox/delivered.
Execution provenance requires both Run ID and its exact Task ID; an inconsistent
legacy pointer returns no execution receipt and never attributes another Task's
accounting to this report.

`wire.json` contains exact Pydantic schemas for the four envelope models.
It is generated from `task_interfaces`, separately from old canonical OpenAPI.
There is no frontend/director/tool deployment implied by these source files.

## Acceptance boundaries

Owned full-chain restricted PostgreSQL/common-worker and normal API tests must
prove atomic effects, UUID replay/hidden-history conflict, keyset reads, distinct
old wire, revocation, stop/hold/expiry, cancellation and actual row-wait clocks.
Preserve original FAILs and all rows. New-process/DB restart, complete bootstrap,
backup/restore and empty/populated rollback evidence are separate from pure
schemas, source review and injected preparation. Actual discovery/research/model
review and accounting, periodic scheduler, native signup link, ordinary portal/
director UI, full local platform, target-PC and public launch remain OPEN.

[Bounded normal source/process and portal BFF acceptance](../../../docs/ACQUISITION_TYPED_TASKS_NORMAL_QA_2026-10-12.md)
records exact sources and separate receipts. Its normal HTTP/CookieJar result is
not ordinary browser login, a mounted director tool or authenticated preparation.
