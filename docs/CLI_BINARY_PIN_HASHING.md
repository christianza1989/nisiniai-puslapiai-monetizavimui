# Fresh bounded CLI pin hashing

The creation, customer-text, owner-consultation and workspace-team adapters use
one maintained `file_hash.sha256_file` helper for their executable pin checks.
Every invocation opens the configured file afresh, reads at most one MiB per
read and hashes all bytes through EOF. There is no path/mtime/digest cache and
no change to the accepted SHA-256 value, case, comparison or pin configuration.

This replaces only four whole-executable `Path.read_bytes` allocations. Existing
configuration/path/time/model guards retain their order. Creation, customer-text
and consultation preserve their propagated read failures; team readiness still
converts OSError to false. A partial digest is never returned after a failed
read. The file closes on success and failure. Other small JSON, image, source
and trace hashing paths remain unchanged.

The one-MiB request bounds per-read allocation; it is not an exact process-RSS
claim. Hashing remains synchronous at the same admission/execution checkpoints.
This memory repair does not establish a latency bound, binary replacement
atomicity, model quality, permission, runtime adoption or preview stability.

## Original evidence

Root reported an actual private-loader MemoryError on the 341,312,816-byte
installed CLI and a successful separate streaming-loader recovery. This source
packet does not rewrite or claim to reproduce that operator run.

On unchanged canonical source `07d8e577f9df78d7d5057cd625004a4d6d9f180a`, a
synthetic guard forbidding the whole-executable allocation caused all four
canonical callers to fail MemoryError: **4 FAIL, 24 deselected, 1.82s**, log
SHA256 `1fd0088bdc26a8049894e6e49e196be62b12704f5737b3c49a0004badeb07dad`.
The fixture uses a temporary inert file and a mocked consultation transport;
it does not dispatch an executable or contact a provider.

After the repair the focused run passed **28 tests, 1.51s**, log SHA256
`c0e68d82e88b40ed5c1b805a1c84dbd45b84eb493f8f2a8c879062e59a908ea5`.
It covers match/mismatch, changed binary and changed expected pin across fresh
invocations, read errors, disabled-runner short circuits, real file chunk
boundaries and interrupted reads. A virtual 341,312,816-byte stream enforces the
one-MiB allocation guard without materializing the full file, and compares its
digest to an independent 64-KiB SHA-256 feed. These are source/mock checks;
actual installed-binary/operating-process adoption remains Root-owned.

Final related regression: **135 PASS, 7 explicitly deselected, 5.19s**, log SHA256
`03c052d3adfaca1e19e0f281ec8c4075e385f97b7707b9b709edbe4a788291c2`.
The seven skipped cases start actual inert child processes and are outside this
source-only packet; their transport is unchanged. Existing unreadable-binary
readiness injection now targets `Path.open` rather than the removed whole-file
reader, with its original false-readiness assertion retained. Ruff passed after
removing the customer-text adapter's now-unused hashlib import. AST comparison
proves the four callers differ only in the pin digest call and necessary imports;
guards, comparisons, exceptions, argv, time limits and all other hashing remain.
