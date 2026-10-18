# Live preview completion and natural expiry

A joined successful serve process is not proof that its published lifetime
expired normally. The canonical Node bridge returns exactly
`{"version":"customer-live-preview-completed.v1","state":"expired"}` after its
recorded timer. The Python lease driver now requires that exact envelope, an
accepted Ready state and its recorded expiry no later than the current clock.
There is zero early-EOF tolerance; the existing one-second URL projection cutoff
is a separate conservative display rule and remains unchanged.

An early successful EOF, missing/extra envelope fields, wrong state or completion
without accepted Ready becomes `failed/live_preview_process_finished`, never a
normal expiry. The URL disappears. Since the canonical transport already joined
the producer/callback cleanup, this known failure can release its exact claim.
Unknown cleanup retains the existing unavailable/held-claim behavior. Owner close,
revocation, expiry projection and shutdown stop reasons cannot be overwritten by
a late completion.

Original source baseline:8FAIL/1PASS across malformed completion, early valid
completion before/after Ready, and exact elapsed completion. The failures are
retained; they demonstrate this classification defect independently of the
actual before-Ready heartbeat refusal on Serving5fdf. No heartbeat, permission,
timeout, model allowance or runtime channel is changed. Current actual lifecycle
acceptance remains required before closing the older preview upgrades.

Root verification:126 related offline cases pass, including completion, runtime,
monitor cadence, pulse publication, startup recovery, inspection authority and
studio start cadence. The new9 completion cases pass again after the fixture
import cleanup; scoped production/new-test Ruff passes. Independent read-only
review found no new actionable P0-P2 in the completion hunks. These checks prove
classification and cleanup semantics; they do not accept the live lifecycle or
erase the retained before-Ready heartbeat failure.
