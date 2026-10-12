# Acquisition correspondence work v1

This is the receiving normal-core synthetic correspondence slice after
`0025_acquisition_core`. It does not change any locked native capture, recipient,
retirement or `CaptureLedgerSnapshot0.1.0` wire. Main merge, operational adoption,
ordinary portal/director UI, daily jobs and real-model calibration are separate.

## Current source and authority

Migration `0026_acquisition_work` adds module-owned recipient policies, threads,
immutable mail bindings and immutable receipts. It adds the canonical
`MailMessage(id,business_id,environment_id)` key. The runtime role has no DELETE
on these tables and no UPDATE on bindings/receipts; all five acquisition scope
coordinates use forced RLS. Bootstrap repairs previously broadened privileges
only for a complete schema; partial schemas are refused. Populated downgrade is
refused. Canonical mail text remains in existing `MailMessage`; requests remain
in `Case`/`CaseSource`. No artificial `Conversation` is created.

`PINET_ACQUISITION_WORK_ENABLED=false` is the default. Enabling this source
requires an independently registered absolute private artifacts JSON path in
`PINET_ACQUISITION_WORK_CONFIG`, the normal capture registration, restricted
loopback PostgreSQL and local/test environment with SMTP/voice disabled.
Each entry binds the same server-registered Scope/adapter to a distinct inbound
key and `inbound-capture` purpose. Native capture/recipient keys and key IDs
cannot be reused. Changing either config's bytes makes the loaded work
registration unavailable until its owner intentionally restarts it. Keys and raw
mail are private and never belong in a PR, UI evidence or source-only transfer.

Trusted worker `Correspondence.capture_reviewed` accepts a supplied engine
preparation result and exact input fingerprint. It validates current canonical
engine instructions, assessment/review gates, recipient policy, campaign stop,
current approving identity/grants/module permissions/source and fixed expiry.
`acquisition.correspondence` is a separate module permission. It shares the
canonical campaign lock with invitation preparation and rechecks the DB clock
after lock waits. A supplied review is not an authenticated real-model receipt;
the typed runner must bind actual execution/accounting before claiming that
acceptance. No public endpoint accepts assessments or decisions. Stored outbound
mail has `state=captured`, `synthetic=true`, `customer_facing=false` and
`external_sent=false`, never `draft` ready for SMTP or `accepted_by_smtp`.

## Normal inbound API and replay

`POST /integrations/acquisition-work/v1/sites/{site_id}/inbound-capture` accepts
strict `InboundCapture`. Only lowercase bounded ASCII `example.test` fixture
addresses are supported in this slice; actual native recipient normalization and
a live connector need later acceptance. Inbound must match the exact retained
outbound MailMessage ID, In-Reply-To, participants, case/thread and immutable
payload digest. References, when supplied, must include that parent. Core mail
rows are pinned while validating; a changed parent cannot replace the binding.

Dedicated headers are `X-Acq-Work-Key-Id`, `X-Acq-Work-Timestamp` and
`X-Acq-Work-Signature` (`v1=` plus lowercase HMAC SHA-256). The ASCII signing
material is these six newline-delimited fields, with no trailing newline:

```
acquisition-work.v1
POST
actual-path
decimal-unix-timestamp
key-id
SHA256(exact-body-bytes)
```

The window is 300 seconds and the streamed body limit is 65536 bytes. Duplicate
authentication headers, queries, foreign scope/adapter/site, incorrect key,
path/body change or clock fail closed. The immutable `(scope,operation,UUID)`
receipt returns original response bytes on exact replay before checking mutable
marketing admission. Changed bytes return409; the same Message-ID under another
request UUID also returns409. Earlier ACKs are historical, never current status.

First acceptance atomically creates canonical inbound captured mail, increments
the thread revision and places the recipient on hold before a model runs. A
stopped policy remains stopped. Recipient containment is shared across campaigns
in the same scope. Bound incoming requests survive marketing module/campaign
stop and approval expiry; this authorizes receipt/containment only. It grants no
new marketing model/provider/transport action or automatic resume.

## Reply decisions and actual privacy acknowledgement

Trusted `apply_decision` requires the exact inbound capture digest, current
thread revision, current last inbound and canonical reply instructions. One
accepted decision per inbound is allowed; a new UUID/current revision cannot
duplicate the handoff or replace that decision. Exact original UUID replay
retains its ACK. No DB transaction is held during a model call by this service;
the future generic typed runner owns pre/post-call authority and known usage.

Refusal/complaint/stop persists terminal marketing suppression even when the
decision fails content validation. Conditional contact retains exact
`resume_condition_quote` and hold; a quote does not automatically resume work.
Unknown/OOO/other replies remain contained. A reply-ready state means a supplied
prepared decision only, requires current marketing admission and creates no
outbound message in this slice.

Valid `privacy_handoff` creates a real canonical operator-required `CaseSource`
and marks the existing Case atomically before returning `handoff_executed=true`.
The quote must be an exact substring of this inbound body, with no outbound text
or invented facts. It survives stop/expiry and a previously stopped recipient.
This ACK proves Case acceptance, not completed deletion or privacy resolution.
Invalid quotes return a blocked decision with `handoff_executed=false` and no
handoff CaseSource. No mail is sent.

## Shared owner read

`GET /operator/v2/businesses/{business_id}/acquisition-correspondence` and the
internal `work_routes.read_snapshot` share one repeatable-read transaction and
strict `WorkSnapshot`. Browser supplies only business UUID; session/current user,
owner membership/grants, environment/site/adapter and
`acquisition.correspondence.read` are server-derived and checked. Reading retained
correspondence is a separate purpose from marketing approval expiry/stop; current
identity/grant revocation still denies it.

All counts are explicitly all-time synthetic captures and recipient policies.
They are not real sent/replied inbox metrics or weekly reports. The watermark
binds scope, append-only receipt count and deterministic latest receipt identity,
body digest and commit time. Thread summaries are bounded to100 with explicit
truncation. `marketing_configuration` reports configured/stopped/expired/pending/
source_changed; configured is not a current dispatch authority proof. Missing
metrics in the old capture projection remain null. Portal and director must use
this exact read after their adapter is actually adopted; source alone does not
prove ordinary BFF, UI or a mounted director tool.

## Remaining adoption

Generic runner typed acquisition inputs, daily scheduling/budgets, actual model
receipts/known-cost settlement, discovery providers, prepared follow-up capture,
native signup link creation/attribution to this correspondence and full ordinary
portal/director journeys remain OPEN. Do not copy the runner or reuse a login
Session as a durable daily-worker mandate. No live delivery, provider, domain,
SMTP, voice or public deployment is enabled by this contract.
