# Foundation continuation 0.8

Continues the owner's full-foundation mandate. This checkpoint adds the
executable provider-independent shipping, automation and restore paths;
remaining commerce configuration/source operations and website acceptance
continue. No claim that the whole foundation or production release is done.

Shipment commands bind the paid packed order, immutable measured/individual
parcel plan, full sender, provider account/environment, selected service and
operator cost ceiling. Quote preparation expires locally after 15 minutes;
the provider's own expiry is still unknown. A read-only fresh cost check
precedes the first recorded POST intent. The legacy SP adapter makes at most
one create call. A timeout, restart or lost response requires reconciliation
against a manually supplied carrier order ID with matching sender/recipient
and every parcel. Before-first-attempt cancellation permits a new command.
Existing legacy shipments cannot be replaced by a conflicting command.

SP booking activation requires an actual documented ceiling agreement and
approved service IDs, in addition to credentials. Published SP create facts
contain no final amount or external idempotency reference; this source does
not invent either guarantee. Production read requests use only the documented
API host and an independent private admission. Locker payload mapping must
be confirmed for the selected carrier at connection. No carrier account was
charged and no real shipment created.

All provider PDFs are stored privately with immutable metadata/SHA-256. None
is automatically declared a label merely by list order or filename. Tracking
keeps provider date text and unknown timezone; no invented delivered state.
Operator prepare/execute/reconcile/refresh/cancel and buyer tracking projections
use the same persistent order. API paths start with
`/api/operator/orders/:id/shipment-commands` and
`/api/operator/shipment-commands/:id/{execute,reconcile,refresh,cancel}`.

The transaction outbox has leased dispatch, bounded backoff, five-attempt
dead state and audited operator retry. Stale consumers cannot change a later
lease's acknowledgement/dead state. Confirmed payment/refund/packing events
prepare immutable numbered PDFs. Event-specific customer notification drafts
remain separate from external transport acceptance. `/api/operator/automation`
and `/run`/`:event/retry` require read/operate grants. Worker scheduler runs only
with `COMMERCE_AUTOMATION_ENABLED=1`; production stores also need approved
automation policy. Optional Queue consumer carries only store/environment,
with the same durable dispatcher. Automatic execution of already prepared
shipment commands is separately configured, defaults off.

The [backup runbook](BACKUP_RUNBOOK.md) has AES-256-GCM exact SQLite+PDF backup,
new candidate restore, integrity/FK/count/inventory/journal/hash checks and
all restored stores disabled until provider reconciliation. This prevents a
snapshot taken before a later POST from blindly booking again on restore.
Cloudflare's D1 production restore remains its native export/Time Travel
workflow and is not falsely described as a local SQLite in-place restore.

Browser contract remains compatible with 0.7. `mountCheckout` adds
`initialLines`, `headingLevel` (0 omits its heading), `title`, and
`productTitle(product, language)` for an approved site adapter. Prices still
come from the server. A definitive pre-create 400/403/422 validation response
or stock/product 409 releases the rejected attempt; network/500 uncertainty
keeps its stable identity. PII retention is still pending1h/removed after
recovered creation; order credential in tab storage up to30days.

Explicit `node scripts/dev.mjs --foundation-fixture --port8799` is a separate
test-only store/provider ledger. It cannot be combined with real Stripe/SP
options. Hosted local fixture Checkout is never imported into production.
Actual browser order7EEF5125: LT39.99EUR fixture total → local test payment →
automatic salePDF → pack → full sender →2kg20×20×17 plan → quote799cents →
one registered fixture carrier ID1001 → private PDF/tracking → jobs/packing
document. Buyer downloaded its own PDF;320px operator jobs had no overflow.
No real provider rates, money, mail or delivery claims follow from this fixture.

Native D1 command execution/concurrency/immutability and private R2 provider
document were checked; the actual source Worker Queue dispatched its durable
job consumer. Node tests also cover lost non-idempotent create response,
price-change prevention, wrong reconciliation facts, retry/dead/stale lease,
Unicode documents and encrypted restore. Exact final source/check counts and
dry-run are recorded at the Git checkpoint, not inferred from this prose.
