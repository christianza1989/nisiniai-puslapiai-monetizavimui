# Reviewed Gmail campaign gateway

This is a default-off source increment for an explicitly reviewed initial-letter
campaign. It reuses the existing encrypted Gmail connection, current owner
authority, business source binding, Case, MailMessage and Lithuanian display
pipeline. It adds no database tables, CRM, model runner or scheduler. Source
tests are separate from actual transport adoption and campaign activation.

The default purpose remains `campaign`. Optional `owner_acceptance` admits only
the actual Gmail sender as recipient and retains test provenance in fresh
records; those messages are excluded from default campaign statistics. It cannot
promote old captures. Exact reviewed responses to a current authenticated inbound
use the separate [conversation adapter](GMAIL_REVIEWED_CONVERSATIONS.md), which
shares these authorities, quotas and no-retry transport semantics.

## Admission

`mail_provider/campaign.py` accepts a private, operator-controlled JSON plan pinned
by its exact SHA-256. It is not a customer endpoint or a model-generated approval.
The plan identifies the connection, owner, grant, business, environment, execution
source and current reviewed business-source ID/fingerprint. Its approval/expiry
interval is at most seven days. Every initial letter fixes the recipient, subject,
body, language, contact source, source evidence, contacting basis and explicit
owner review reference. These fields document a review; the gateway cannot prove
the underlying contacting basis or truth of an arbitrary supplied claim.

Before activation the operator must have the actual owner approval for this
concrete campaign and its sender/recipients/copy/contacting basis. OAuth consent
or a model's `review=true` is insufficient. Sending is additionally gated by
`PINET_GMAIL_CAMPAIGN_ENABLED`, which defaults to false. No plan or external
recipient is activated by the implementation or its tests.

The new gateway prepares fresh commercial MailMessage rows with
`synthetic=false`. Existing self-tests and acquisition capture remain unchanged
and cannot be sent through it. Existing `mailbox.prepare` and OwnerGmail self-test
guards remain in force. Customer letter links are limited to the owned business
host; exact reviewed text and the canonical sender are retained.

## One durable attempt

The limits are at most 100 initial attempts per plan and at most 50 per UTC day
per Gmail account in the same business/environment, with lower plan-specific caps.
Committed intents count even when rejected, uncertain or still `sending`.
An account barrier serializes different letters, concurrent processes and separate
OAuth connection UUIDs for the same authenticated account. The canonical business
lifetime lock precedes the owner/Grant locks, matching source approval/revocation.
An intent is committed before Gmail POST, followed by a fresh owner, source,
campaign, recipient and Case check immediately before that POST. A repeated
command cannot post the same intent again. An uncertain provider response or
lost database settlement leaves an explicit uncertainty, never a free retry.

The canonical recipient Case is shared across these campaigns. An existing
initial intent blocks a new campaign from attempting the same recipient again.
This deliberately bounded increment has no follow-up, resumption or reply-send
command. A future reviewed follow-up must reuse current recipient suppression
and the accepted conversation; it must not bypass this initial-attempt guard.

Provider states remain distinct: `accepted_by_gmail`, `rejected`,
`delivery_unknown`, and retained `sending`. Gmail acceptance is not proof of
delivery, opening or a human reply. Recording the result of an already committed
intent remains possible after actor revocation; it grants no new network action.
If the final source/session fence fails after Gmail already returned acceptance,
the accepted result and exact provider IDs still settle as accepted. A failure
after dispatch without a known receipt remains uncertain, never `not_performed`.

## Accepted conversation replies

`sync` reads only the accepted parent's bounded Gmail thread (at most 30 messages).
It verifies the exact sent content and participants before accepting a rewritten
Gmail RFC Message-ID alias, then matches reply participants/references and imports
into the same canonical Case. The original RFC ID and original reply headers
remain available. Provider/RFC replay does not duplicate the reply.

Receiving remains possible after the send feature is paused or the campaign
expires; current owner, encrypted connection, account, parent and tenant checks
still apply. Every imported reply places the recipient Case on hold pending
review, including an unclassified refusal. Neither translation nor a read can
resume marketing or dispatch a reply. The old immutable plan must remain private
and available to read its accepted conversation after expiry.

The ordinary mail UI can read the original and the existing source-bound LT
display projection. Translation requires its separately approved common Task
policy and budget; missing translation is shown as unavailable, never fabricated.

## Operator command

`runtime/scripts/gmail_campaign.py` exposes only `prepare`, `send` and `sync`.
All require private session/vault/key/plan paths, the pinned plan hash, connection,
business and an exclusive output receipt path. `prepare --identity` is a reviewed
letter UUID; `send`/`sync --identity` is the resulting canonical mail UUID.
The command itself does not approve the plan, enable a campaign, schedule work or
retry a prior intent. Private plans, recipients, OAuth credentials, raw replies
and transport receipts must never enter Git.

## Verification and remaining acceptance

Use the dedicated retained PostgreSQL lane with inert HTTP, including concurrent
single POST, uncertainty/no retry, lost settlement, current source/owner fences,
cross-owner denial, immutable plan/copy, quota serialization, exact rewritten RFC
reply linkage, same Case, pause/hold and ordinary mail read. Retain first failures.
The existing owner self-test and provider offline suites remain regressions.

Actual controlled commercial send/receipt/reply/LT UI, autonomous six-role
calibration, recipient discovery, campaign approval UI, follow-ups and campaign
event analytics remain separate acceptance. Existing mail statistics describe
current records, not proven delivery/open/human-reply rates.
