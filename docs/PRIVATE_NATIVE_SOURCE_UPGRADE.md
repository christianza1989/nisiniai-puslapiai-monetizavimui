# Private native continuity across a paired source upgrade

An explicit current-owner private-preview-intake request may observe an existing
private case after the core source and its public consumer/importer change. This
is a read of retained material, not another import or new approval authority.

The original SQL request/receipt, accepted candidate, original source/context/
manifest bytes, page mappings and historical importer hash remain unchanged.
Current native content/media are validated by the current maintained observer.
No historical code is executed. Owner/Session/portfolio/Creation, accepted proof,
source context and private host remain exact; current source and owner are checked
again during execution and before the append-only receipt commits.

## Original provenance and current authority

Existing `private-native-anchor.v1` markers retain their exact shape and behavior
when native fingerprints are unchanged. Their existing receipts are not migrated.
An explicit changed core source plus changed public/importer fingerprint uses
`private-native-anchor.v2`, adding four exact fields:

| Field | Binding |
| --- | --- |
| origin_source_revision | Original immutable request's execution source |
| origin_native_sources | Original request's exact public revision, importer SHA256 and network SHA256 |
| execution_source_revision | Current request's freshly captured execution source |
| execution_native_sources | Current request's freshly captured public revision, importer SHA256 and network SHA256 |

Both source revisions must be valid and different; the three-field native maps
must be exact and different. Network SHA256 must stay identical. Network changes
still return `private_intake_anchor_stale`; this protocol grants no configuration
migration. Native drift without an explicit changed core source is also refused.

The original receipt's importerHash is checked against origin_native_sources,
never relabeled as the new importer. The current Node observer independently
checks the current importer bytes, network bytes and clean public Git HEAD against
execution_native_sources before and after its read. The application independently
compares all current capture fields and the derived marker at each authority
check. Supplying a different original/current marker cannot select another anchor.

The marker also retains the original request/receipt IDs and context/intake/
manifest hashes, plus the current observer SHA256. Node verifies the original
source/context/manifest files and their hashes, then validates current private V2
pages, relationships, original URL mappings and every retained raster's bytes and
dimensions. All observed files are read again before returning. No original file
is repaired, overwritten, reimported or synthesized to satisfy the checks.

The ordinary private-preview-intake endpoint still requires a fresh explicit
idempotency UUID for a new source. A retained failed UUID stays failed; replay is
not a new execution. Each renewal anchors the original successful import, not a
chain of evolving snapshots. A new successful receipt retains the original intake
fields and adds only the existing read-only nativeContinuity observation and its
strict v2 anchor. All import/generation/verification/review/approval/release/
deployment/channel flags remain not-performed. F1/launch remain UNVERIFIED.

## SQL and acceptance

Migration0042 already allows the additive marker while preserving append-only
request/receipt rows, exact ownership/RLS, current verified Session and owner,
lease/run, unchanged private host and exact accepted revision/coordinator fences.
This repair adds no migration, table, grant, function, trigger or definer path.
Fresh/restored schema acceptance remains owned by the integration owner.

After current-source intake continuity, native mutations still require explicit
current-source S6. This protocol creates no S6, editorial review, approval, release
or deployment. Existing media/editorial/Foundation gates are unchanged.

Offline tests cover original/current pins, unchanged v1, network and same-source
refusals, forged markers, tampered original importer, host/owner/accepted/source
context and authority loss after observation. Isolated Node tests execute a
synthetic prior importer with a distinct physical hash, then the current observer;
they also reject forged source fingerprints and altered original artifacts.

The opt-in native PostgreSQL module adds five cases: real restricted HTTP paired
renewal preserving original receipts/files and still refusing S6; three original
artifact tampering refusals; network drift refused before request insertion. Its
Git consumer/importer identities are explicit isolated synthetic fixtures. The
helper collects only. Root owns actual execution, a fresh copy of the current
retained operational DB, actual original/public source compatibility and adoption.
Source tests do not establish those operational results. Preserve the first409
and failed database/receipt copies; do not patch or retry them in place.
