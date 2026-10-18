# Reviewed business-source backbone

Issue66 scoped helper transfer6246884066, base653d1bcc66af0a3d77a01af650bd1fdbbb72672c.
This module supplies reviewed source provenance to an already owned registered
Business. Claim/grant remains the ownership path. It creates no Creation, accepts
no Profile/Website, and activates no module, model or channel.

Root composes `business_attachment.schema.upgrade_sql()` into additive0049 and
owns Agent/Config/API/directory/portal integration. Importing the module installs
nothing. The three immutable FK targets are `EXACT_KEYS` (Agent), `NATIVE_KEYS`
(native acquisition), and `CONFIG_KEYS` (each immutable Config's source snapshot).
Config material must use its own stored source id/fingerprint. Agent's current
source pointer changes only atomically with a new Config under Root's CAS/fences.

`service.owned_business(tx,session,business_id,lock=False)` returns portfolio,
grant, Business after current verified owner checks. `transaction_authority(tx,
session,business_id,binding_id=None,writing=False,lock=True)` yields a checked
Binding. With no id it selects the highest sequence before checking live flags;
it never falls back. Reading/containment may inspect stale/revoked/expired history;
writing requires latest, unexpired, unrevoked source and the current enabled exact
grant. The review Session is historical provenance: its later expiry/revocation
does not revoke a30day source. Consumption always uses the current consumer Session.
Imported review Git pin is historical and need not equal today's execution pin.

All writing authorities take the business/environment advisory barrier before
current User/Session, exact Grant and Binding pins, then the consumer's Agent.
Old/read + target/write adoption takes the target's locking authority first;
nested old authority may use `lock=False`. Narrow fixed-search-path definer
functions acquire Grant/Binding share pins without granting runtime UPDATE.
`lock=False` omits the advisory/actor locking pass; its fresh SQL data check still
pins Grant/Binding. Therefore the target business barrier must precede even that
old-source context, otherwise a concurrent old-source revocation can form a lock
cycle with adoption.
RLS exposes current-owner history only. Runtime has SELECT on this table and
EXECUTE on only the three owner-scoped pin/current functions. Internal canonical
JSON/hash helpers have no runtime/public grant. `is_current(tx,binding)` performs
fresh SQL/data only, returning a boolean; no filesystem/Git wait follows it.
Callers separately fence their current consumer Session and execution source.

The admin CLI is explicit and privileged:
`python scripts/business_attachment_admin.py approve|inspect|revoke --input <absolute-private.json> --receipt <new-absolute-private.json>`.
Approval takes an exact existing Business UUID/current reviewer Session, a UUID
request id, current local review `source_revision`,30..2592000 seconds, and a
bounded typed SourcePayload with artifact/knowledge hashes and review references.
Facts/references are data, never executed or fetched by this module. Approval
asserts a trusted operator reviewed those exact hashes; automatic file retrieval
or semantic verification is outside this metadata backbone.

An exact request replay preserves the first row, reviewer and expiry; a new
consumer Session is permitted. A same-UUID changed request conflicts. An exact
historical replay remains possible after a local code update; only a new approval
requires its review pin to equal today's execution pin. Inspect/revoke input pin
is today's execution pin. Revocation uses expected fingerprint CAS and only sets
revoked_at once. Inserts are sequential and SQL fingerprint-verified; updates to
other fields and DELETE are rejected. History must be retained after adoption.

The CLI reserves a new private receipt and status marker, fsyncs prepared output,
rechecks source/consumer/data, commits, then marks committed. A committed-marker
failure is explicit: inspect prepared receipt and current row before retrying.
Standard output contains ids/status/fingerprint only, no source payload or Session.

Source-local verification and Root's composed49/actual adoption are separate.
`tests/test_business_attachment.py` is offline. The opt-in PG suite is retained
synthetic owner/grant/source data only and must use an explicitly selected isolated
0049 database. Operating database, paid/protected runs and channels remain held.

2026-10-18 follow-up evidence: own retained PostgreSQL18.6 at15559, exact composed
ad402cb2f8556218895b16a9334125e7a671691d plus scoped payload alias correction.
Canonical incremental migrations0001..0049 committed successfully. A single
0→head transaction first failed on the inherited `pinet_display_kind_old_probe`
temporary-table collision before0049; reported to Root rather than changing a
foreign installer. Fresh migration is not claimed to pass as one batch.

First real source insert failed because `jsonb_path_query`'s result lacked the
`value` column alias; fixed in this module's `payload_sql()`. Retained run2 had
one PASS then the synthetic fixture's wrong identity issuer blocked User row
locking; issuer corrected to the actual `pinet-customer` contract. Retained run3
had one PASS then missing fresh-QA business SELECT rights; canonical bootstrap
was applied unchanged. Run4 then passed all6 original PG cases in3.91s. These
first failures remain in tool receipts/private synthetic logs, not rewritten.
Final run5 passes11 PG cases in6.48s, adding raw SQL wrong hash, untyped payload,
sequence gap, foreign grant rejection and consumer Session expiry after yield.
Offline19 cases and scoped Ruff also pass. These are source-local checks under
synthetic Git observation; Root still owns current source/0049/actual adoption.
An additional actual CLI run at frozen299773f9c4aab80789616a1d3c6a5aa4ba41ce6b
used real Git observation against own15559: approve → exact replay → inspect →
revoke passed. All4 private status markers were committed and matched receipt
SHA-256, replay preserved expiry, and stdout excluded payload/Session. This is
the synthetic metadata administrative path, not actual-business adoption.
