# Private backup and recovery

Node stores: `node scripts/backup.mjs create DB KEY_FILE OUTPUT_DIRECTORY
PRIVATE_STORAGE`. KEY_FILE is a private 32-byte random encryption key, backed up
separately. Never commit it. The command uses SQLite's online backup API, reads
the file manifest from that exact snapshot, checks every PDF hash, and produces
an AES-256-GCM authenticated envelope containing DB plus private files.

`node scripts/backup.mjs restore BACKUP KEY_FILE NEW_DIRECTORY` refuses any
existing target directory. It restores SQLite bytes directly; it does not insert
order lines again or retrigger stock reservations. Integrity, foreign keys,
table counts, inventory, journal grouping and all PDF hashes are checked.
Every restored store is then disabled. `RESTORE_VERIFIED.json` records the
source hash and candidate state. The original DB and running runtime are not
changed. A failed restore stays a separate candidate, never promoted silently.

Before re-enabling a candidate, reconcile provider facts since the backup:
Stripe sessions/payments/refunds and financial sources; carrier bookings by
actual IDs; unknown first attempts and unresolved customer notifications.
A backup predating a POST cannot prove that the POST did not later happen.
Do not activate automatic jobs until those records are reconciled. Retain
numbered document and migration history; no reset or reuse of invoice numbers.

D1 production: use the native Cloudflare export/Time Travel workflow against
the explicitly selected database. The local SQLite envelope is not claimed
as an in-place D1 restore. Download an export into private runtime storage,
retain the matching R2 PDF manifest/objects, verify hashes, and perform a
candidate restore drill before production admission. Time Travel's documented
retention depends on the account plan; check it at deployment. No remote export,
restore, R2 lifecycle change or paid resource creation ran in this workstream.

Primary references checked 2026-10-12:
- https://nodejs.org/docs/latest-v24.x/api/sqlite.html#sqlitebackupsourceDb-path-options
- https://developers.cloudflare.com/d1/reference/time-travel/
