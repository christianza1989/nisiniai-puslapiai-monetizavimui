# Bounded customer live preview

Wire version: customer-live-preview.v1. This contract is defined before runtime
and frontend integration. A PreparedPreview remains an opaque retained proof;
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
Only freshly verified ready state exposes preview_url: exact
http://127.0.0.1:PORT/ with a valid nonzero TCP port. Inactive, expired, task-done or
invalid-context state must clear it immediately, even before terminal cleanup is
recorded. expires_at is conservative; failure can remove a URL earlier. The wire
also rejects a ready URL already expired at its envelope observation time.

The runtime will capture/verify normal owner/Session/source/native/S6 authority,
prepare through canonical Foundation, then own the existing
withPreparedCandidatePreview callback through guarded studio execution. Canonical
callback120-second and producer150-second caps remain. A private nonce-bound ready
receipt and short heartbeat connect the callback to status. Heartbeat advances
only after successful canonical verification, never merely because a task lives.
No user token is written to readiness, audit, source or log files.

Same UUID and exact binding returns its original lease; terminal UUIDs never start
another child. Changed source/native/Session cannot rebase or resurrect it. Restart
never adopts an old PID, URL or proof. Unproved crashed/pending locks fail closed.
One active service-wide preview and bounded audit/terminal retention are the local
milestone; no automatic lock stealing or concurrent local D1 ownership is allowed.

Explicit close, expiry, authority/source/native drift and API shutdown must close
the exact owned child tree using existing canonical transport cleanup. URL state
never grants renewed authority. Paid runners/external channels stay held; preview
does not approve content, certify a complete site, deploy publicly or promote
full_site_status/launch_status beyond UNVERIFIED.

Root owns codegen/BFF/UI, including explicit start and ordinary current-ready
new-tab link, and actual SQL/native/process/browser acceptance. The helper owns
source contract and guarded runtime adapter. Wire tests/schema alone establish
neither a running server nor actual session revocation or child cleanup.
