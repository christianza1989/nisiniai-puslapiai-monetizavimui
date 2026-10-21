# Responsive gallery family contract

Issue: [236](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/236).
Source bases: private e231fe491e663949adbdda992286f5b8fb97513b;
public 8a7416109c3885ebbdbc7f855664f7745192550e. These are source changes,
not a live gallery import, editorial approval, main merge or deployment.

## Reproduced defects and scope

`editPage` expanded private `groupId` families but stripped identity from public
media. The public helper then identified composition by equal alt/aspect alone.
Different product views with the same descriptive text could share srcset.
The initial capacity estimate assumed 13 frames at five responsive widths
(65 files). Actual collection subsequently reported a maximum of about 46
responsive files per product, so the unchanged 60-variant limit is sufficient.
The importer/root owns current source inventory, rights and actual completeness;
this source increment cannot prove every manufacturer image has been imported.

New assignments carry optional immutable `familyId` copied from the stored
`groupId`. Existing published snapshots are untouched. Prompt, original file
path and source metadata remain private. Both V1/V2 contracts keep the existing
60-variant bound, reject overflow without truncation,
and require opaque family IDs of at most 128 characters. Reusing a family ID
does not bypass revision, site/path, publication, review or export gates.

Public `uniqueImageFamilies` returns the largest variant per composition in
first-family appearance order. `responsiveImageVariants` and `imageSrcSet`
isolate explicit IDs as authoritative identity, including integer-rounded
panoramic variants; mixed marked/unmarked media
never merge. Legacy unmarked approved packages retain alt/aspect behavior.
Renderer code must supply only the authoritative eligible page media.

The existing studio server and HTTP test now honor `STUDIO_PUBLIC_CORE_DIR`;
their default sibling companion path is unchanged. This is needed for isolated
worktrees and does not run or mutate a live studio.

## Verification history

The initial source increment temporarily raised capacity to 160. Its successful
boundary checks below are preserved as history. After actual source collection
showed the smaller maximum, the follow-up restores 60 everywhere and repeats
the relevant real HTTP, paired V2, public package/helper and full public tests.
Current model/schema/validators use 60; `familyId` support remains unchanged.
The restored limit passed real HTTP import/export plus immutable metadata and
paired V2 contract tests **3/3** (60 actual variants accepted, 65 rejected
atomically; V2 60 accepted/61 rejected). Full paired public regression repeated
at 60 and passed **59/59**. The renderer/integration agent owns the actual
product inventory, so about46 is its reported maximum, not a new Core quota.

- Public targeted package/helper tests: 14/14 PASS (new family isolation,
  legacy aspect rounding, primary order, hash binding, invalid IDs, cap boundary).
- Studio real HTTP upload/export plus draft metadata immutability: 2/2 PASS.
  Real PNG optimization produces five WebP sizes; one selected family exports
  all variants and `familyId`, with private groupId/prompt/source excluded.
  Cross-tenant attachment is rejected. Approved snapshot remains unchanged.
  160 actual variants attach; 165 fail atomically and retain prior draft/snapshot.
- Studio image pipeline plus paired V2 contract tests: 4/4 PASS. Tests cover
  both validators and identical schema copies, 160 acceptance/161 rejection,
  changed family identity invalidating approval, invalid IDs, alpha, no upscale,
  orientation/metadata stripping and malformed input.
- First HTTP run failed because server's static sibling companion import was
  absent in isolated worktree. The explicit path override repaired that cause;
  successful 2/2 run followed. Original failure is retained here.
- First full public suite could not load missing TypeScript dependencies in the
  fresh checkout. Installation and complete suite status are recorded separately.

Subsequent `npm run install:ci` completed (683 packages; six dependency install
script warnings reported). The full paired public `npm run test:core` then
passed **59/59**. `node scripts/compile-content-packages.mjs` validated all nine
legacy approved packages without a generated-file diff. Separate publication,
tenant and admission regression passed 11/11. The staged safety checker passed
the two public commits and all 12 private files. Committed core upgrade coverage
passed all five shared changed files; paired handoff freshness passed with clean
worktrees at private 640e09656ad2e8a0450c00a9b8ea1e96f85de6a0 and public
cbc3f8a0351c14727dac22a430db2a75533848ec.

`npm run test:seo-smoke` reached no assertions because its default localhost
127.0.0.1:8787 had no server (`ECONNREFUSED`). Actual rendered HTTP/SEO verification
belongs to the root gallery integration's isolated server after combining the
renderer and real gallery package. This is an explicit remaining integration
check, not a passed source test or reason to activate any live process.

No historical packages/assets, live data, runtime activation, external model
calls or deployment are part of this agent's scoped source work.

## Genuine original encoded-byte allowance

Final source collection identified exactly two originals above 12MiB:
13,531,270-byte PNG at6000×6000 and14,732,331-byte PNG at5000×5000.
Both fit the unchanged40MP/8192 input guards. The canonical binary limit is now
16MiB (bounded headroom over the actual maximum); no per-site transcoding or
invented upscale is introduced. JSON base64 transport permits24MiB because
16MiB expands to about21.34MiB before small metadata fields. The studio GUI
reads the byte policy from `/api/meta` for its label and pre-upload check.
There is no second fixed GUI input limit. Public size candidates/maxedge1600,
quality, alpha/EXIF treatment and legacy optimized saveAsset8MiB gate remain.

Actual checks:

- Pipeline and real HTTP fixture test5/5 PASS. Legal PNG chunks test exact
  max−1/max/max+1 encoded bytes; 16MiB is accepted, one extra byte is rejected.
  The40,960,000-pixel PNG remains rejected and8193px edge remains rejected.
- Largest genuine14,732,331-byte source went through HTTP JSON/base64 import,
  canonical optimization and private-original storage with exact original-byte
  equality. All emitted variants stayed at or below1600px. Whole suite131.9s;
  genuine source is read only from the private collector output, never committed.
- Final HTTP/meta rerun1/1 PASS after GUI policy wiring: API exports exactly
  IMAGE_POLICY, full16MiB valid input receives201, one extra decoded byte400,
  and rejected input does not append assets. JavaScript/server syntax checks PASS.
- Private test roots and ephemeral servers were cleaned; no live studio changed.

## Reviewed per-page attachment descriptions

`editPage` now supports `{media:[{id,alt}]}` with optional per-page context.
The exact nonempty string (at most300 characters) is attached to every variant
in the selected family, without changing library metadata or image bytes.
Different selections of one family with conflicting descriptions reject the
whole assignment. With `alt` omitted, the legacy library-default behavior stays.
Explicit undefined/null/nonstrings/empty/overlength strings are rejected.

The GUI carries forward an existing page attachment description on resave;
new selections use the library default until a caller supplies reviewed context.
A deliberate draft library correction updates inherited default descriptions
while preserving contextual descriptions that differ from the old library value.
All existing ever-approved asset and immutable published-snapshot gates remain.

Actual focused regression5/5 PASS: V1 andV2 attach one family to two pages with
different descriptions and a third default page; all responsive sizes agree,
source records remain unchanged by attachment, 300 accepted/301 rejected,
malformed and conflicting duplicate requests fail without persistence, and later
draft attachment/global-metadata actions cannot mutate old approved exports.
Existing HTTP media export, draft metadata immutability and paired V2 contract
tests passed in the same run. The first new fixture omitted its required offer
and correctly failed the approval gate; the fixture was repaired, not the gate.
This is metadata plumbing only: no public business descriptions were generated.

## Bounded catalogue media assignment

Integration reported that a32MB site with1408 product pages was being rewritten
for each serial `editPage` attachment (~2.6s/page with high RSS). This is the
integration's measured finding, not a local claim that the new batch has been
benchmarked on or adopted by the actual private catalogue.

New `editPageMediaBatch(siteId, [{pageId,media:[{id,alt?}]}])` accepts1..100
distinct pages and returns only those page objects in request order. It takes
one existing write lock, reads the site once, builds site-local asset/family
indexes once, prepares every normalized gallery, and only then updates review
state and writes once atomically. Existing `editPage` uses that exact same
extracted attachment normalizer. No second media engine, per-site batch script,
changed family semantics or approval bypass was introduced.

Only draft media/status/approval=null/updatedAt change. Body, title, URL, dates,
V2siteSnapshot and every historical publishedRevision remain untouched. An
unknown or foreign page/asset, duplicate page ID, non-media field, malformed alt,
conflicting family alt, >60 variants or >100 pages rejects without partial writes.

Focused regression **9/9 PASS**: new V1/V2 two-page contexts and exact single/batch
media parity; all nonmedia fields and approved exports preserved; later invalid
entry leaves site JSON byte-for-byte unchanged; legacy ungrouped asset parity;
100-page acceptance/101 rejection; concurrent50+50 batches retain both updates;
all existing HTTP export, metadata immutability, per-page alt and paired V2 media
contract tests pass. The first fixture incorrectly tried to approve unresolved
fact checks and was rejected; the fixture was fixed, not the approval gate.
No real private site file, running importer or deployment was touched.
The first committed upgrade check correctly blocked `48ff442` because the
asynchronous journal-event command had not finished before staging; its actual
local-verified event is committed in the follow-up before the check is repeated.

## Complete Studio regression and fixture path portability

Only four existing test files were changed to honor `STUDIO_PUBLIC_CORE_DIR`:
`content-v2.test.mjs`, `content-workflow.test.mjs`, `core.test.mjs` and
`external-content-export.test.mjs`. Each keeps the original sibling
`../../../dovanos-memorycasting` default. No assertion was removed, relaxed or
conditionally skipped, and no runtime source changed in this increment.

The initial default-concurrency full-suite command was interrupted using
Ctrl-C on its own exec session8355 after root observed combined import/test RAM
pressure. Five V2 tests had passed; interruption was exit1, not an assertion
failure. Its own test workers were verified stopped; no foreign processes were
touched. The complete suite was then restarted with one test file at a time.

From `content-studio`, using the exact paired public checkout
`8cc9defa674fb8b3dc357395c8b7d9984a40c8d8`, its config path and a private TEMP
directory under this D: worktree:

```text
STUDIO_PUBLIC_CORE_DIR=<paired public checkout>
STUDIO_NETWORK_SETTINGS=<paired config/niche-network.json>
node --test --test-concurrency=1 test/*.test.mjs
```

Result: **56/56 PASS, zero failures/skips/cancellations, 54.19 seconds**. This
includes V1/V2 validation, private HTTP guards, immutable exports, scheduling,
source/ownership gates, media batches, contextual descriptions, binary/pixel
bounds, generator policy, private research transport and cross-process locks.
The paired checkout has its own nine legacy content packages; this is a complete
source regression, not an assertion that the root's live-gallery catalogue has
been approved or deployed. No own test process remains running. Root separately
owns actual catalogue/UI/performance acceptance and publication review.

## Root catalogue integration checkpoint

The root integration uses an isolated copy of the actual current live package,
not the older local content registry. Baseline packageSHA
`e84a27e204e9303258f7fa5e042993170537d745342ba71a6181d1191da98a8c`
contains1909 pages/1408 catalogue products and the already-live1402 rewrites.
Worker baseline is`a8c1f6c5-604f-4ad3-ab4e-85931d4192cd`. Shared live Studio,
immutable approvals, public package and production remain untouched.

An actual81-page canonical `editPageMediaBatch` completed without approvals;
the subsequent interim checker verified196 attached product drafts against the
manufacturer SHA/family order, exact-title contextual descriptions, shared
public srcset/Product/image-sitemap helpers and unchanged nonmedia fields.
All1909 publishedRevision objects and501 nonproduct pages equal the baseline.
The other1212 products are explicitly pending import/assignment at this
checkpoint; this is not final catalogue acceptance.

Root private browser evidence covers desktop1280 and mobile390/320, keyboard
selection/dialog/focus/error recovery,13-frame layout, exact native200x56
fallback dimensions, and320px user text-spacing overrides. Actual200% browser
zoom remains unverified because this IAB surface exposes viewport emulation
without verified zoom control. A contended Lighthouse attempt was aborted and
its owned Chrome stopped; no score or Core Web Vitals pass is claimed.

Detailed private checkpoints, source limitations, browser screenshots and
candidate reports live under`D:/Core/output/promedical-gallery-execution-20261021`.
They are not copied into Git or presented as public release evidence. The
owner's latest boundary is complete private review before live publication;
approval, release, deployment and indexing remain separate later actions.
