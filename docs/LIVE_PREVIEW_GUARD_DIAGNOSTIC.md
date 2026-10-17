# Private first refusal from the Node live-preview guard

The fixed live-preview bridge retains at most one private
`artifacts/customer-live-previews/<lease_id>.guard-failure.json` receipt when its
existing `authorized()` callback first refuses. The receipt is diagnostic only:
no API/wire/request option, public error detail, permission, source adoption or
runtime state is inferred from it. Root owns actual timing and serving acceptance.

The public callback still returns false and the canonical producer still returns
`authorization_revoked`. Every original claim binding, heartbeat shape/binding,
safe integer expiry, expired/future pulse, hard deadline, current native context,
readiness and current media check remains. Before-context and after-media signal
checks both remain. Heartbeat3seconds, inspection20seconds, callback120seconds,
producer150seconds and the existing conservative bridge139seconds are unchanged.

The exact receipt fields are:

| Field | Meaning |
| --- | --- |
| version | customer-live-preview-guard-failure.v1 |
| lease_id | Validated UUID of this owned invocation |
| scope_sha256 | Digest of its fixed scope |
| stage | claim, heartbeat, context, media or deadline |
| code | Fixed/allowlisted reason; never arbitrary error text or code |
| checkpoint | before_context or after_media signal checkpoint |
| observed_at | UTC ISO timestamp captured at refusal |
| elapsed_ms | Monotonic elapsed time from bridge start, bounded0..150000 |
| pulse_margin_ms | Bound pulse expiry minus refusal time, bounded-150000..150000; null when no safely bound integer pulse was observed in that signal check |

Claim reasons are claim_read_failed, claim_shape_invalid and
claim_binding_mismatch. Heartbeat reasons are heartbeat_read_failed,
heartbeat_shape_invalid, heartbeat_binding_mismatch, heartbeat_expiry_invalid,
heartbeat_expired and heartbeat_expiry_unbounded. Deadline uses
preview_deadline_elapsed. Context uses context_check_failed,
foundation_preview_content_blocked or an explicit allowlisted canonical
Foundation/writer code. Media uses media_check_failed, media_unavailable or
foundation_current_media_invalid. The code allowlist is source-owned; regex-valid
customer strings are not accepted as diagnostic codes. Error-code getters are
handled defensively and cannot override the original refusal.

Nonce, token, prepared proof/artifact hash, customer content, host/path, raw error
message, stack or stderr are never copied. The receipt is bounded to a small
fixed shape (tests require less than1024bytes). Pulse margin uses the actual
sample seen by the refusing guard, even if another process refreshes the pulse
before publication. It must not be reconstructed from the latest heartbeat file.

Publication reuses the existing private exclusive publisher: temporary wx/mode600
file, fsync, exclusive atomic hard link and temporary-file cleanup. A single
shared promise admits at most one attempt per invocation, including concurrent
guards. Existing receipts are never overwritten, even by a later invocation for
the same lease. There is no continuous log, retry, replacement or history rewrite.

The refusal waits at most100ms for best-effort publication; the diagnostic timer
is always cleared. Errors, existing-file conflicts, stalled writes or diagnostic
construction failures cannot permit or replace the original false result. An
underlying asynchronous filesystem request may finish later; it still uses the
same exclusive destination and cannot overwrite a first receipt. There is no
renewal or extension of an expired heartbeat while diagnostics are written.

Successful guards create no diagnostic. Absence is not proof of a successful
guard: publication may fail or be interrupted by owned cleanup, Python authority
may revoke before the Node guard runs, or a canonical check outside this callback
may fail. Root must correlate the first receipt with actual private task/source/
pulse timings; a fresh last pulse does not disprove an earlier expired sample.
Helper validation is pure/mocked Node only and establishes no real producer,
DB, browser, current-case or serving adoption.
