# Durable Lithuanian mail display

This link uses the maintained common Task/Run/Event worker, canonical MailMessage/
Case and existing display POLICY/source_digest/Record/validate_text helpers.
It creates no sending channel, second queue or calibration system. The separate
mail.display_translate kind never uses acquisition's three-role authorization.

## Explicit policy and one source-bound call

An operator supplies a new policy UUID, exact business and current verified
owner Session, clean execution source, explicit model-execution marker,
maximum1–30 calls,30–3600s duration and an immutable mail-created-after cutoff.
Approval derives tenant/portfolio/current Grant, current translation instruction
hash and fixed gpt-6.1-sol/high. Expiry is capped by the Session. Metadata cannot
renew under the same UUID; containment can only disable it. Private prepared and
committed receipts use the maintained helper and require reconciliation on an
uncertain commit. Flags/actor allowlist and policy are independent controls.

Each DisplayJob binds one common Task and its single TaskRun. The deduplication
key is business/environment/mail/source digest/instruction hash/lt, independent
of policy UUID or executable source. Changing a policy cannot replay an existing
mail. Queued slots and charged reservations stay within the policy cap. A durable
reservation precedes possible CLI IO, and a reserved Job never dispatches twice.
Known usage stays known; missing usage remains null/unknown, not an invented0.
Failed, interrupted and revoked work remains charged where a reservation exists.

## Post-commit materialization and atomic display

The common worker's reconcile hook discovers only committed eligible messages
under a current policy, before normal Task claim. A crash after original mail
commit is repaired by the same source-bound deduplication. GET only reads; owner
polling, reopening mail or refreshing a page cannot enqueue a job or call a model.

The existing original message is never rewritten. Translation validation retains
protected numbers, addresses, links, conditions and complete text. The validated
private Record is stored in DisplayJob in the same transaction as terminal common
Task/Run/Event. The owner mail API projects it only after both Task and Run have
succeeded and the exact original digest/instruction hash still match. There is no
filesystem publish/DB rollback gap. Failure cannot hide or undo the original mail.

Existing sidecars and one-call claim files remain historical evidence. Only an
unclaimed source may fall back to its legacy sidecar. A queued/failed/new Job
cannot be bypassed by a sidecar; legacy retained attempts block new model work.
Acknowledging a legacy file creates only a cancelled common Task/Event marker,
with no DisplayJob, TaskRun or new charged call. This durable metadata advances
bounded scans beyond retained sources and does not relabel their old usage as0.
The original file is preserved. A narrow business-owner read projection can see
shared cache/claim state across producers while keeping Task/Run/policy RLS
private and exposing no private execution identifiers or usage. Concurrent owner
inserts recover only the exact named source-key uniqueness conflict.
Automatic discovery handles unseen immutable messages; a changed legacy original
requires explicit source-bound enqueue and is never an automatic paid retry.
The oldest-first candidate query applies the existing original wire's JSON
string and character bounds before its page limit, plus exact Case ownership.
More than one page of malformed historical originals cannot starve a later valid
mail. Those originals remain unchanged, with no Job, truncation or paid attempt.
Authority, expiry and budget errors still stop materialization.

## Current implementation scope

Schema0047 and the runtime adapter are a separate source increment after the
verified acquisition-model packet d415c87. Clean local Serving76db483/public255fea0
now runs schema0047 on18871. Both new model/display controls remain off, actor
lists empty, authorizations/policies absent and channels held. This is code/schema
adoption, not actual translation quality, populated browser or live-mail acceptance.
Normal owner me/business/mail returned200; unauthenticated401 and foreign404.
Migration retained89 prior data tables exactly and added5 empty typed tables;
the original771 native files stayed exact. Later legitimate intake/Foundation
observations are recorded separately in the agent-path handoff.

Root final21 display PG/HTTP/common-worker scenarios passed162.79s. The serial
regression of existing worker/Direct/native workflow/model/mail passed58 cases
575.41s;378 offline cases/67 subtests passed30.10s. An earlier overlapping PG run
had39PASS/1late-usage failure; its isolated case and the complete serial run passed.
That first failure remains retained; no unrelated runtime fix is claimed for it.
The earlier174/180 acquisition ledger remains closed and is not a display budget.
This source increment implements the durable-display link listed as subsequent
work in ACQUISITION_MODEL_PREPARE.md; its remaining model-reply, UI-action and
authenticated transport/inbox links are still separate.
