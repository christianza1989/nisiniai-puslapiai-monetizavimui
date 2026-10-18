# Paired private native source compatibility

Base136a8149836162b7a648103f91421e4aa2dd79d9 paired with
public255fea0813bf1aabeaeea2f2de0b29564118f2fc; issue66/comment6206646677.
Exact three implementation paths are in immutable record.json. See
[protocol](../../../docs/PRIVATE_NATIVE_SOURCE_UPGRADE.md).

Root observed409private_intake_anchor_stale during the first normal-owner paired
upgrade, before S6. Original accepted material and native files were preserved;
Root rolled back serving and retained the failed new copy. Actual DB/provider/
customer data/serving/adoption and prior journals remain Root-owned.

New focused positive baseline failed1case/33deselected8.23s:
SHA256bf7e6cf5e7ef4d3a28916b1eb4ad68dcee7a4c6404c13f6e8130330b161a1e1c.
Four source boundaries had conflated original importer provenance with current
execution. Strict additive anchor.v2 now separates both, retains original receipt
and manifest, and verifies current physical importer/network/clean public source
under fresh authority. Existing v1 remains exact. Network drift and drift without
a changed core source remain refusals. No original code, model importer or SQL
migration is modified;0042 exact owner/session/accepted fences remain in effect.

The first post-change focused run had2FAIL31PASS3.34s: two old tests still expected
every public/importer change to be rejected even after an explicit changed core
source. Their original failure log is retained. The revised cases prove the
still-required refusal without that new source; network always remains refused.
These changes are authorized protocol coverage, not weaker approval/S6 tests.

Post-change first focused logSHA256
8474147a5f1998ced69a783400b6a1db2107b2cdea2378d0091a20035786b6af.
First fullsuite collection2ERROR8.53s was a helper invocation missing runtime/tests
on PYTHONPATH; source was not changed for it. Retained logSHA256
891501239a9c5f76e418180c4b55a46a6ffd7ce5b3435a47a9acb9beefc906ee.

## Verification

- `python -m pytest -q agent-business-core/runtime/offline_tests`:
  1991PASS/8skipped/67subtests151.48s, two existing Pydantic deprecation warnings.
  LogSHA256208e322c970ea167ac36cc28e49bdf436c96ec71f7e555ef07ec581ba54562f7.
  Use PYTHONPATH=runtime/src;runtime/offline_tests;runtime/tests and a synthetic
  40hex PINET_CONTROL_SOURCE_REVISION. No database/provider execution.
- Latest paired-upgrade exact replay and later renewal anchoring the original
  import:1PASS/45deselected2.89s after adding those assertions to the existing case.
  LogSHA256e722a3e74ed65cebf838f0911675d4e28be163b55474dfaf57c60570e0945842.
- `node --test content-studio/test/private-native-continuity.test.mjs`:
  9PASS43.97s; synthetic distinct importer calls current maintained modules and
  current observer. SHA256d0ff3c2ff82e87871b6ef11f899ecd42d1696cafda7d06fa148196966634ef1b.
- Existing customer-creation-intake/customer-content-write/customer-content-workflow
  Node suites:78PASS154.99s. Exact initial replay, original artifacts, native writes,
  review, approval and release regressions retain their original gates.
  SHA2567967d12b712ec5de5796a26a7ac678158216d66b2a4b9c2fedc14980840768b3.
- Four changed Python files pass Ruff; diff whitespace clean.0042 Git blob remains
  7e25db7c5c7e9642d07c821e39296aae6be59592, identical to the base.
- `python -m pytest --collect-only -q agent-business-core/runtime/tests/test_private_native_continuity_pg.py`:
  10collected3.66s only:5existing source/owner/original-artifact cases,5new paired
  Git/importer/current-source-S6/original-artifact/network cases. Native collection
  uses PYTHONPATH=runtime/src;runtime/tests. Root executes against dedicated QA DB.

All raw logs are ignored private artifacts. The public companion is a fresh clean
255fea checkout with no source changes. Source tests do not prove an operational
source upgrade. Root must preserve prior failure, use a fresh current old-DB copy
and retained originals, run actual QA, then perform explicit owner intake renewal
before any separate S6/editorial/preview/adoption decision. No customer review or
approval is claimed by this packet.

Rollback is a scoped source revert before adoption. Retain every original/new
request/receipt and all native files, including failed runs. Never rewrite original
importer hashes, reimport the case, change a retained failed UUID or bypass S6.
Main delivery and Root's actual acceptance/adoption require separate events.
