# Incremental native saved-agent preview

This packet adds an explicit local preview protocol. It reuses the maintained
SessionPrincipal, native text executor, independent Quality evaluator, Task worker
and calibration allocation/call/usage ledger. It neither activates a channel nor
admits a module. No helper PostgreSQL, model, case or serving operation was run.

## Prerequisite and migration order

The accepted consultant prerequisite is Root
`86814bebb5e0992ee58dc78e3e80b1f3208d3718`, including the functional
`73534cf1d1f177f74b332eb8c7980b3a933749b0` repair. Root reported an empty 0043
database migration/bootstrap PASS and 59 actual cases PASS with provider calls 0.
Those results cover the prerequisite, not this 0044 packet. The original failed
cohorts and upgrade-158 journal remain unchanged.

The original in-progress source was preserved in commit
`40516cd37da9edc44ec7fd36b36f056fb2d9f4fc`. The accepted repair commits were then
integrated separately. Root's existing upgrade-158 sequence-4 event was retained;
the colliding helper metadata-only sequence-4 commit was excluded. The unrelated
Wellness handoff document was excluded from the prerequisite cherry-pick.

Run 0044 only after the repaired 0043, on a new dedicated empty QA database first.
0044 checks exact predecessor functions and constraints before its additive DDL.
It patches the repaired tiny terminal accounting classifier only for an actual
immutable native binding plus its exact existing allocation. Live/output fences
remain in the invoker. Trigger helper names use an explicit VARCHAR cast.
Unknown, ambiguous or already-patched predecessor bodies fail closed.

Existing Job uniqueness remains `(conversation_id, kind)` for every payload other
than the exact new Quality version. New preview jobs have separate unique keys
for each turn and transcript revision. Existing Artifact revision uniqueness is
reused. Downgrade refuses to discard retained native history; rollback requires
the coordinated source path and retained schema/receipts.

## One owner message

Creation requires a real current registered business/grant and saved site-chat
Agent/Config/Profile. Metadata-only native start creates an actual Conversation;
it cannot reserve a model call. A direct chat binds that exact Conversation and
frozen configuration. No synthetic Business, Grant or adviser Agent is created.

Admission captures current native metadata in a separate completed transaction,
then takes the existing owner/admission locks. Each new owner message creates
one Task with a three-call allocation: one native text call and the existing
Quality evaluator's maximum two calls. The ordinary consultant one-call hold is
excluded when this existing allocation owns the same Task. One common actor/day
allowance is retained. Replay returns the original accepted metadata.

Claim records the exact prior native transcript hash/count, need revision, turn
plan and Quality request intent. SessionPrincipal checks the current Task fence
before policy/index work. Reservation consumes the existing ledger inside the
native transaction; it never reacquires admission or invokes heartbeat. Native
work runs outside Task admission transactions. Completion takes native parent
locks before the Task, proves the native reply and current independent Quality,
and validates deferred public-author provenance while the Task is still running.

Only the new explicit preview version separates a fresh authorizing Session from
the original immutable native binding Session. It cannot revive the old Session.
Old EpisodePlan, scripts, binding/config serialization, fingerprints and evaluator
contracts remain unchanged. Old scripted test-run listings exclude the new
configuration descriptor through upgrade-fc5bfbb5; the descriptor does not claim
to hash future owner messages.

## Results and accounting

Each successful turn retains its own Quality Job/Artifact and transcript revision.
When another message advances the transcript, an older successful turn and its
artifact stay retained with `quality_current=false`. Authors refer to the actual
native result event and saved configuration. No group/adviser output substitutes
for a saved-agent reply. Quality/admission/activation states remain separate.

Failure or revocation never authorizes output. Retained usage is obtained from
the existing narrow calibration accounting function before the consultant ledger;
an RLS-visible allocation probe cannot choose the ledger after grant revocation.
Unknown cost/usage remains unknown. A failed/incomplete native transcript blocks
further sends in that chat; there is no automatic retry or history repair.

## Required integration-owner checks

Helper offline tests and native collection are source checks only. Root owns
migration/bootstrap, actual native tests, retained-case equality, serving adoption
and any later model/UI acceptance. Run `tests/test_workspace_direct_preview_pg.py`
with `PYTHONPATH=src;tests`, alongside the same accepted consultant and legacy
team/Episode/provenance/budget cohort. Do not put `offline_tests` first in native
collection because it contains a same-named High fixture module.

The seven prepared cases cover two messages on one Conversation with immutable
revision Quality, queued cancellation/released allowance and metadata replay,
cancellation after text reservation, grant revocation after text reservation,
Quality failure retaining both charges, revoked Profile before dispatch, and
re-login using the same original binding with a new current Task Session.
The fixtures use maintained native argument/schema construction and inert bounded
transports. They must run only in the dedicated random QA environment.

## Isolated delivery validation

Root base: `bfa8c6cd4f4c572aa507da408af596361b5b4099`. Original tested source: `97e53ef`.
All tracked runtime source/tests/migrations match the tested original by SHA-256.
Full offline: 1908 PASS, 8 SKIP, 67 subtests, 86.75s; two inherited Pydantic warnings.
Full log SHA-256: `1f642c21f501dfa0d67a244c6ffe381af82500b837d42567d615bb4b26c5fc23`.
Isolated delivery: 139 focused PASS in 10.79s. Native collection: 74 cases in 4.23s,
including 7 new cases, the 59 prerequisite cases and 8 canonical High cases.
Native collection is not actual DB acceptance. Root executes the migration and cases.

The one net Stage2 commit changes exactly these 33 paths:

```text
WORKSTREAMS.md
agent-business-core/runtime/migrations/versions/0044_direct_native_preview.py
agent-business-core/runtime/offline_tests/test_direct_preview_fence.py
agent-business-core/runtime/offline_tests/test_direct_preview_history.py
agent-business-core/runtime/offline_tests/test_direct_preview_plan.py
agent-business-core/runtime/offline_tests/test_direct_preview_schema.py
agent-business-core/runtime/src/pinet_core/customer_agents/evidence.py
agent-business-core/runtime/src/pinet_core/customer_agents/lab.py
agent-business-core/runtime/src/pinet_core/customer_agents/preview.py
agent-business-core/runtime/src/pinet_core/customer_agents/quality.py
agent-business-core/runtime/src/pinet_core/customer_agents/review.py
agent-business-core/runtime/src/pinet_core/customer_text/service.py
agent-business-core/runtime/src/pinet_core/jobs.py
agent-business-core/runtime/src/pinet_core/models.py
agent-business-core/runtime/src/pinet_core/workspace_team/direct.py
agent-business-core/runtime/src/pinet_core/workspace_team/direct_handler.py
agent-business-core/runtime/src/pinet_core/workspace_team/direct_preview.py
agent-business-core/runtime/src/pinet_core/workspace_team/direct_preview_budget.py
agent-business-core/runtime/src/pinet_core/workspace_team/direct_preview_plan.py
agent-business-core/runtime/src/pinet_core/workspace_team/direct_preview_schema.py
agent-business-core/runtime/src/pinet_core/workspace_team/direct_preview_views.py
agent-business-core/runtime/src/pinet_core/workspace_team/direct_projection.py
agent-business-core/runtime/src/pinet_core/workspace_team/models.py
agent-business-core/runtime/tests/test_workspace_direct_preview_pg.py
core-improvements/entries/upgrade-adc83c2c-18ab-42b1-bb6b-80248cfa66e2/RUNBOOK.md
core-improvements/entries/upgrade-adc83c2c-18ab-42b1-bb6b-80248cfa66e2/events/5ff9a342-d864-4ba8-8775-7b192fb8caee.json
core-improvements/entries/upgrade-adc83c2c-18ab-42b1-bb6b-80248cfa66e2/events/874d1a6d-bb81-4280-962b-1deb594b5929.json
core-improvements/entries/upgrade-adc83c2c-18ab-42b1-bb6b-80248cfa66e2/events/acb04c1a-cf52-4db1-bd6c-9629774b217b.json
core-improvements/entries/upgrade-adc83c2c-18ab-42b1-bb6b-80248cfa66e2/events/ed7c4f2d-ca5c-4ea6-96ef-e408f13260fb.json
core-improvements/entries/upgrade-adc83c2c-18ab-42b1-bb6b-80248cfa66e2/record.json
core-improvements/entries/upgrade-fc5bfbb5-de1f-45f1-ad2e-f58c29e0737b/events/8c831985-8ceb-452f-bd83-5cd3c6fb3dd7.json
core-improvements/entries/upgrade-fc5bfbb5-de1f-45f1-ad2e-f58c29e0737b/events/de75f337-c0e7-44e3-8d39-a50e10b9fc72.json
core-improvements/entries/upgrade-fc5bfbb5-de1f-45f1-ad2e-f58c29e0737b/record.json
```
