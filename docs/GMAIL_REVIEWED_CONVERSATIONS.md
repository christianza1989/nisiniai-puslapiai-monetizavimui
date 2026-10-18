# Reviewed requested replies on Gmail conversations

`mail_provider/conversation.py` extends the existing Campaign/Owner Gmail
adapters. `scripts/gmail_conversation.py` reuses the same private CLI arguments,
Vault, owner/source authority and durable output receipts. Existing campaign
commands keep their default adapter. The feature remains off by default; this
source change does not activate a campaign or scheduler.

A private hash-pinned `ConversationPlan` names the exact original campaign plan
and its hash. Each reviewed reply names its accepted parent, authenticated
inbound mail UUID and content/header fingerprint. Only a reviewed question or
interest with action `reply` is eligible. Refusal, OOO, conditional hold,
marketing resume and unsolicited follow-up are outside this command. This is a
trusted operator review input, not an endpoint where model JSON grants sending
rights or claims its own independent approval.

Preparation and both send transactions verify the current owner/grant/source,
plan/expiry, actual Gmail sender, accepted parent, authenticated participants,
exact Case/thread/hash, latest inbound pointer, held current request, suppression
and customer-link policy. The parent plan is historical proof: it remains
available and unchanged; current reply approval does not extend its old send
authority. Incoming subject is retained exactly. Gmail receives the target thread
ID and valid `In-Reply-To`/`References`, following the
[official Gmail thread criteria](https://developers.google.com/workspace/gmail/api/guides/threads).

Each outbound is a new MailMessage in the same Case. One committed intent per
inbound, across reply plans, prevents a second answer by renaming the plan or
letter. The existing account lock and UTC-day count include replies and other
campaign intents, bounded to at most 50 planned sends per account/business/day.
Plan-specific limits remain bounded. Rejected, unknown and interrupted intents
are not blindly retried. Known acceptance survives a post-send source fence,
retaining exact provider IDs. The receipt records whether the observed thread
matches the requested thread; acceptance alone is not delivery.

Receiving cannot turn a terminal or unknown contact state into `hold` or `ready`.
Replaying an older imported message cannot move the latest inbound pointer
backwards. Neither a reviewed answer nor translation resumes marketing. Continue
synchronization from the current accepted reply. This reads a bounded known
thread, not the whole mailbox. Plans, OAuth material and conversations stay private.

Optional `purpose=owner_acceptance` restricts every recipient to the actual Gmail
sender. Fresh initial and requested-reply records retain `synthetic=true` internal
provenance, so default campaign statistics exclude the trial. Parent/reply purposes
must match. It cannot promote old self-test/acquisition captures, use `.test`
addresses as real mail, or send to another recipient. Default `purpose=campaign`
preserves real-mail provenance. Both use the same transport, quotas and records.

Ordinary Case/mail views, original text and the source-bound LT display projection
are shared. New text still needs the existing approved translation Task and actual
completion; missing translation is never fabricated.

Verification retained two failing receive regressions before repair. The final
isolated suite passed 53 checks: 38 offline and 15 retained PostgreSQL cases with
inert Gmail HTTP. It covers same-Case/thread headers, concurrent single POST,
changed inbound/stop/quota fences, shared initial/reply quotas, unknown outcomes,
no retry, parent plan pins, purpose isolation and post-send receipt preservation.
Actual Gmail transport and UI acceptance of this new command remain separate.
