# Unpublished local preview recovery

The customer lease remains the only owner and idempotency boundary. A slow fresh
authority observation can outlive a three-second heartbeat before the canonical
producer publishes Ready. That refusal still stops the producer immediately.
One sequential startup retry is allowed only after all of these fences:

- The trusted transport has joined its child and callback cleanup. The lease is
  still starting, current and owns the original active claim.
- No Ready file exists, including malformed or ambiguous evidence. The first
  immutable guard diagnostic is exactly a before-context or after-media
  `heartbeat_expired` refusal with a nonpositive bounded pulse margin.
- The Node bridge has published an exclusive private `startup-closed` witness
  after the canonical producer's settled rejection. It binds the lease, instance,
  nonce, request, scope, prepared proof, first diagnostic hash and original
  deadline. Failed or uncertain cleanup cannot provide this witness.
- The lease's previous authority task has been drained, including an already
  finished exception or cancellation. A completely new successful authority
  observation is then required; its ten fresh checkpoints are unchanged.
- The same current/claim/no-Ready/evidence fences pass again after that check.

The witness establishes canonical producer cleanup, not whether the later CLI
exit was natural or forced. A process terminated before writing the witness
cannot authorize recovery. A process terminated afterwards has already completed
the cleanup attested by that witness; the transport must still join it.

Both attempts use the same lease, scope, UUID, nonce and prepared release. Internal
`attempt_index` is limited to zero and one. Public request and response schemas
are unchanged. No terminal lease is reopened and the first diagnostic/witness
are never overwritten. A second failure is terminal.

One outer 149-second serve deadline includes the first authorization/spawn,
cleanup, draining, fresh authorization and optional second attempt. The Node
bridge also receives one shared absolute deadline at first serve plus 120 seconds.
This is deliberately stricter than its existing 139-second maximum and prevents
another attempt from renewing the canonical 120-second inspection window. Ready
expires at the earlier of that shared deadline and Ready plus 89 seconds. The
three-second pulse and 3100 ms upper margin are unchanged.

There is no retry after Ready, actual denial, close, expiry, lost ownership,
malformed evidence or unproved cleanup. This startup-only recovery does not
guarantee post-Ready liveness under arbitrarily slow SQL. A source regression
PASS is separate from actual database/browser lifecycle acceptance and does not
approve site publication, business claims, paid workers or external channels.
