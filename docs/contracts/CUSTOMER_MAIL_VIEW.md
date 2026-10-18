# Owned mail display

The normal owner Session and current business grant permit read-only access to
the existing `MailMessage`/`Case` records. Explicit tenant/environment predicates
and existing tenant RLS apply. Reads work independently of marketing activation;
stopping acquisition must not erase an owner's correspondence. This packet adds
no transport, campaign, inbox collector, automatic reply or new calibration core.

Two fixed GET routes return 25 newest messages or one complete original. A Case
filter shows one conversation. The `before` ID must belong to that same authorized
business, environment and filtered Case. Empty, unavailable and access denied are
distinct. SMTP acceptance is not independently proven delivery. Unknown states
are displayed as unrecognized, never guessed successful. Synthetic is retained
per message; missing provenance is unknown.

Lithuanian is a display copy only. The original subject/body/headers and sealed
native payload are never rewritten. Private sidecars bind business, environment,
mail/Case/provider IDs, direction, sender, recipient and exact subject/body hash.
A changed original cannot reuse an old translation. Missing, corrupt, foreign,
future or outdated-instruction records fall back to the usable original with an
explicit unavailable label. GET never calls a provider. No translation HTML is
executed and no remote email image is loaded.

Schema0047 source adds the distinct `mail.display_translate` kind on the common
Task/Run/Event worker. A separate explicitly bounded DisplayPolicy admits fixed
gpt-6.1-sol/high, no-tools translation after canonical mail capture commits.
The single source-bound Job reserves its sole Run before IO. Unknown or failed
attempts cannot retry through a new policy. A validated DB Record and common
terminal success commit atomically; GET remains read-only. Current business
owners share the derived LT display without sharing private execution records.
Original subject/body/headers stay unchanged. Number/URL/address preservation
is a conservative check, not a full semantic-quality guarantee. Inspect actual
model outputs before claiming translation quality. Display accounting is separate
from creation and acquisition; it cannot reopen their retained closed allowances.

Configure `PINET_MAIL_DISPLAY_DIRECTORY` as an absolute private operator-owned
directory for historical sidecars/claims only. Keep it outside Git/public
artifacts. The raw canonical environment, not the public `environment: test`
label, binds source digests. Existing copies/attempts under both raw and old
normalized paths are retained and block automatic new paid work; their unknown
usage is never deleted or relabelled zero.

`mail_display_policy.py` manages the separate source/Session-bound policy and
prepared/committed receipts. `mail_display_task.py` enqueues/reads under the
normal owner Session or runs one common worker iteration. The old filename
`mail_display_translate.py` delegates to this same entry point; its former
direct paid filesystem batch arguments are retired. See
[durable display](../MAIL_DISPLAY_TASKS.md) and
[schema0047](../MAIL_DISPLAY_SCHEMA.md) for exact authority and accounting.
Automatic materialization needs explicit policy, actor allowlist and default-off
display flags. Source implementation is separate from operating adoption and
actual provider/channel acceptance. Mail bodies, translations, contact data,
Session and CLI traces stay private; the API returns an owned bounded projection.

## Earlier read/explicit-batch evidence — 2026-10-18

The related pure regression passed86 cases in13.41s. The two real PostgreSQL
cases passed in3.23s with normal owner login, pagination/thread reads, exact
translation display, unchanged original payload, cross-tenant denial and grant
revocation. The original0032/operating0045 databases and current native files
were byte-preserved. PostgreSQL log SHA256:
`a5d2c96aba1a069538e20842b0496a2c4f78f13e1c6a14a9d6a117b075b4109a`.

One separately bounded synthetic display call used gpt-6.1-sol/high, with12352
input and409 output tokens (including226 reasoning tokens). The retained
sidecar SHA256 is
`4bfc347f2a36ab8f264c0a19bf0face4929b13e7fdc1cdc9017d43adc46481e1`.
Full output self-review confirmed all paragraphs, negations, conditional budget,
no-order wording, opt-out, number formatting and test address were preserved in
natural Lithuanian. This is one synthetic adapter example, not broad translation
calibration. USD charge was not independently measured. SMTP/IMAP0 and creation
budget unchanged. No current owner UI/browser or automatic-agent acceptance is
claimed by these tests. Acquisition agents still need their real scoped
registration, transport and captured-mail integration.
