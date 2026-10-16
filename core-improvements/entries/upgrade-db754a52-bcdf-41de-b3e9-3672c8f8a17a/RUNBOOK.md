# Customer live-preview wire first

Exact base8cdf8d99c5e548fa27662f84a34c93d00809be38/public255fea0813bf1aabeaeea2f2de0b29564118f2fc.
Issue66/comment6224996410 reserves new source; Root approved observed-context start,
read-only availability and central router/shutdown scope before wire freeze.

Only the new strict wire and standalone contract generator are shared paths in
this upgrade. Generated OpenAPI, pure tests and docs accompany them. Runtime lease
and Node bridge are a later scoped packet; no router is mounted or server started
by the wire commit. See docs/CUSTOMER_LIVE_PREVIEW.md.

Baseline missing-module1FAIL0.31s, private logSHA256
03950912bd455a34a96b35394e6da84d1be8edbc313a0adda0e95c897ca29d29.
Initial DTO run2FAIL56PASS0.41s found Pydantic LiteralTrue coerces numeric1 before
an after-validator. An explicit BEFORE validator now rejects non-boolean input;
no test expectation was weakened. Its private log remains retained. A subsequent
Ruff import-order finding was corrected in the new test file only.

117 pure wire/existing Foundation/candidate-preview tests passed0.82s, one existing
deliberate invalid-UUID serializer warning. Tests cover strict observed context,
unknown authority/proof/path/origin fields, loopback ports/format, ready-only URL,
expiry in both envelopes, no launch/deployment promotion, availability reason and
owned-lease shape, bounded response fields and exact standalone schema snapshot.
No DB, preview/server process, browser, provider or actual customer case was used.

Root consumes the exact Git commit and Git-blob SHA256, not a platform-normalized
working-file hash. Wire/model version and paths are frozen before frontend
codegen; later schema changes require coordinated new verification. This wire
commit is not actual runtime acceptance or adoption. Preserve original opaque
proofs, expired-session refusals and immutable failures; no history is migrated.
