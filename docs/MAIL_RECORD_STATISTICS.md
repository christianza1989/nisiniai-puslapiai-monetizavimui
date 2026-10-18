# Owned mail-record statistics

2026-10-18. Source-only follow-up to PR164, based onc684c1ad. The ordinary owner
API now exposes `GET /operator/v2/businesses/{business_id}/mail-statistics`.
Required `start` and `end` are timezone-aware ISO timestamps, normalized to UTC.
The half-open interval `[start,end)` must be positive and at most31days. Duplicate,
unknown or missing parameters and GET bodies are rejected. The endpoint is
read-only, private/no-store and uses the existing current Session, BusinessGrant,
tenant RLS and exact raw environment. It does not enable any worker or transport.

## Meaning of the result

The `mail-statistics.v1` envelope reports one current grouped database snapshot.
`time_basis=mail_message_created_at` selects which records enter the window;
`measure=current_record_state_snapshot` describes their state when read. A draft
created yesterday and accepted today is still selected by yesterday's creation
time. This is not a time series of send events or a campaign/cohort report.

The source is the existing canonical MailMessage table. There is no second mail
store, mutable recipient profile or fabricated Conversation. SQL selects only
fixed aggregate labels and counts, not original bodies, subjects, addresses,
Case IDs or arbitrary provider/state strings. At most33 grouped rows reach the
projection, regardless of the number of unknown state names.

Three independent groups are returned: explicit JSON `synthetic=false`
(`non_synthetic`), explicit JSON `true` (`synthetic`) and missing/invalid provenance
(`unclassified`). A string `"false"`, numeric0, null, array or object is never
treated as the boolean false. `non_synthetic` describes the stored marker only;
it is not independent proof of a real prospect, authorization or commercial KPI.
Do not add the three groups together into a business-performance card.

Each group counts stored outbound draft, sending, accepted_by_smtp, accepted_by_gmail, rejected,
delivery_unknown and other states; inbound received, captured and other states;
and unknown directions separately. Unknowns are retained, not silently dropped.
An empty group has measured zero stored records. SMTP/Gmail acceptance is not
confirmed delivery; `sending` is a stored in-progress state, not acceptance.
`captured` is not a provider-verified human reply. Original messages,
receipt states and translation identities remain unchanged by the read.

Delivered, bounced, opened and clicked metrics are unavailable/null with reason
`no_provider_event_source`. Human replies, unique recipients and reply rate are
unavailable/null with reason `not_derived_from_record_snapshot`. No percentage or
denominator is invented. A downstream interface must show lack of data separately
from a measured zero. These fields reserve honest semantics, not a connected
Gmail/IMAP event feed.

The additive v1 fields `outbound_sending` and `outbound_accepted_by_gmail` default
to zero in each provenance group. They classify current records previously
included in `outbound_other`; they add no provider event, campaign or UI filter.

## Acceptance

The first owner request against the pre-change API returned404, retained in the
dedicated isolated QA baseline log, SHA256
`aa7f6c682389c577f0347da5bcd13ec6b74c497d803b1008ec6c09c1821964d3`.

New statistics plus existing mail-view restricted-PG regression:5PASS6.84s,
SHA256`cd6cef03a0bc0e8067371c616efb93a626f3b0ac5d352a7dd9a7d40c28ded2b3`.
It verifies exact start/end edges, another environment excluded, malformed JSON
provenance separated, empty own business, foreign denial, committed grant
revocation, a new connection pool reading the same result and original payloads
unchanged. Existing mail pagination, original/translation and authority tests
remain in the same invocation. Two earlier statistics-only PG cases also passed
before the additional malformed-provenance/environment fixtures were added;
the five-case regression is the current complete PG evidence.

Offline boundary/previous mail-view tests:35PASS1.51s, SHA256
`188917ef39cbc61ddbdcdc2ea2f19231f716200756f2b2a4652748344a559400`.
They cover malformed and unbounded requests, timezone normalization, snapshot
totals, explicit unavailable values and fixed SQL projection. Ruff initially
reported two import-order findings; both were fixed and the scoped rerun passed.
The separately authorized reviewer read only these source/test boundaries and
found no concrete semantic blocker. They did not execute the suites; this is not
independent test execution or human GitHub approval.

Reproduce the source suites from `agent-business-core/runtime` with the locked
runtime environment and a dedicated migrated QA database, never the operating DB:

```text
python -m pytest tests/test_mail_statistics_pg.py tests/test_mail_view_pg.py -q
python -m pytest offline_tests/test_mail_statistics.py offline_tests/test_mail_view.py -q
python -m ruff check src/pinet_core/mail_view/statistics.py src/pinet_core/mail_view/statistics_wire.py src/pinet_core/mail_view/routes.py tests/test_mail_statistics_pg.py offline_tests/test_mail_statistics.py
```

Local controller wrappers/receipts are ignored `.local/sharp-policy/mail-statistics-pg*`.
No model, OAuth, SMTP/IMAP or other provider call was made. No operating or protected
calibration message was read or changed. This source packet is not yet adopted
into API18871 or the portal and does not claim browser/hosted acceptance.

## Remaining email system

The [email-system plan](VERSLOMATIKA_EMAIL_SYSTEM_PLAN.md) remains authoritative:
one common transport boundary, durable provider events/cursors, exact receipt
bindings, suppression, campaign attribution and original/Lithuanian UI acceptance
are separate work. A future event source must declare coverage and use a new
explicit projection contract; it must not relabel this snapshot's timestamps or
historical totals as send/delivery events. Acquisition capture-ledger counts and
their unknown outreach metrics are unchanged. Rollback is a scoped source revert;
there is no schema/data migration or operating-state rollback in this packet.
