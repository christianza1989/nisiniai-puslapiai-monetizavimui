# Recipient proposal acceptance — 2026-10-10

Scope: candidate native recipient HMAC codec, exact source/canonicalization/identity investigation and isolated native fixture. Dependency core contract0.1.1/f629 is read, not adopted as mounted integration. Current canonical Worker remains fd24248a/sourceba911586. Own branch derives from published source/docs4652575; no new deployment.

`node --test sites/madbeauty/acquisition-native-20261010/recipient-binding.test.mjs`: **4 tests pass**. Actual in-memory native SQLite OTP capture verifies trim/lower handling and actual stored account; ordinary createOrganization creates stable provider UUID attached to its owner membership, and unapproved profile returns null. Capture remains example.test/state=captured; no real SMTP or network.

MAC tests prove recipient/invitation/nonce/business/environment/class/adapter/key separation, preserve address aliases/dots, Unicode normalization parity and fail-closed invalid key/type/token/digest inputs. This does not prove that the core has issued a nonce, an authenticated HTTP signer attested the actual account, a replay ledger consumed it or that a lifecycle outbox survives restart.

First fixture run: **3pass/1fail** because it used route city ID `vilnius` in a native mutation requiring CITY_NAMES value `Vilnius`. Actual guard rejected INVALID_INPUT. Only fixture corrected; second complete run4/4. No backend guard or production data changed. This failure is fixture experience, not invented shared-core defect or erased prior receipt.

Exact dependency evidence: `backend/auth.mjs:createAuth.start/verify`, `backend/primitives.mjs:randomId`, `backend/platform.mjs:createOrganization/profile/submitRevision/moderate`, `backend/offers.mjs:serviceEligible`; deployed sourceba911586. Recipient schema/permission/route, pre-provider event buffering, profile aggregate semantics, durable native outbox/revision and actual core capture/replay acceptance await agreement in issue66.

Governance source read: origin/main d4ea8bf7384b70c4ea62a344001e3f8158812c56 CORE_IMPROVEMENT.md and existing multi-machine/Git instructions. No shared implementation or shared skill/rule modified, so no artificial shared upgrade is recorded. New unmerged root policy/checker changes are not claimed adopted. Site-specific dependency/fixture experience is recorded in CORE_FEEDBACK.md and issue66; a future actual shared repair needs its own canonical journal and source/adoption evidence.
