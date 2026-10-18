# Registration identity across private intake continuity

An unchanged, canonically registered private Creation could lose its Registration
after a normal explicit S37 source renewal. The selected intake gains a fresh
`nativeContinuity` observation, changing the full intake SHA-256. Registration is
immutable and unique for the accepted revision. Its original full digest must
remain exact, while registration projection, administrative replay and downstream
Profile/source readers compare the same canonical accepted proof.

The isolated native PostgreSQL reproduction registered revision 1, renewed the
source through the maintained owner S37 route, and then received
`503 invalid_registration_source` from Registration GET. It failed both when the
Registration came from the initial private intake receipt and when it had been
created from an earlier continuity receipt. Existing Registration/request/receipt
rows remained unchanged. The first two failures and their private log SHA-256 are
retained in upgrade `upgrade-cdce8ae3-618b-4277-8a2e-c3f90bc71259`.

## Canonical repair

Only `creation_registration/service.py` changes runtime source. The existing
`accepted_proof` first runs the unchanged accepted material and current native
`studio.intake_observation` validators. Public/legacy intake and first registration
retain their existing behavior. When a current private continuity observation
differs from an already registered exact revision's full intake digest:

1. Validate the existing Registration owner binding, immutable material fingerprint
   and every other proof field against the freshly selected accepted proof.
2. Reobserve the current private request/result and the maintained
   `private_preview.retained_anchor`. The current receipt must exactly equal the
   fresh selected intake. No historical request supplies current authority.
3. Resolve the exact immutable historical receipt whose **full** intake digest is
   stored in Registration. It must belong to the same Creation, revision and
   environment, with exactly one matching request/receipt pair.
4. Reuse strict private request/result and continuity marker validation. The
   historical receipt must be the exact original origin or a renewal of that
   same nonrecursive origin. Origin request/receipt IDs, context/intake/manifest
   hashes and paired-upgrade origin sources must agree. Accepted material, owner,
   native host, source context and all other context fields remain identical;
   only the existing renewal contract's Session/execution source/native sources
   and continuity marker vary. Core intake identity fields must also match.
5. Return the historical intake **without changing any byte or removing its
   continuity observation**, and recheck latest selection and current private
   authority after the historical lookup. Only the full historical digest is
   used for the Registration identity field in the accepted proof.

This supports Registration created from the initial receipt, v1 renewal or v2
paired-source renewal. It does not make an old receipt a current source. Stale or
failed selected intake, changed owner/context/accepted material, foreign origin,
bad native observation or elapsed Session authority still fail closed. Unknown
context fields cannot silently disappear from comparison. Arbitrary dictionaries
with `nativeContinuity` removed are never used to manufacture a stable hash.

The one canonical proof rule reaches existing registration projection and
`admin.provision` replay, Profile admission and source-sync callers. No parallel
matching rule, new registration generation or same-revision replacement is added.
Original Registration/request/receipt/fingerprint/authorizing-session values are
never rewritten. Registry, Profile, source, Foundation, learning and channel
admission remain separate; Registration never declares them complete.

## Regression and operating boundary

Dedicated native tests extend the maintained S37 fixtures. They cover both
original reproductions, a Registration created from paired consumer/importer
continuity and followed by another physical synthetic consumer upgrade, stale
and failed current intake with real original-artifact tampering, and real clock
expiry of the authorizing Session during historical lookup. Original table rows
and native case files are compared exactly where unchanged files are expected.
Pure tests reject foreign origins, changed accepted/context/intake fields,
self-consistent counterfeit markers, invented authority, missing observations and
damaged receipt digests, and preserve both original and prior-continuity payloads.
Existing Registration and private native continuity suites provide compatibility
and current-source/file/owner refusal coverage. Actual command results and hashes
are recorded in the unique verification event; first failures remain private.

The expiry test initially attempted a concurrent administrative Session UPDATE
while the canonical reader correctly held actor locks. That test blocked itself;
its original failure is retained. It now sets a short future expiry before the
request and lets the real clock pass during lookup, preserving the native locks.
No production change was made to accommodate this test.

Native QA uses a new exact-owned, loopback-only PostgreSQL 18.6 container on port
15548, fresh random private credentials, all canonical migrations through 0045,
and a runtime role without superuser, RLS bypass or role/database creation rights.
It uses actual restricted HTTP/SQL/Node with synthetic role outputs and no paid
model or channel call. Private profiles, append-only QA history, files and logs
are ignored by Git. No operating database, process, content, native receipt,
mail/acquisition module, portal, DTO, migration or runtime permission is changed.

This is source delivery, not runtime adoption or a new admission. Root separately
owns review and adoption. A scoped source revert restores the old reader behavior
without a schema rollback or historical-data rewrite.
