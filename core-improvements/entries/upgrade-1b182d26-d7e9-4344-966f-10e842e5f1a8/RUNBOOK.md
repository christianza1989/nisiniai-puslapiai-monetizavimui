# Native preview migration CASE repair

Root's first actual empty-0044 migration failed before bootstrap or tests with
`syntax error at end of input`. The authorized extracted task-fence DDL has
SHA-256 `306fb7e4af3db08ce1a771a2a48926382d831d951bc554f97a64cd784981c735`.
The failed QA database and original prepare log remain Root-owned and retained.

The generated task fence compares its adapter against a SQL CASE expression in a
PL/pgSQL IF condition. PostgreSQL's condition reader stops at a top-level THEN;
parentheses keep the CASE's inner THEN inside the SQL expression. The two adapter
selectors now use explicitly grouped CASE expressions. The terminal classifier's
selector was already inside coalesce; grouping it is consistent and leaves its
failure-only semantics unchanged. No final delimiter, ownership, quota, model,
role, native binding or output authorization changes.

The behavior follows PostgreSQL's maintained
[PL/pgSQL grammar](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/pl/plpgsql/src/pl_gram.y),
specifically `expr_until_then` and `read_sql_construct`.

## Evidence and checks

- The new committed two-selector regression failed twice before the repair in
  0.57s; private log SHA-256
  `8a0fd184d08195d043750cc73c70e3d4304107400094a915144ae90f078683a5`.
- A local pglast 8.6 parser (PostgreSQL 18.6) reproduces the exact original DDL
  failure. The same DDL parses after only the CASE parentheses; its tail delimiter
  is unchanged. All 11 complete generated function definitions also parse.
- 141 focused direct/native/legacy Episode/High tests pass in 3.98s. Ruff and
  `git diff --check` pass for the two modified Python files.
- The optional parser is installed only under this worktree's ignored
  `agent-business-core/runtime/artifacts/direct-preview-sql-parser`. No runtime
  dependency/manifest or shared Root QA venv was changed. The first manual probe's
  own script-parenthesis typo remains in its private log; corrected CPU proof is
  `artifacts/native44-parser-repair-2.private.log`.

These are local syntax/source checks, not actual PostgreSQL migration, catalog,
RLS, concurrency or model acceptance. Root must retry in a fresh dedicated empty
QA database, then run the native preview and existing regression cohorts. Helper
DB/provider/current-case/serving operations remain zero.

Both original Stage2 upgrade journals and the older consultant repair journal
are unchanged. Root owns their actual migration failure/result events. This
separate repair journal avoids an immutable-event sequence collision.
