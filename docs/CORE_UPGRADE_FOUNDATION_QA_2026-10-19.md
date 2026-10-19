# Git upgrade provenance foundation — 2026-10-19

Fetched private main `533597c10e290a2a09a522ad348e19c9968aa9d5` contained the
journal writer and freshness bootstrap but no committed-diff coverage checker.
Calling the missing entrypoint failed before any check could run; that original
local failure is retained with SHA-256
`b15b5d44f0ba792484323d2cb10ce8392edffe69665ac7201039aaa84d36f969`.

Issue [219](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/219)
owns the fresh-main foundation. The source provenance is the reviewed feature
history `20fc6992`, `3e9b9c7b`, `2657df11`, frozen at
`da5f2e2cc667eeedd9449e4152ae42774c4f3005`. Nine selected source/rule/test files
match that commit byte-for-byte. AGENTS receives only its experience-loop
paragraph; CI receives only the existing preflight additions.

The checker reads committed Git blobs and requires an exact shared scope,
canonical issue URL, correct repository, append-only record/events and a fresh
verification event containing actual check evidence. Dependency manifests and
locks require coverage. Bracketed routes are exact Git blob/tree paths; wildcard
patterns, fabricated directories and working-tree-only scopes cannot broaden
coverage. Exact deletion provenance remains supported.

The journal writer and quarantine implementation are retained. Bootstrap output
now points all core roles at the same experience loop, with its direct fixture
regression. The global bootstrap was not installed by this work.

## Completed local checks

- `node --test scripts/core-upgrade.test.mjs scripts/core-upgrade-check.test.mjs
  scripts/git-freshness.test.mjs scripts/install-agent-git-bootstrap.test.mjs`:
  **25 passed, zero failed or skipped**. Log SHA-256
  `063a952a27d33b32fab004a0dfde9d5d0e36a5f5cbd6df0482d12e9f3629ef02`.
- Existing calibration-input preflight: **PASS_INPUTS**, zero model calls and no
  private data read. Log SHA-256
  `d46a29122b132372e7b7fb9e8f1c6cc35923bfbd1d7cb27fb6b27dd38870d2af`.
- Selected-source hashes, four added local links/anchors and CI full base/head
  SHA wiring passed. All pre-existing journal and SOURCE files, runtime source
  and the companion checkout remain unchanged. Markdown prose was separately
  reviewed for meaning and links; no frontend or typography styles changed.
- Paired freshness passed against private main above and companion
  `255fea0813bf1aabeaeea2f2de0b29564118f2fc`, which contains fetched companion
  main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`.

The exact staged safety scan and committed base/head coverage belong to the
final journal/PR handoff. Remote CI and reviewed merge must be checked from the
actual PR; this document does not predeclare them.

## Scope boundary

This foundation imports no historical active record, event, archive payload or
archive format. It adds only its own unique journal. Future historical import
requires a separate reviewed contract; the quarantine helper's protected-path
rules and the checker's history rules remain intact.

No runtime/API, database, model/provider, Gmail, deployment or operating adoption
was performed. The long-lived feature's historical delivery debt is unchanged.
Source review, main merge, another machine's fetch and actual use are separate
acceptance steps.
