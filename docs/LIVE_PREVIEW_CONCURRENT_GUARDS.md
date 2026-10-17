# Concurrent native preview guards

The canonical producer and its bounded inspection each have a one-second monitor
that calls the same fixed-scope `stillAuthorized` callback. Browser image/document
GETs do not directly call that JavaScript callback. The two monitors can overlap
the full native context/readiness/media read in `customer-live-preview.mjs`.

One serve invocation now shares only that currently executing read. It clears
the shared promise before completion waiters resume. Each successful waiter then
independently reads the current active claim and heartbeat and checks the original
absolute deadline. A later invocation performs the complete native read again;
a finished permission is never cached. Changed review, media, claim, pulse or
deadline still refuses access. The immutable scope cannot be replaced by another
lease, producer or request through this closure.

The before-context and after-media signal checks, first-refusal diagnostics,
canonical cleanup and unpublished startup-recovery fences remain. There is no
new permission, pending-check grace period, longer heartbeat, renewed lifetime,
renderer, model call, schema or external channel.

The old-source two-monitor-style baseline performs two native reads for the
same overlapping check. That is a reproducible redundant-work finding. It is
not proof that Node overlap caused the separately retained Source219
11.44363-second SQL authority check or 11.4774-second pulse gap. Actual lifetime,
expiry/revocation and browser acceptance remain separate from source regression.
