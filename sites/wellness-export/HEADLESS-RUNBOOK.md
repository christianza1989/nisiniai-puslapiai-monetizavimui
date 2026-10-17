# Headless acquisition and email

Owner scope, 2026-10-18 Europe/Kyiv: European hospitality buyer research and email
preparation/replies. Voice, public launch and platform UI are outside this order.
Business truth remains [BUSINESS](BUSINESS.md): MB Pinet is independent; Maudis is
only a manufacturer candidate. Agreements, prices, stock, commercial suitability,
certificates, warranty authority and fulfilment are unconfirmed.

## Maintained execution

Run from your own fresh private-core checkout. Reuse its locked Python environment
and explicit private inputs. No operating service, existing DB, native Creation,
active worker or earlier creation accounting is changed by this workflow.

```powershell
node scripts/git-freshness.mjs --phase continue --companion <absolute-public-core>
cd agent-business-core/runtime
uv sync --locked --python 3.13
uv run --locked python scripts/acquisition_headless.py prepare --input artifacts/<buyer-input>.json --run-id <unique-id> --budget-ledger artifacts/<existing-budget>.json
uv run --locked python scripts/acquisition_headless.py reply --input artifacts/<reply-input>.json --run-id <unique-id> --budget-ledger artifacts/<existing-budget>.json
uv run --locked python scripts/acquisition_headless.py budget --budget-ledger artifacts/<existing-budget>.json
```

`prepare` accepts existing `Campaign`/`Prospect` contracts. `reply` accepts those
same facts, exactly one Prospect and its chronological `transcript`. The current
CLI prepares private work and exposes no live-send option. It does not turn a
research candidate into an inbound lead or assert a platform registration.

The maintained acquisition engine calls separate tool-free Codex processes for
evidence qualification, personalized writing, independent exact-copy review and
reply coordination. Recipient persona and dialogue evaluator processes are
separate again. All use explicitly requested `gpt-6.1-sol` / `high`; the returned
provider model ID is not exposed. Process separation is not model-family diversity.

Original requests, schemas, outputs and usage are private per-attempt artifacts.
No automatic retry. The durable ledger reserves before dispatch, survives batch
boundaries and refuses a changed budget policy. A failed/uncertain attempt remains
counted; unknown monetary cost stays null. The ordered experiment has one lifetime
ceiling of180 attempts and120minutes from its first dispatch, including interruption
time. An exhausted or expired ledger does not authorize creating another one.

## Canonical mail and Case integration

`acquisition.headless_mail.HeadlessMail` calls the existing
`Correspondence.capture_reviewed()` and `receive()` services. Those services own
current registration/owner grant, source/fact freshness, PostgreSQL transaction,
RLS, replay, recipient policy and exact mail binding. They currently admit only
synthetic test scope and `example.test` recipients. This is real DB capture, not
SMTP submission, inbox delivery or a customer outcome.

The common join is `MailMessage.business_id/environment_id/case_id` to the same
`Case.id/business_id/environment_id`. `CaseSource.site_id` and the acquisition
correspondence thread identify the site and sequence. `MailBinding` pins the
canonical mail payload and input. There is no separate wellness CRM.

An incoming message must come through the caller's authenticated transport and
match the canonical known participants and Message-ID. The adapter uses the
existing mail-reader header matcher; it accepts at most64KiB and plain text,
executes no HTML/attachments and refuses delivery reports as customer replies.
Bounce/uncertain history requires reconciliation before another model reply.
Received refusal/privacy material stays in the same Case even when marketing is
held; actual deletion and marketing permission are separate operator decisions.

After COMMIT the optional integration observation is:

```json
{"event":"acquisition.mail_committed.v1","business_id":"<canonical>","site_id":"<canonical>","environment_id":"<canonical>","case_id":"<canonical>","mail_id":"<canonical>","external_sent":false,"synthetic":true,"translation_dispatched":false}
```

This event contains IDs only and may repeat after capture replay. The display
owner resolves the current MailMessage under normal authority, pins the original
source digest and deduplicates the sidecar operation. Event metadata supplies no
transport proof and never invokes a paid translation automatically. GET remains
read-only. Original messages are not rewritten by Lithuanian display copies.

## Controlled real transport dependency

The current operator config was checked privately: approved sender matches
`info@pinet.lt`, but SMTP username/password and controlled test recipient are
absent and both sending flags are off. Historical MAIL_CORE tests do not prove
current PC access. A controlled test needs the actual configured account, an
explicit owned recipient/inbox and current scope; no new service purchase is made.

Reuse canonical `mailbox.prepare/send_test`, `jobs.smtp_send` and
`mail_reader.match_headers/receive_reply` where admitted. Preserve reviewed
outbox, durable send intent, SMTP acceptance, exact matching inbox receipt,
authenticated reply and Case linkage as distinct evidence. A timeout/ambiguous
send is reconciled by Message-ID, never blindly repeated.

[Hostinger's current policy](https://www.hostinger.com/support/1583510-is-mass-mailing-supported-at-hostinger/)
requires solicited mail and prohibits unsolicited messages. A public organization
address, a model PASS or a smaller batch does not change that rule. Initial NL
outreach also needs current recipient-market and contacting grounds; see
[ACM guidance](https://www.acm.nl/nl/verkoop-aan-consumenten/reclame-en-verleiden/spam-voorkomen-uw-reclame).
No broad sending, follow-up scheduler or new provider is activated here.

## Review and rollback

Inspect exact subjects/bodies and source references. Keep first FAILs, corrected
fixtures and known regression apart from protected input. Run the closed
`acquisition_dialogue_lab.py` with a unique run ID and the same durable ledger;
holdout input requires the existing raw-file SHA256 seal. Expected labels and
personas never enter the writer/coordinator inputs. A hash seal proves integrity,
not independent authorship or universal unseen coverage.

Do not promote an outbound release through the conversation learning controller.
A no-change/not-admitted decision is valid; a candidate file or Git patch is not
runtime adoption. Revert only the scoped source commit to roll back this adapter.
Preserve all original ledgers, messages and Case history. Do not restart another
owner's worker, change operating registrations or reset the experiment.

Private research/contact/model/.eml/DB artifacts stay outside Git and public
content. Review the small researched-contact batch by2026-11-17; an archive or
new domain is not a way to forget a refusal. Report researched, fit, published
contact, permitted contact, drafted, sent, delivered, replied and qualified need
separately. Synthetic dialogue success is not evidence of commercial demand.
