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
isolate explicit IDs and compatible aspect ratios; mixed marked/unmarked media
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
