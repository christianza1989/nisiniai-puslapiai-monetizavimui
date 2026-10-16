# Bounded customer live preview

Wire version: customer-live-preview.v1. The bounded runtime uses the frozen
contract and the maintained Foundation producer. A PreparedPreview remains an opaque retained proof;
it is never a durable URL and is not accepted from a customer request.

| Method | Path | Result |
| --- | --- | --- |
| GET | /customer/v2/creations/{creation_id}/live-previews | Read-only availability, current native context, safe blockers and this Session's latest lease |
| POST | Same collection |202 lease for exact accepted_revision/site_context_sha256/idempotency_key |
| GET | Collection/{lease_id} | Current Session-bound lease state |
| DELETE | Collection/{lease_id} | Explicit close and owned task cleanup |

Requests use ordinary CoreSession authorization,4096-byte body limit and no query
parameters. Only POST accepts a body. Start binds the Results-observed native hash
and accepted revision; it never silently rebases an old click onto new content.
No request accepts an origin, path, port, command, proof, actor, token or TTL.

Availability is a server projection. can_start requires a current exact native
binding without blockers; unavailable state has explicit safe blocked_reasons.
GET never prepares a release/build/preview or starts a server. Runtime must reuse
canonical read-only Foundation context/readiness/media helpers instead of calling
the candidate producer or making the frontend infer admission. Other customers'
leases or busy metadata are never projected.

Lease states are preparing,starting,ready,closing,closed,expired,revoked,failed.
Every lease acknowledges the original Start idempotency_key. Active states must
match the envelope's current execution source; created_at cannot be in its future.
Inactive history can retain its old source with no URL. A current-ready latest
lease also matches availability's current revision and native context hash.
Only freshly verified ready state exposes preview_url: exact
http://127.0.0.1:PORT/ with a valid nonzero TCP port. Inactive, expired, task-done or
invalid-context state must clear it immediately, even before terminal cleanup is
recorded. expires_at is conservative; failure can remove a URL earlier. The wire
also rejects a ready URL expired or over90seconds beyond its envelope observation.

The runtime captures/verifies normal owner/Session/source/native/S6 authority,
prepare through canonical Foundation, then own the existing
withPreparedCandidatePreview callback through guarded studio execution. Canonical
callback120-second and producer150-second caps remain. A private nonce-bound ready
receipt and short heartbeat connect the callback to status. Heartbeat advances
only after successful canonical verification, never merely because a task lives.
No user token is written to readiness, audit, source or log files.

The router lifetime constructs only an in-memory registry. Availability invokes
the fixed Node inspect action and the three canonical read-only aliases; it does
not create the lease directory. POST alone admits a task under the registry lock.
The Node ready receipt is published exclusively and bound to the private nonce,
scope and prepared artifact. The visible callback expires within89seconds; its
own wait timer is cleared when canonical producer cleanup returns or rejects.
The bridge has a139-second conservative end and guarded studio execution149seconds;
the canonical callback120/producer150 caps are unchanged. Three-second private
heartbeats advance only after normal current Session/owner/native/S6/Foundation
verification. Node independently rechecks canonical native/readiness/media and
the heartbeat; an old heartbeat cannot establish current authority.

Same UUID and exact binding returns its original lease; terminal UUIDs never start
another child. Changed source/native/Session cannot rebase or resurrect it. Restart
never adopts an old PID, URL or proof. Unproved crashed/pending locks fail closed.
One active service-wide preview and bounded audit/terminal retention are the local
milestone; no automatic lock stealing or concurrent local D1 ownership is allowed.

The specialized private ledger is artifacts/customer-live-previews. It retains
at most64 original request UUIDs and their ready/terminal evidence. Capacity is
an explicit refusal, not an eviction/restart mechanism. There is no automatic
recovery or cleanup endpoint: an unknown/corrupt/crashed claim stays held for the
owner to investigate using actual process evidence. Neither PID nor user token
is stored. GET projects only records belonging to the current user, Session,
environment and Creation; global contention returns a safe busy reason only.

Explicit close, expiry, authority/source/native drift and API shutdown must close
the exact owned child tree using existing canonical transport cleanup. URL state
never grants renewed authority. Paid runners/external channels stay held; preview
does not approve content, certify a complete site, deploy publicly or promote
full_site_status/launch_status beyond UNVERIFIED.

Shutdown marks the service closing, drains in-flight admission, then joins all
owned tasks through cancellation-safe canonical transport cleanup before DB
disposal in both maintained APIs. Repeated cancellation cannot skip that drain.
Terminal audit precedes releasing the exact claim. Uncertain cleanup retains the
claim and exposes no URL. A new router lifetime creates a new registry and never
adopts a retained URL, proof or process.

Root owns codegen/BFF/UI, including explicit start and ordinary current-ready
new-tab link, and actual SQL/native/process/browser acceptance. The helper owns
source contract and guarded runtime adapter. Wire tests/schema alone establish
neither a running server nor actual session revocation or child cleanup.

Offline validation uses PYTHONPATH=src;tests;scripts from the runtime directory.
The runtime protocol tests mock authority/transport and use isolated private
files; Node tests mock the producer and never open a port. The opt-in
tests/test_live_preview_authority_pg.py is collected by the helper only. Root
must run actual HTTP/RLS/native authority checks, plus the separate real
renderer/current-case/new-tab/expiry/revocation/shutdown acceptance before
claiming runtime adoption. Source delivery and a wire/codegen pass are separate.
