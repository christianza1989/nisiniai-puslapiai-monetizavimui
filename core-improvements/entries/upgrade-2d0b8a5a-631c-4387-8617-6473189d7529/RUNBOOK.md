# Native editorial review bridge source handoff

Base: `7eb21e241625d46fb8a0770db94f12be4fd931d4`. Exact five shared
implementation paths are immutable in record.json. API mounting has separate
upgrade93e6d016. See [protocol](../../../docs/EDITORIAL_REVIEW_BRIDGE.md).

The two explicit authenticated actions record supplied actual review evidence or
approve an exact native batch through the canonical model. Current Session,
owner/S6/source/candidate/host and idle Creation/GUIDE guards run throughout.
Actor comes from the server user. Immutable before/dispatch/applied/rejected
receipts bind actor, source, context and page pins. Exact replay is read-only;
uncertain dispatch cannot execute again. Review/approval never performs release.

## Preserved failures

- Missing bridge import:1FAIL0.17s, private log SHA256
  `0580248ed4b8dbe38c1a9001d11a059740108501473f93e0dff92e1cdd02ee47`.
- Expanded Python fixture:1FAIL32PASS2.24s, log
  `783f75a0c60d745018d4c0bc6d728486f3472e3fb2983e58a8465dbefb0de203`.
  Its ASGI transport used a nonlocal host and disabled control configuration.
  Only the fixture was corrected; maintained SafeRoute400 behavior is retained.
- Initial Node fixture:1FAIL4PASS16.10s, log
  `43334d65861633897f3cd0d5409cee73d76372217278770f1f0e93c7dc618291`.
  Canonical V2 validation refused missing synthetic operatorName; diagnosis log
  `af5c40ace471fd42bd5d736a40171536b4ef26a689084576991f00736696cfee`.
  Only synthetic setup facts changed; production fact/readiness gates remain.
- Edited-draft history:1FAIL, log
  `63016e66e495d51618338e2b42fce34504607cbc9c2ec74cee1b5789bf6df52c`.
  The new receipt projector hashed cleared current approval instead of the old
  immutable published snapshot's own approval. Projector corrected without
  changing that snapshot, canonical model, content or facts. Targeted PASS3.20s,
  log `66ea95f03de05f81e9ed056b2f38cd28f55c3b6ba6d4d9959e4d14945ddc67cd`.

## Verified source

- `python -m pytest -q agent-business-core/runtime/offline_tests`:
  1951PASS,8skipped,67subtests,107.98s. Existing two Pydantic deprecation warnings.
  Log SHA256 `6844be5e862bb4e17e8a62df05b964f428414969d0fadc5585be07107ed6fce0`.
- `node --test content-studio/test/customer-content-workflow.test.mjs content-studio/test/customer-editorial-review.test.mjs`:
  48PASS108.49s, including9 new cases. Log SHA256
  `58b5598136f4e856726ec04ca471124b8307f0dda7bab4e67ee6a967441c5fa6`.
  Tests cover exact identity/pins, source/link/media gates, complete atomic
  refusal, receipt replay/uncertainty/corruption/ownership and retained history.
- Generated standalone contract matches actual isolated route/DTO schemas.
  Both central APIs mount exactly the two new routes. Eight changed/new Python
  files pass Ruff. Native HTTP/RLS test module collects6cases without execution.

Use maintained Python dependencies with PYTHONPATH=runtime/src;runtime/offline_tests;
runtime/tests and a synthetic40hex PINET_CONTROL_SOURCE_REVISION for offline QA.
For native collection use runtime/src;runtime/tests. Logs remain ignored private
artifacts, not Git payload. All Node fixtures use isolated synthetic directories.

## Integration and rollback

Root supplies the dedicated empty PostgreSQL QA database and owns actual6case
execution, operational current-draft inspection/evidence, portal and serving
adoption. Root's separate restored0042/0044 compatibility repair is not duplicated
here. Foundation peer files and frozen S42 journals are untouched. Existing
Foundation authenticated release remains the only release path. Full-site and
launch remain UNVERIFIED; source tests are not actual DB or deployment acceptance.

Revert this scoped source packet before adoption if needed. Retain all durable
operation evidence and historical reviews/approvals/releases. Never clear facts,
overwrite operation receipts, steal a case lock or retry an uncertain dispatch.
Main merge and actual adoption require separate evidence/events owned by Root.
