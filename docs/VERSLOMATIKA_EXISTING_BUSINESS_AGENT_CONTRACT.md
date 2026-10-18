# Existing business and agent attachment contract

Owner assignment2026-10-18: finish account attachment while another chat builds
the dealer site. Root owns integration, business attachment/model/migration,
customer API, team projection and portal. Implementation remains OPEN.

## Identity and compatibility

The existing reviewed claim path creates BusinessGrant. It remains the only
ownership path; a host string, public project or uploaded JSON does not grant
ownership. Registered Business UUID/siteId/host remain stable.

An external business source binding records a genuine reviewed immutable source
snapshot under that exact current owner/grant/site. It has sequence, material
fingerprint, source/artifact/knowledge hashes, reviewed reference, expiry and
one-way revocation. It is not an accepted Creation or a Website/Profile admission.
Latest is selected before revocation/expiry, so an older binding cannot revive.

The existing Agent/Config tables remain canonical. Agent provenance is exactly
one of the existing complete CreationRegistration identity or a complete external
business binding. Nullable Creation-specific fields and an external-binding FK
are protected by a SQL XOR and full composite external identity FK. No legacy
row's identity, stored fingerprint, Config hash or attempt history is rewritten.
Imported source revision/hash is distinct from local saved/execution Git pins.

An external Agent keeps its UUID across approved source updates. Only its current
source id/fingerprint pointer may change, atomically with exactly the next Config
revision. Each external Config independently retains its own source id/fingerprint
and hashes that snapshot, including its base registration fingerprint. Historical
Config1 therefore stays valid after Source2/Config2. Source adoption names the
exact target id/fingerprint and expected old revision; it never silently rebinds.
Parent locks precede Agent locking. SQL validates the source's immutable business
tuple for every Config, plus deferred current-Config/current-source coherence.

Per-agent import provenance belongs to its immutable Config, not the common
business binding. Optional provenance hashes are included in Config material only
when present; legacy Config material remains identical. Historical external
evidence is provenance, never a forged current score or activation approval.

## Customer path

Business-scoped customer agent routes list/read/create/import/revise the same
Agent/Config records. Legacy rows dispatch to existing Creation authority;
external rows use the current verified owner, exact enabled grant, binding and
source guards. Mutations use immutable UUID replay, optimistic revisions and
current-source fences. Business team directory reads the same records. Grant or
membership revocation removes access; stale-source history stays distinguishable
from current write/admission authority.

Research/email preparation can use an explicitly reviewed external source
snapshot. Saved configuration and import do not activate modules, model calls,
mail or voice. Live Website/Profile admission remains a separate existing gate.
Native acquisition adapts its existing authorization/proof and SQL fences to the
external identity; research/email share one business binding while each keeps its
own Config/import hash. Common Task/Run, accounting, Case/mail and calibration
engines remain authoritative.

## Verification

Use isolated registered test businesses and real PostgreSQL/RLS. Verify claim
review, exact binding import, current owner read/write, UUID replay/conflict,
immutable revisions, cross-owner/foreign grant denial, source expiry/revocation,
directory visibility, native inert research/email/reply and canonical mail reads.
Test migration48→49 retains all pre-existing column values, Config/Auth hashes,
attempt history and files. New nullable columns do not imply changed old material.
Then adopt backed-up operating source/schema with paid/live channels held and
verify actual customer UI desktop/mobile, not only DTO/unit checks.

The independent dealer business is not created, calibrated or published here.
