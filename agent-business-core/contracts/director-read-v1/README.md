# Director acquisition reads v1

Additive local owner consultation context over the canonical acquisition capture
and correspondence readers. This extends the existing `chat.consult` worker;
there is no new model runner, controller, Session, CRM or browser-selected tool.
Old chat/operations and acquisition wires remain unchanged.

`PINET_DIRECTOR_ACQUISITION_ENABLED=false` is the default. Enabling requires
complete0028, restricted loopback PostgreSQL, validated private capture/work
registrations, SMTP/voice off, a real Task Session/current owner/grant and each
read's existing Module purpose. Unregistered businesses retain legacy context.
The fixed reads are `acquisition.capture.read` and
`acquisition.correspondence.read`; CLI tools remain disabled.

Each reader retains its canonical consistent snapshot, timestamp and watermark.
The pair is not a single shared database snapshot. Correspondence counts are
synthetic/all_time/capture_only, external_sent=false; unknown discovery, sent,
cost and daily metrics remain unknown. Marketing stop/expiry can retain work
history read permission while capture becomes explicitly unavailable. A
configured reader is not worker health, authenticated research or sending proof.

The server commits a private immutable ContextReceipt with the exact Run/Task,
user/organization/business/environment/site/adapter, source and registration
hashes and canonical prompt SHA256. FORCE RLS plus full-scope FK and SELECT/INSERT
only grants protect receipts. Runtime cannot UPDATE/DELETE them. A protected
consultation is discovered by immutable receipt presence, not mutable Run marker;
marker/pointer mismatches fail closed. Model history omits currently unauthorized
tool answers; owner history surfaces denied/unavailable rather than false zeros.

Final execution pins current User, owner membership, grant, Module and held
Session; a fresh DB clock after awaited purposes checks Session/Module TTL before
accepting output. Lost owner grants discard output but an audited accounting-only
helper can settle that actor's exact claimed attempt as failed/cancelled, retain
first known usage and append at most one terminal event. It accepts no answer,
success or business effect. Unknown usage/cost stays null.

The common worker synchronously rechecks its held Session/capture Module deadlines
at the same final DB clock used for its lease, after all authority waits. Typed
capture reuses that hook for its held Module; expiry rolls back the canonical mail
effect while preserving Task/Run and known zero model calls.

The three SECURITY DEFINER helpers have fixed pg_catalog/public search_path and
no PUBLIC EXECUTE. Their trusted migration owner must have RLS-bypass authority,
so settlement still sees the attempt after grant revocation.0028 upgrade and
startup/bootstrap validate that requirement. **The application role remains
NOSUPERUSER NOBYPASSRLS and never owns these tables/functions.** Partial or unsafe
storage is refused. Bootstrap repairs only complete-schema grants. Downgrade
sets row_security=off before the history guard; populated or RLS-hidden history
cannot silently be dropped.

Private additive endpoints reuse current owner authentication:

- GET `/operator/v2/businesses/{business_id}/director-read`: configuration only;
  health unknown, read_only=true, interactive_cli_tools=false.
- GET `/operator/v2/tasks/{task_id}/director-context`: immutable source/input hash,
  timestamp and the two canonical redacted snapshots, or null for genuine legacy.

No endpoint accepts tool arguments, scope override, model choice, prepared copy
or reviewer claims. The sidecar omits original question/history/instructions,
registration keys and raw mail. `wire.json` contains the exact strict schemas from
`director.interfaces`, SHA256
`af15e859161c3469981dc8f35c97acb2d890dfcec389040fbc3e3eb0fe51ddbf`
(22629-byte canonical Git LF blob). The earlier Windows working CRLF form was
23487 bytes/SHA3167f1b8; schemas are equal, historical working receipt preserved.

[Acceptance and original failures](../../../docs/ACQUISITION_DIRECTOR_READ_QA_2026-10-12.md)
separate source QA, actual model execution, ordinary portal UI and target/public
adoption. This source contract does not deploy the director UI or daily producer.
