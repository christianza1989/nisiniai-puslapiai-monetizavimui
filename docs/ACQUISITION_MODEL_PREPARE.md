# Current-owner model preparation on common Tasks

This increment adds only acquisition.model_prepare. The existing
acquisition.reviewed_capture remains a model-free storage effect. Both reuse
the canonical Task/Run/Event worker and the same Case/MailMessage/MailBinding.
No second queue, CRM, calibration engine or transport is introduced.

The new path is local/test, synthetic recipient only, and initially disabled.
Three separate controls are required: the normal capture ModuleBinding/private
registration, an explicit privileged model authorization, and the source-fixed
runner flag/actor list. Existing capture/work permissions cannot enable models.
Saved customer Agent readiness and protected calibration remain separate.

## Explicit metadata approval

The operator supplies a new authorization UUID, exact current Registration and
verified owner Session, saved Agent/Config revision/hash, current clean source,
observed Module fingerprint, maximum1–30 charged role attempts and30–3600s lease.
The strict model_execution_authorized marker must be true. No request supplies
business/tenant/owner, executable, model, tools or an arbitrary purpose.

Approval derives native business/site/tenant, saved customer_research or email
purpose, immutable Config, full Module snapshot and combined private work/capture
registration hash. Current canonical Agent writer readiness, including applicable
Foundation, is retained; site_chat/Profile admission is not reused as email
execution. Expiry is capped by the existing Module and Session. Approval inserts
new immutable metadata; a retained UUID/receipt cannot become another lease.
Stop changes only enabled to false and can contain an expired/stale upstream
configuration under current verified owner identity.

acquisition_model_admin.py approve|stop|inspect uses the privileged local
connection and new private prepared/committed receipts. Missing committed status
requires reconciliation, never a silent new budget. Input, owner Sessions,
snapshots, packets and receipts stay outside public artifacts and Git.

## Current-owner submission and execution

acquisition_model_task.py submit accepts the private normal owner Session and
typed authorization/request UUID, synthetic recipient, Campaign and Prospect.
Submission creates common Task/Thread rows plus one immutable binding. Exact
request replay returns the retained Task; it neither reserves a role nor renews
authority. A different request cannot duplicate an active/captured target.
read returns owner metadata without model dispatch; run-one uses the fixed kind.
No new HTTP write route or model dispatch from GET/polling is added.

The worker uses its existing actor slot, lease, TaskRun and events. Parent owner,
Session, Creation and saved Config locks precede Task/Run and the authorization
budget barrier. The new authority hooks apply only to this handler; common
recovery transaction ordering also serves the existing kinds. Each role reserves an immutable charged attempt BEFORE
possible CLI IO. A pending/failed predecessor cannot be retried in the same Task.

Common worker recovery first expires interrupted runs in its own committed actor
transaction. It releases those Task/Run locks before acquiring the next queued
task's parent locks. The subsequent actor-serialized claim checks again for a
running task, including one claimed between the two transactions. This prevents
expired-A/queued-B recovery from deadlocking with A's parent-first heartbeat.

The existing HeadlessRoles/prepare engine selects researcher, writer and exact
independent reviewer. A non-fitting research assessment may skip writer. Each
call is fixed gpt-6.1-sol/high with a maintained native executable/hash, private
workspace, strict schema, bounded deadline, live heartbeat and existing process
cleanup. No tool, web, provider fallback or automatic provider retry is allowed.
The saved Specification is untrusted task data, never a permission override.

Current source/owner/Session/Grant, exact saved purpose/Config, Registration,
Module snapshot/TTL, private config and campaign/recipient conditions are
rechecked before reservation, IO and result/effect commit. Failed review can
complete as a blocked preparation but creates no mail. An approved draft is
captured in the same transaction as terminal Task/Run/Event state.

## Accounting and containment

The separate explicit authorization owns its lifetime attempt ceiling. It does
not reopen or reset the earlier closed174/180 headless ledger. Campaign limits
also count retained charged attempts. Reservations survive process interruption,
model failure, cancellation and authority loss; absent usage remains unknown.

Per-role usage is SQLNULL or known:true plus the four bounded native token
fields. The accounting reader returns known token sums, charged model_calls,
settled_calls, unknown_usage_calls and usage_complete. model_calls counts durable
reservations, not proof of a network call or delivery. Cost remains unmeasured;
CLI token usage is not a USD invoice.

Source/current-authority loss cannot publish a successful role output. A narrow
failed/null settlement preserves observed usage after revocation. A separately
typed hidden-task accounting function terminalizes only the exact retained
model Task/Run/source/owner, keeps result null and emits one common event. It does
not require a current grant to account for prior work, return private output or
grant permission. Its bool result must be checked. Exact terminal replay changes
no row, task result or event count. Later observed knowledge may monotonically
refresh only the same failed/cancelled Run's accounting projection, with counts
derived from immutable reservations. It cannot revive work or modify a successful
result. Ordinary reads remain behind the current grant.

Cancellation propagates as cancellation. Before propagating it, the new model
kind makes a shielded accounting-only terminal settlement under the same typed
helper, including when current ownership has been revoked. The model output
stays null, a reserved call is never replayed, and unavailable usage stays unknown.
If the database itself is unavailable, the immutable charged reservation remains
the recovery evidence; no successful settlement is invented. Visible late
accounting also preserves terminal status/time, while enriching known token sums
and refreshing reservation-derived counts without reviving the task.

## Adoption and remaining paths

Schema0046 and these source handlers are adopted as code into the local operating
API76db483/public255fea0/schema0047. Model flags remain off, actor lists empty
and no model authorization/module activation is inferred. Workers/channels are
held. The new display/source packet passed58 serial existing worker/native/model/
mail PG cases; the earlier independent15 model-specific cases remain retained.
Inert tests are not
actual model calibration, complete Foundation, ordinary UI or real mail proof.
Protected learning/adoption and a real bounded-call acceptance stay separate.

The captured mail can be read through the existing owner mail view. Separately
bounded durable display translation after commit is now implemented in schema0047;
see MAIL_DISPLAY_TASKS.md. Its policy/flags are held and it is never a hidden fourth
preparation role. Model reply tasks, UI action/read integration and authenticated
live transport/inbox admission remain subsequent bounded links.
No marketing, manufacturer fulfilment or photo-rights authority is inferred.
