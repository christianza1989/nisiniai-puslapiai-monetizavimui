# Discovery observations in private Creation context

2026-10-15. Upgrade `upgrade-8ca62669-7799-4074-b602-80093c4cbc0b`.
Owned branch `codex/verslomatika-discovery-source-context-20261015`, exact base
`d3d9c9fd84482c0cc1696f6b25ebbf8d87a8b12f`. Issue66 scope comment6187967571.
Paired continue09:02Z: core main808581d9 and public mainec8a9c03 are ancestors;
read-only companion1a26f289. The old helper checkout is preserved.

## Problem and resulting behavior

Discovery already retained public-source observations privately in its own job
usage. Creation received only the reviewed plan and could not inspect that
report's captured text. A newly captured job now opts into a private
`source_context_version=discovery-source-context.v1` marker. The report's exact
`job_id`, rather than the most recent job for its Discovery, supplies an optional
`sourceContext` in `approved_business_plan` and canonical native intake context.

The bridge checks the Creation, parent Discovery, Report and Job owner,
organization, portfolio and environment; the exact report/job parent and id;
the succeeded job state; and matching historical report/job source revision.
The report payload, report material hash and existing build-approval fingerprint
are unchanged. Approval validates a marked capture within the existing SQL
transaction, so malformed source provenance cannot create an accepted build.
Malformed non-object job usage is rejected, including falsey arrays/strings;
only `None` is treated as an empty legacy usage object.

Absent markers retain the existing five-key approved plan projection, omit all
optional native fields, and do not reinterpret older captures. No migration or
retroactive marking of real benchmark data is performed. Existing strict
importer/request hash replay checks are retained: changing importer source does
not authorize rewriting or silently replaying an old manifest under new bytes.
The shared native reader still reads internally consistent historical manifests.

## Private wire and limits

The versioned block contains Creation/Discovery/Report/Job identities, report
revision and SHA, exact plan SHA, historical discovery source revision, captured
raw observations SHA, sources, coverage, claims status and the SHA of the whole
block excluding `contextSha256`. It does not substitute the current Creation
execution SHA for the historical Discovery source revision. Strict Python and
Node validators reject unknown structural keys, malformed ownership identity,
invalid dates/URLs/hashes, unsafe counts, non-UTF8 text and inconsistent counters.
Python creates canonical UTF8 hashes and Node verifies them using `stableV2`;
actual cross-language tests cover Lithuanian Unicode and astral characters.

Raw captures are bounded to2MiB and2000 pages/remaining URLs/links. The projected
block is at most65536 UTF8 bytes and12 whole source entries, considered in capture
order. An entry that does not fit is omitted intact; the bridge does not silently
truncate it. Coverage records captured, included and omitted counts, remaining
URL count and captured/included clipped-entry counts. Hidden clipping cannot be
assigned to nonexistent omitted entries.

An observed entry carries its public HTTPS URL, title, capture time, HTTP status,
response byte count, body/text SHA, exact reader excerpt, code-point length and
`textMayBeClipped`. An unavailable entry carries URL/status/error only. The
existing reader truncates at9000 **Python code points**. Both validators count
code points; `excerptLimitChars=9000` and `textMayBeClipped=true` for every exact
9000-point excerpt, including9000 astral characters. This is a conservative
possible-clipping flag, not proof that more text existed. No new fetch occurs.

`readerReportedComplete` describes that reader's URL queue, not a complete page,
catalogue, supplier investigation or independent verification. The block always
uses `claimStatus=external_source_claims` and
`independentVerification=UNVERIFIED`. Prompt instructions require attribution to
the source and prohibit adopting manufacturer claims as our capacity, prices,
partnership, rights, licences, contacts or admitted facts. The bridge is generic;
fixtures use synthetic public examples and contain no supplier-specific logic.

## Execution and native provenance

The Creation worker freezes a validated independent copy at claim. Its optional
heartbeat argument compares the current approved source block with that frozen
SHA. The same check runs before/after native intake and before SQL acceptance.
Removed markers, changed captures, wrong bindings or malformed marked snapshots
fail the job; no new accepted Revision/Artifact is inserted. A receipt already
returned by canonical native intake survives a later fence failure. Existing
legacy callable arguments and no-source execution remain unchanged.

Canonical Node intake validates the optional block before writing artifacts,
seals it in `intake-context.json` with the existing immutable request hash and
pins `sourceContextSha256` in the manifest/result. Changed source context cannot
replay a prior revision. The shared native loader revalidates the block, its
Creation id and manifest SHA before use. No browser/BFF/API path or source
admission is added. `verifiedFacts`, contacts and operator remain explicitly
empty; native pages stay drafts, with no approval or publication.

## Actual verification and retained failures

Focused Python command: `python -B -m pytest -p no:cacheprovider
offline_tests/test_discovery_source_context.py offline_tests/test_business_discovery.py
offline_tests/test_creation_studio.py -q`: **83PASS4.97s**. Covers strict bindings,
legacy omission, malformed usage/captures, byte/entry limits, clipping/counters,
Python-to-Node hashes, heartbeat drift and before/after-intake receipt retention.
Earlier focused82PASS3.79s preceded the added coverage-counter check; counts are
not additive. Ruff across all six changed/new Python sources and the two new
test modules: **PASS**. `git diff --check`: **PASS**.

Final Node command: `node --test content-studio/test/discovery-source-context.test.mjs
content-studio/test/customer-creation-intake.test.mjs
content-studio/test/customer-content-workflow.test.mjs
content-studio/test/customer-content-write.test.mjs`: **75PASS103410.24ms**.
This includes six new source/intake tests and existing native writer, media,
reviewed-copy, metadata-body refusal, replay/history and workflow coverage.
Earlier75PASS81327.30ms preceded the counter-hardening review and is not additive.

Five native selectors collect0.28s: four in
`tests/test_discovery_source_context_pg.py`, plus
`tests/test_business_discovery.py::test_no_idea_chat_plan_revision_explicit_build_and_replay`.
They use real owned API Discovery approval, restricted SQL Creation worker and
canonical Node intake with inert source/role fixtures. Positive marked/legacy
cases deliberately add a later failed sibling with an unusable marker, proving
selection by the report's own job. They check foreign-owner404, unchanged report
bytes/hash, private intake provenance, blank business facts and exact replay.
Two drift cases remove the marker before/after native intake and require no SQL
Revision/Artifact, retaining the already returned native receipt after writing.
**Collection is not native execution. Root's distinct disposable0041 database
and private credential-owning launcher must execute the frozen commit.**

Retained initial failures: missing new module caused1collectionERROR0.21s;
intermediate suite3FAIL76PASS2ERROR5.25s included a missing fixture timedelta and
oversized automatically generated emoji parameter ids (diagnostic truncated;
no stronger unobserved cause claimed). Corrected fixture ids/import. The next
run1FAIL79PASS3.97s exposed `.get` on a removed/None source block; `source_matches`
now checks object type and fails closed. The subsequent focused runs passed.

A broader `test_creation*.py` / `*discovery*.py` cohort returned
**4FAIL543PASS7SKIP29.50s**, not a whole-suite PASS. All four failures were
reproduced read-only on preserved7e79c63: **4FAIL2.28s**. The three test files and
their runtime team/wire sources have an empty7e79-to-d3d9 diff. One stale test
expects600s while the maintained wire advertises900s; three language-team cases
use old incomplete inert claimed fixtures without user identity/current actor
test seam. Root subsequently authorized only these three test files, separately
from S28 runtime. Their repair and evidence belong to a distinct test-only commit;
SQL actor fencing must remain intact.

## Delivery and acceptance boundaries

Only nine declared shared source paths, focused tests, this evidence, WORKSTREAMS
and the unique journal are owned. Root owns actual business research documents,
the genuine unchanged0f benchmark, private QA launchers and serving adoption.
This packet changes no database schema, provider/model/profile/quota, live
capture, actual case, approval, review, Foundation/admission, deployment or main.
Source delivery, Root integration, main merge and actual adoption require
separate evidence. Rollback is a scoped source revert preserving historical
captures, receipts and hashes; it does not rewrite existing intake artifacts.
