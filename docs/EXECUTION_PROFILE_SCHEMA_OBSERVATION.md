# Fresh execution-profile catalog observation

Each `execution_profiles.schema_state` invocation performs one fresh catalog
statement. Its CASE expression preserves the three existing outcomes:

- Missing profile table and no non-internal capture/fence triggers: `absent`.
- Missing table with either named non-internal trigger anywhere: `invalid`, even
  when the trigger is disabled or belongs to another relation.
- Present table: `ready` only with the original forced RLS, exact seven enabled
  trigger matches and four validated foreign keys. Otherwise it is `invalid`.

The absent branch deliberately has broader trigger predicates than the ready
branch. Do not add the ready branch's relation or enabled filters to it.
The one SQL result is nullable boolean: NULL is the valid legacy absent state,
true is ready and false is invalid. No schema result is retained between calls.

`validate_attempts` still observes schema independently before profile/history
validation and after it. Single-attempt, admission and stored-history callers keep
their existing APIs and typed failure rules. No profile/model, role, permission,
deadline, migration, RLS policy or private-current checkpoint is removed.

The former two round trips inside one checkpoint become one atomic catalog
snapshot. A schema change after that statement still requires the later fresh
observation or fails at the intervening profile read. This is not a schema cache
and does not promise a three-second authority latency.

## Original evidence and verification limits

The Source219 baseline production file SHA256 was
`f83109de53c9cebff029c637efbb10f8516931e09a81e5b983bf6f7a419d36a6`.
The new regression produced **8 FAIL, 54 PASS, 6.43s** before the production edit;
log SHA256 `058d1366b522ece16ee94ae431e6abd6175c87db05d5ca9a9e3bd3fc529b105c`.
All eight failures concerned query counts. The full Authority fixture retained
ten private checkpoints, two material phases and one native output, with 136
modeled Tx calls before the fusion.

The focused changed-source run passed **62 tests, 7.39s**, log SHA256
`0722895f94c9176423dd35735e8567a00f7ec54aea1d196ef552b4be6462d40e`.
It executes canonical catalog SQL over SQLite in-memory modeled PostgreSQL
catalogs, and the real Python Authority graph over modeled SQL. These are source
regressions, not actual PostgreSQL planner, catalog, RLS or serving acceptance.
One schema observation uses one statement; the same full Authority fixture uses
132 Tx calls with all ten checkpoints/two material phases/one native output.

The first broader run retained **1 FAIL, 273 PASS, 17.23s**, log SHA256
`c38da5cdfa143060ef35511a4503f60b975a069371e6a0248979a3a7bf1f4c2e`:
the existing profile/catalog bound still expected 10. Its updated assertion now
requires exactly two profile reads and four catalog reads, totaling six, while
retaining all original material/private-selector/native checks. Final related
regression: **274 PASS, 17.31s**, log SHA256
`16f16e721841e1fa2b2f559ef10dfe7e06a194b52d0d7e73a3fee633ad06b06c`.
Ruff passed after one fixture-import F811 annotation in the new test. AST/source
comparison proves the other production functions, both schema invocation sites,
all existing PostgreSQL tests and both exact catalog predicate bodies unchanged.

The added PostgreSQL test counts actual statements on its own restricted
connection over two consecutive `schema_state` calls. Root must execute it and
the existing malformed-schema/High/legacy cases in an agreed isolated QA window
before adoption. It was collected only: **1 test, 0.91s**, log SHA256
`d5ce51a1b93b56cc026f6c03ba180bd2e4e171328b72744ebf5779a07a426188`.
This helper does not run PostgreSQL, use the operating DB,
restart API/frontend processes or certify current preview liveness.

Setup also encountered host OOM and bundled PowerShell CoreCLR/paging-file
failure. The failed optional companion target was absent and unregistered, so
no deletion was needed. The existing frozen companion was used read-only after
a successful paired freshness gate. Host failures are not source-test results.
