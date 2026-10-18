# Customer website preview — source checkpoint, 2026-10-17

The Results reader now has a source implementation for explicit native website
preview preparation, a current-ready new-tab link, expiry and explicit close.
The maintained Foundation/guarded preview is the sole producer. This checkpoint
records delivered source; it does not certify runtime or browser adoption.

## Exact source and observed serving versions

- Root integration: `1684e7f0af463bb175b9bfa302c0722c9d127b05`, incorporating
  the helper's frozen wire and functional lease adapter. The functional source
  is in draft [core PR 185](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/185)
  and the existing Root integration PR 164.
- Portal source: `5651f0e8c0104c4ba59fcd8e9a1d13fededcf33f`, own workspace
  branch and existing draft [portal PR 67](https://github.com/christianza1989/verslomatika/pull/67).
  Wire codegen pins core `b059995fda183ad38749016b7d14e12d704cb78d` and Git-byte
  SHA256 `d25040f6f7a279ca04bd5f2a9ed90eef8ab48e787a5eaf551c353686b37b6016`.
  The functional commit retains that exact wire.
- Serving API 18871 remains `62abbed947a7653c938526ea35fdf804581cd3eb`, PID 3184;
  companion renderer remains `255fea0813bf1aabeaeea2f2de0b29564118f2fc`.
- Serving UI 3030 remains earlier `741d045` / build `pBmCae9BzQOC9eld58MkO`,
  PID 2100. The new `.local/workspace-live-preview-next` is registered but has
  **not been built or started**. The older prepared direct messenger build is
  separate and remains off.

The paired continue gate fetched core main `808581d9` and public main `ec8a9c03`
successfully at 2026-10-16 22:10 UTC. Portal main ancestry was also fetched and
verified. A local feature branch is not main delivery or another PC's adoption.

## Completed source checks

- Helper: 209 Python pure/mock cases and 19 Node mock cases passed. Six opt-in
  PostgreSQL authority cases were collected only; no actual DB or preview child
  was exercised by the helper. Its original failures and immutable journals stay
  preserved. Root now owns both live-preview journals for further real evidence.
- Portal: 43 related checks and TypeScript passed. Independent AI source review
  found two P2 defects: bodyless close lacked the write guard's JSON Content-Type,
  and revision-pending could retain an older ready link. Both were repaired and
  source-confirmed. The original 6 PASS / 1 FAIL close baseline remains private.
- Incremental committed core coverage from `8cdf8d99c5e548fa27662f84a34c93d00809be38`
  to functional `1684e7f0af463bb175b9bfa302c0722c9d127b05` passed: nine shared
  paths, no uncovered paths/errors. This does not waive inherited full-main debt.
- Portal documentation: 752 links across 245 Markdown files passed before its
  source commit. No generated build, credentials, DB or private receipt is in it.

## Disk block and preservation

At this continuation, C had 759,750,656 free bytes, approximately 0.76 GB. The
checked manual cleanup has 34 obsolete UI builds plus one cache in its exact
allowlist: 9.27 GB logical content, approximately 5.4 GB physical use after prior
NTFS compression. No cleanup receipt exists and no deletion occurred here.

The human-run script is portal `web/.local/cleanup-obsolete-builds.ps1 -Apply`.
The default mode is inspection only. The earlier automated deletion was rejected
before execution with `blocked by policy` and no detailed reason. Do not retry
that operation through another executor. Preserve the four protected builds,
dependencies, evidence, original assets, worktrees and all private databases.

Heavy production build, SQL/process acceptance and serving cutover are deferred
until actual free space and database health have been rechecked. Existing API/UI
listeners were observed intact; this is not a new database-integrity certificate.
Paid usage remains 37 of the existing 40-call ceiling; no provider call was made.
All paid workers and external channels remain held.

## Resume order

1. Verify the actual cleanup receipt and stable free space, then the same owned
   PostgreSQL and operational DB integrity; do not create another operational DB.
2. Run the six isolated opt-in PG authority cases against a dedicated migrated QA
   database. Preserve all original refusals and unrelated runtime state.
3. Adopt the reviewed source only through the existing owned backup/cutover flow.
   The readonly Foundation export changes the bridge hash, so renew ordinary
   owner Session/private intake/S6 and capture a fresh native scope. Never rebase
   older proofs or approvals to the new source.
4. Verify actual preparation, ready/open/close, expiry/revocation and API shutdown
   cleanup of its exact owned child tree. Do not resend the stored synthetic form.
5. Build `.local/workspace-live-preview-next`, then request the single permitted
   manual frontend restart. Earlier automatic frontend starts were rejected and
   portal AGENTS.md explicitly prohibits bypass. Do not enable direct messenger.
6. Perform genuine Chrome desktop/mobile/keyboard and state checks for the new
   controls, keeping the existing reader selection and message drafts intact.

Earlier native browser evidence remains bound to its exact source/scope in
[the recovery checkpoint](VERSLOMATIKA_BROWSER_RECOVERY_2026_10_17.md). Premium
business design, full language/A–Z/SITE_COMPLETION, actual 200% enlargement,
Foundation and agent acceptance, supplier agreement/photo rights, notification
delivery, public domain and launch remain open.
