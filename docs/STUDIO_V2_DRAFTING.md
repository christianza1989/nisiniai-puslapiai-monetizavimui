# Native V2 drafting

V1 keeps `draft-result.schema.json`. V2 uses `draft-result.v2.schema.json`: body definitions project the unchanged public V2 definitions through `v2CliSchema`. The CLI supports `anyOf`; disjoint literal branches replace public `oneOf`, single-value enums replace literals, and URL format is checked by the native validator after writing. Regenerate with `node content-studio/scripts/build-v2-draft-schema.mjs`; tests check the exact projection. The public validator retains its strict V2 rules. The native draft envelope supplies title/description/body, precise factChecks, future internal-link suggestions, selected existing source IDs and a private ImageGen brief. It cannot change identity, dates, author credentials or source/commerce/media snapshots.

The real initial CLI attempt rejected `oneOf` with `invalid_json_schema`; mocked writing was insufficient to certify CLI schema support. [Official Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) documents the supported subset. Failed execution keeps bounded diagnostic JSON only under private DATA/tmp, never in source or public packages; job errors point to it without echoing private prompt data.

Draft, draft-batch and coverage autopilot use the same adapter and explicit `gpt-6-luna / xhigh` CLI runner with observed-header validation and per-page private receipts. V2 legacy planning remains blocked: first reconcile the complete researched map into real UUIDs and full planningBrief. These draft operations cannot overwrite written, approved, published or revoked pages. Draft batches skip existing bodies; a missing full brief fails before any job is queued.

The runner saves exact structured result bytes under private DATA/tmp before acceptance and records their relative artifact path and SHA in its receipt. A later target/source/stale-state rejection therefore preserves the actual writing for agent inspection without importing it. Model/effort mismatch rejects before accepting a result. Do not promote a quarantined result without fixing and reviewing the actual issue; a receipt proves execution, not article quality.

Result acceptance validates the native public body and typed targets. Inline pages require approved same-site snapshots; future pages stay private suggestions. Sources must be separately retrieved snapshots; external URLs require separately verified evidence. Network links require their separate verification workflow. Commerce IDs must match verified snapshots. Images must already be attached assets. A model cannot mint these records. Actual source/media/presentation review remains separate; no output is automatically approved or deployed.

Under the shared studio write lock, the entire site snapshot is checked again before applying a CLI result. Any concurrent page/site/asset/brief edit rejects the stale result; there is no automatic retry or overwrite. Public revision/approval hashes exclude the new private generatedDraft metadata. Existing planning links are preserved without silent truncation. The actual publication subset and its final links must be explicitly reviewed; generation suggestions are not automatically promoted to live links.

For a first useful release, use `selectReleaseLinks(siteId,{expectedSiteHash,pageIds,decisions})`. Every selected page has one `{pageId,keep:[targetId],defer:[{targetPageId,reason}]}` decision covering every existing or generated proposal. Kept targets must be in that actual review subset or previously approved. Attached links cannot disappear through deferral; separately edit them if needed. Deferred proposals and their original reader reasons remain private in `deferredInternalLinks`, and the full original graph remains in planningBrief. A stale/incomplete/foreign decision fails atomically. Then finalize the selected links and perform actual review. This does not approve pages or erase the researched future graph.

Bounded execution on an existing private plan:

```powershell
$env:STUDIO_DATA_DIR = 'C:/absolute/private/studio'
$env:STUDIO_OUTPUT_DIR = 'C:/absolute/private/output'
node content-studio/scripts/draft-page.mjs <site-id> <existing-page-id>
```

This CLI refuses an active site job and never initializes tenants, invents topics, approves pages or publishes a release. The local HTTP draft and batch routes share the same adapter. Restart an owned server after updating module source; first wait for its existing jobs to finish.

For a concrete editorial correction to an existing draft, use `node content-studio/scripts/revise-page.mjs <site-id> <page-id> <request.json>`. The request must contain the exact current `expectedRevisionHash` and a specific `editorialInstruction`. This separately requested operation uses the same observed Luna/xhigh runner, full brief and native validator. It preserves identity, dates and any prior public approved snapshot, archives previous private generation metadata, and clears current approval so the new revision needs a fresh review. Coverage autopilot never calls it. A stale hash or concurrent site change fails without overwriting either version.

After writing, inspect actual assertions against retrieved primary documents and scoped specialist evidence, generate/import and inspect actual image pixels, choose dependency-complete links, check desktop/mobile rendering and metadata, record the six real revision-bound reviews, and use ordinary reviewed batch approval and immutable release export. V2 release requires exactly one approved home and every referenced page. Preserve V1 historical approvals; they are not V2 approvals. Export is not deployment; pass exact package SHA and directory through the target public-core shadow/build/hosted acceptance.
