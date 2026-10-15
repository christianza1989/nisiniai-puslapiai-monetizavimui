# Private reviewed-copy amendment protocol — 2026-10-15

Upgrade `upgrade-cb4242e4-4341-40f4-b2d9-1cac8b1c21c1`; issue [66](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66), scope reservation6186944254. Own base `36a46074a0b1f52b77879765821149b6634c3c65`; branch `codex/verslomatika-reviewed-copy-amendment-20261015`. Paired start 2026-10-15T07:31Z PASS, core main808581d9/companion1a26f289/public mainec8a9c03.

## Scope and authority

The maintained `amend-page` intentionally accepts metadata only and rejects `body`. Keep that behavior and its regressions. A distinct **`amend-page-reviewed-copy`** command supports deterministic corrections to already read private copy. It reuses `model.editPage`, native V2 body validation and the same known-page, attached-image and explicitly verified external-link semantics as the writer. It invokes no model/provider, source fetch, editorial review, approval, release, deployment or activation.

The Node command remains a trusted server operator, not an authenticated endpoint. Root owns the internal runtime adapter and shared native mutation guard: current owning Session/RLS/Creation/source, accepted candidate, current S6 where needed, no active Creation/GUIDE work, bounded subprocess pre/during/post authorization and final output validation. This helper changes no Python/runtime authority, accepted case, DB, local configuration or serving process. The command name does not certify a review or a fact.

## Exact request and bounds

Pass one UTF-8 JSON request on stdin to `node content-studio/scripts/customer-content-workflow.mjs` from the frozen source. It has the existing server-derived identity/path fields (`creationId`, `acceptedRevision`, `sourceHash`, `canonicalHost`, `artifactsRoot`, `dataDir`, `outputDir`, `pageId`), plus:

```json
{
  "command": "amend-page-reviewed-copy",
  "operationId": "<canonical-lowercase-UUID>",
  "expectedSiteHash": "<current-64-hex-site-hash>",
  "expectedRevisionHash": "<current-64-hex-page-hash>",
  "expectedPlanningHash": "<current-64-hex-planning-hash>",
  "patch": { "title": "Exact reviewed private copy" }
}
```

`sourceHash` is the accepted candidate SHA, distinct from the executing Git source revision. Existing `loadCustomerContentContext` checks immutable intake manifest/source/context hashes, exact case/site/revision/host, runtime artifact directory confinement, non-revoked V2 page and intake lock. Existing `prepare` supplies the page data and exact current three hashes from one snapshot. Re-read after every successful page correction: the site hash covers the whole native site.

The strict, nonempty patch accepts **only** `title`, `description`, `intent`, `body`, `factChecks`, `externalLinks`. Maximum patch: 200,000 UTF-8 bytes; title160, description220, intent300 characters, nonempty; fact notes40 ×600; external links20 with HTTPS URL2048/label180/reason500/explicit boolean verified. Node stdin retains its 500,000-byte limit. Body is native, nonempty, at most300 blocks/200,000 bytes; citation control delimiters are rejected. Unknown/self/revoked page targets, unknown attached images and unverified external native links are rejected. A combined body/source patch validates against the resulting explicit source metadata. `verified:true` is operator input, never a verification performed by this command. The internal target graph must remain identical; media, assets, planning and other page fields are not patch controls.

The **requestHash** is the canonical digest of exactly this object, using the **original strict JSON patch**, before normalization:

```text
{operationId, creationId, acceptedRevision, sourceHash, canonicalHost, pageId,
 expectedSiteHash, expectedRevisionHash, expectedPlanningHash, patch}
```

No command/version/server path is included. Desired body and trimmed fact/source metadata are normalized separately. Runtime callers must admit only cross-language lossless JSON numbers/keys before subprocess execution; Root's adapter handles numeric leaves such as Python2.0 versus JavaScript2. Do not relax the final requestHash equality after a write.

## Receipts, evidence and reconciliation

Each case revision owns `reviewed-copy-amendments/<operationId>.before.json`, `<operationId>.json` and the exclusive `<operationId>.lock`. The first evidence is created exclusively and synced, never replaced. It retains the original full native page including body, exact binding, request hash and before-page SHA. The prepared receipt is synced before any call to `model.editPage`; it binds the evidence SHA, original page SHA, exact planned page projection and whether the native transition requires change. Page timestamps are managed by the canonical model, not copy patch fields.

An operation ID cannot be reused with another request, patch, page or expected context. Corrupt/partial/missing evidence is not repaired silently. Per-operation locks are exclusive, token checked and never stolen. The canonical model also takes its maintained studio write lock and rechecks site/page/planning hashes inside it before atomic native JSON replacement.

- Exact before state plus valid prepared evidence: execute the canonical edit once.
- Exact intended after state plus prepared receipt: reconcile to applied without another edit. Replacing the target page with its frozen before image must restore the exact original whole-site hash; unrelated page/site/assets changes therefore fail closed.
- Applied replay: require the exact recorded after site/page/planning/full-page hashes and planned projection; return the same receipt SHA without rewriting receipt or page.
- Any other state: stale/conflict/uncertain failure; preserve evidence and current bytes. Do not refresh hashes and blindly retry.

Evidence-only interruption before prepared can reconstruct prepared only while the exact original before state remains. A true no-op records an applied receipt without changing native bytes. Actual `model.editPage` retains `publishedRevision` and historical editorial evidence, sets private statusreview/approvalnull and makes a prior current review stale through the existing revision/context binding. Original GUIDE/jobs/intake/source artifacts and release snapshots are untouched.

The fault tests inject throws before and after the real model edit and allow `finally` cleanup. **They are not hard-kill proof.** A killed Node process may leave the operation token lock and `.model-write.lock`; retries remain busy until separately verified recovery of an owned dead process. There is no timeout/age-based lock stealing. A SQL rollback cannot undo an already completed filesystem rename; runtime authorization and receipt reconciliation remain separate obligations.

## Exact result

The existing operation envelope contains `command`, `result`, `deployment:'not-performed'`. Result fields:

```text
version='native-reviewed-copy-amendment.v1', state='applied',
operationId, creationId, acceptedRevision, sourceHash, canonicalHost, siteId, pageId,
requestHash, receiptSha256,
beforeSiteHash, beforeRevisionHash, beforePlanningHash, beforePageSha256,
appliedSiteHash, appliedRevisionHash, appliedPlanningHash, appliedPageSha256,
replayed:boolean, changed:boolean
```

All result fields `generation`, `sourceVerification`, `mediaVerification`, `editorialReview`, `approval`, `release`, `deployment`, `channelActivation`, `moduleAdmission` are **`not-performed`**. `changed` means this invocation changed the native page; it is false on applied replay and post-write reconciliation. `replayed` means prior operation evidence/receipt existed, including a recovered prepared operation. All before hashes equal the request's expected hashes; appliedSiteHash equals the returned current completion's expectedSiteHash. Receipt SHA is the canonical digest of the complete persisted applied receipt; replay flags do not alter it.

Failures include existing `workflow_context_stale` / `workflow_expected_context_required` / native input errors, plus `workflow_invalid_amendment`, `workflow_amendment_busy`, `workflow_amendment_receipt_invalid`, `workflow_amendment_receipt_conflict`, `workflow_amendment_uncertain`, `workflow_amendment_graph_changed`, `workflow_amendment_lock_changed`. Neither errors nor successful copy corrections grant another authority action.

## Actual verification

First regression: **1 FAIL in 2602.79ms** (`workflow_invalid_command`), retained. Initial distinct-command exact replay:1PASS1100.06ms. Expanded first11 reviewed-copy cases:11PASS22932.36ms.

Complete maintained workflow file: **36 PASS in 80911.46ms**, comprising14 new reviewed-copy cases and22 existing regressions, actual exit0. New cases cover raw Unicode request hashing and normalized values, immutable native before copy, strict bounds/foreign inputs, source semantics, preserved real raster family/internal graph, prepared-before/post-rename recovery, changed request/current page/site drift, corruption, exclusive and concurrent same-operation calls, no-op and actual current editorial review invalidation. Existing metadata-body refusal, media replay/recovery, independent model write races and approval/release snapshot preservation all pass. After a test-only variable shadowing correction, the affected review-invalidation selector again **1PASS2090.81ms**; no implementation changed after the full run.

Exact targeted invocation: `node --test --test-name-pattern='reviewed-copy invalidates an actual' content-studio/test/customer-content-workflow.test.mjs`. The first verification event's command label is shorthand for this actual recorded selector.

Python/PG authority/integration and actual case adoption are Root-owned later checks; this Node packet does not claim them. No paid call or accepted-case mutation was performed by this helper. Source regression and journal coverage are distinct from PR review/main merge/another PC adoption.

Functional frozen source is `49ea61ef98b804cb7cff74d1a5056597743d326c`, handed to Root for integration with its separately frozen Python adapter242df15. Helper source window is released; later helper changes are acceptance/PR metadata only. Local-verified status below covers the actual Node command/regression/safety scope, not the pending combined Python/PostgreSQL admission or actual case adoption.
