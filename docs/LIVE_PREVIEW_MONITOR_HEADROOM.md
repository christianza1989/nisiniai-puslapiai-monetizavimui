# Live preview monitor headroom

The retained actual5fdf startup check failed before Ready. Its full fresh
Authority.verify calls included176 direct SQL calls and took5.320/7.288s;
a separate quiet restricted-role full capture/verify took1.45242s/182SQL.
The existing fast monitor starts at0.2s intervals and subtracts the full check
duration, so any slower check leaves only a zero-delay yield before the next
expensive graph. This is a concrete no-idle condition, not proof of the entire
observed latency cause.

Only the fixed live-preview serve call now opts into completion-relative0.2s
pacing. The existing finishing Event makes that idle interruptible at EOF.
Every next callback reconstructs current authority; there is no pulse during
the gap, no completed permission reuse and no overlapping catch-up checks.
The3s renderer heartbeat,149s operation bound, entry/final authorization,
repeated-cancellation drain and owned cleanup remain unchanged. Unrelated
default and fast start-paced calls retain their behavior.

This bounded change provides database/scheduler headroom; it cannot compensate
for a single fresh check that still exceeds the heartbeat. Offline fake-clock
checks prove the selected pacing and original behavior, not actual stability.
Require representative collection/detail polling plus native HTTP/Chrome,
close, expiry, revocation and application cleanup on a clean source before
closing the older preview acceptance upgrades. Preserve the original failure
and report the observed new latency and pulse gaps rather than assuming a cure.
