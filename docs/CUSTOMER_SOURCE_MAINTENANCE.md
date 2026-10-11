# Explicit unchanged customer source maintenance

2026-10-11, upgrades636ddb81/ec68278a, issue77. This local operator path rechecks the complete approved V2 projection without replacing the admitted Profile or its original knowledge/index receipt. It addresses the observed identical-reimport baseline: a new transfer otherwise changes the receipt and explicit preparation appends another Profile. It does not implement calibration, a scheduler, module admission or activation.

## Inputs and transaction

Run `agent-business-core/runtime/scripts/customer_source_maintain.py --input <private.json> --receipt <new-private.json>` in the configured owned local/test runtime. The input extends the maintained source-sync request with the exact current execution source revision, Profile admission ID/fingerprint, timezone-aware expected freshness timestamp and a UUID request key. `admit_source` must be false. Credentials, requests and receipts stay outside Git and source-only transfer kits.

The operator requires the current verified customer account, owner membership, live authorizing session, exact accepted Creation/Registration/Grant and current immutable Profile/instructions/execution pin. SMTP and voice must be OFF. Source TTL expiry is the sole recoverable Profile blocker; changed authority, facts, revisions, deployment, instructions or execution source require their own explicit admission. No customer GET, login, task-draft save or replay silently refreshes source time.

Lock order reserves Registration lifetime and canonical actor locks, then exclusive policy BEFORE the first index read. It must not upgrade a shared policy lock while holding the index lock. The unchanged-source operation uses the existing complete projection transport and canonical begin/batch/commit validator. All knowledge metadata/pages must match exactly except the freshly observed `generated_at`; partial transfers, revoked facts and changes roll back. No model, live channel or paid research is used.

After verifying the complete transfer, the transaction restores the original knowledge payload and index receipt exactly, leaves revision/hash/deployment/Profile identity unchanged, advances only `KnowledgeState.refreshed_at`, and appends immutable `SourceRefresh` evidence. Profile source reads recognize only an exact valid proof anchored to that historical receipt. A bare timestamp edit is rejected. Reads repeat canonical source/TTL validation after the proof lookup and never change the timestamp.

The proof establishes historical complete-source freshness independently from current module/Profile authority. A later explicit Profile admission or partial fact revocation does not erase that evidence. Current authority, current knowledge revision, revocations and module activation retain their separate gates. This proof does not extend an Xbot binding's fixed admission deadline or grant additional permissions.

## Evidence, conflicts and failure

Migration `0023_customer_source_refreshes` adds the immutable proof table and an exact Profile identity constraint. Forced RLS allows the current owner/environment/grant to SELECT; runtime cannot insert/update/delete. Profile and authorizing Session provenance use RESTRICT foreign keys. A populated downgrade refuses history loss. This narrow provenance guard does not change all existing retention policies.

The UUID request and full material fingerprint reconcile an exact committed reply. Replay returns the existing proof and never reimports or renews time; it fails after a later refresh supersedes it. New requests compare the expected timestamp under the same lock; concurrent requests have one CAS winner. Twenty-one successive complete rechecks retain one Profile and all twenty-one proofs without a lifetime counter.

Private receipt files are reserved before database work and fsynced as prepared before commit. Clean Git and current authority/source are rechecked after blocking Git and receipt writes. The final proof/source wait is followed by current actor/session validation and a synchronous TTL check after the last awaited authority query. Failures roll back database changes while preserving prepared receipt bytes. A marker/disposal failure after commit is explicitly classified as `committed_receipt_unavailable`; inspect the prepared receipt and actual proof before exact reconciliation, and do not assume rollback.

The related canonical `knowledge.current` repair adds explicit transaction business/environment predicates. Admin BYPASSRLS must not select a different business's first knowledge row. RLS remains an additional boundary; this is not a replacement authorization mechanism.

## Acceptance boundaries

Original baseline, intermediate harness failures, actual policy/index deadlock, cross-business contamination, new-admission/partial-revocation interference, final TTL/session expiry and postcommit disposal failures remain preserved in ignored private receipts. Scoped source QA, clean owned operational migration, actual complete nine-page maintenance, authenticated UI, target-PC startup and public deployment are separate acceptance stages. Their latest evidence is recorded in [implementation status](../sites/verslomatika/IMPLEMENTATION_STATUS.md).

No browser session, model call, conversation event, accounting entry, agent configuration, channel activation or public deployment is created by this command. Calibration/language remain UNVERIFIED; language-only checks are paused by the owner's instruction. New execution source commits still require explicit Profile admission; historical Profile fingerprints are never rewritten to the new source.

See [Profile contract](VERSLOMATIKA_CUSTOMER_PROFILE.md), [atomic preparation](VERSLOMATIKA_AGENT_PREPARATION.md), [customer task drafts](CUSTOMER_AGENTS.md) and [Git workflow](CODEX_GIT_WORKFLOW.md).
