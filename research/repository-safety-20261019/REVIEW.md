# SQLite auxiliary-state handoff guard

Issue: https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/226
Source main: d0d08be67033e29457367ddcc2ca5eeccdf0230c.

Madbeauty archival selection exposed a shared scanner gap: a candidate SQLite WAL,
SHM and local .secret file were accepted by the filename guard. All three were
excluded before the first Madbeauty source commit/push. No private payload is
included in this reproduction.

The new end-to-end CLI test creates six synthetic filenames: .sqlite-wal,
.sqlite-shm, .sqlite.secret, .sqlite3-wal, .db-journal and .secret. Before the
repair, four existing tests passed and the new test failed: the scanner returned
0 when the blocked candidate set required 1. This original failure is preserved
as this sanitized account rather than a raw local-data artifact.

The repair extends the existing canonical filename rule. The same test checks
working candidates and exact staged blobs after deleting the working copies;
safe source and .env.example remain accepted. Relevant final validation is
`node --test scripts/repository-safety.test.mjs`: 5/5 pass. Scope review and
credential-pattern scanning remain separate safeguards; this does not claim
general customer-data detection or adoption on other PCs.

An intermediate test-fixture attempt also called working-file mode after removing
tracked working files. That mode cannot read missing files; the test was corrected
to exercise exact staged mode at that point. The six blocked staged filenames and
the candidate assertions remain required; no production guard was weakened.

Rollback: revert the scoped scanner/docs/test change. No runtime, provider,
database, deployment, dependency or site-content behavior is changed.
