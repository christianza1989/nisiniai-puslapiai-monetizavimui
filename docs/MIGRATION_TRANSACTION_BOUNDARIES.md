# Canonical migration transaction boundaries

Root reopened this shared repair under issue66/comment6247443651. Helper branch
`codex/migration-transaction-boundaries-20261018` starts at
911c6e611648584a33e960a082bffcf4ec9c275f. Scope is migration `env.py`, one new
retained regression suite, this document, own upgrade and WORKSTREAMS append.
Individual installers, operating/native databases, paid calls and source corpus
are outside this repair.

## Failure and cause

The original fresh `python -m alembic upgrade head` failed before0049 with
`DuplicateTableError: relation "pinet_display_kind_old_probe" already exists`.
That first failure remains recorded in the backbone handoff and original tool
receipt. Incremental revision-by-revision CLI calls succeeded, which isolated the
boundary problem without changing an installer.

0047 and0048 both use `mail_view.task_schema.probe_sql()` and its same-named
temporary tables with `ON COMMIT DROP`. Canonical `env.run()` configured Alembic
with its default whole-series transaction, so0047's probes still existed when
0048 attempted to create them. This is not stale customer data or a missing
schema prerequisite.

Installed Alembic's `EnvironmentContext.configure` documents the
`transaction_per_migration` option. Its `MigrationContext.run_migrations()` wraps
each revision with `begin_transaction(_per_migration=True)`; the flag determines
whether that is a real transaction or the outer series owns it. Setting it to
True in canonical `env.py` commits each successful revision and drops its probes
before the next installer. No frozen installer, probe name or constraint was
rewritten.

## Atomicity and retry contract

Each individual revision remains atomic: its DDL, data and version change commit
together, or roll back together. An upgrade batch can now preserve earlier
successfully committed revisions when a later one fails. Operators must inspect
the actual `alembic_version`, repair the failing prerequisite/source and rerun
the canonical upgrade. Do not stamp past a failure, manually replay completed
revisions, or assume the entire batch rolled back.

This does not make arbitrary external side effects transactional, provide a
destructive downgrade, or admit runtime/paid work. Root's held48→49 upgrade is
still one atomic revision; actual operating adoption remains Root-owned.

## Retained actual PostgreSQL proof

On2026-10-18 the new two-case suite passed in16.89s against cached PostgreSQL18.6
on helper15559. Only two new empty databases were created; none was dropped:

- `migration_tx_qa_2d4ee6f9bfa4401abadc19e09173fe8c`: one actual canonical CLI
  invocation reached `0049_existing_business_agents`. A second `upgrade head`
  preserved all96 public table full-row hashes/counts and5154 catalog records
  covering columns/defaults, relations/ACL/RLS, functions, constraints, indexes,
  triggers and policies; sequence state also matched. Installer bytes matched
  before/after.
- `migration_tx_qa_4109052b33084e088b22422479d5c5e8`: a synthetic two-revision
  chain used an exact copy of the canonical environment. Both installers reuse
  an `ON COMMIT DROP` probe. The second deliberately failed after DDL and data
  changes: version/row from the first remained, second table/rows were absent.
  Changing only private fixture control data and rerunning unchanged installer
  bytes completed the second revision exactly once.

The tested canonical environment SHA-256 was
`3c56ebd190fa20d5564c70284cea7521514e8874a48f6d629c33047ed3bfb7d9`.
The synthetic second-step CLI failure is expected evidence inside the passing
atomicity test. Original baseline failure was not rerun or overwritten. Private
identity manifests, CLI logs, per-command exit/hash receipts, catalog/row proofs
and JUnit remain under the helper's ignored
`content-studio/tmp/migration-transactions-proof/` and
`content-studio/tmp/migration-transactions-fixed-run1.*`.

One existing Alembic `path_separator` deprecation warning was emitted while
reading configuration. It did not affect either test; no unrelated configuration
or dependency change is included. Disk guard passed before the batch; no cleanup
bypass was performed.

## Reproduce safely

Use a loopback-only dedicated administrative PostgreSQL cluster with an existing
restricted `pinet_runtime` role and permission to create databases. Set
`PINET_MIGRATION_QA=retained-isolated`, explicit private
`PINET_MIGRATION_QA_ADMIN_URL` and an absolute ignored
`PINET_MIGRATION_QA_ARTIFACTS`, then run from runtime:

```text
python -m pytest tests/test_migration_transactions_pg.py -q
```

The test generates new database names and retains all proof/history. It never
reuses or deletes a database. Without the explicit QA flag the cases skip. Do
not point the test at an operating cluster. Normal application channels need not
run for this regression. Source-local proof, reviewed merge and operating
adoption are separate results.
