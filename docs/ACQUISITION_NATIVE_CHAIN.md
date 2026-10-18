# Native acquisition chain — source handoff

2026-10-18. Source-local implementation for issue 66, scope comment 6245040472,
upgrade681076b1-7851-493d-8cde-76fd7775d9a3. Root owns customer-agent readiness,
portal UI, actual saved Configs and operating adoption. This packet uses newly
created synthetic owner/config identities in an isolated owned PostgreSQL server.
It does not claim paid calibration, channel delivery, F1 or operating acceptance.

Frozen implementation base: `97d8c756f01a172bf844464a03a0e6eda848b8eb`.
Private main: `533597c10e290a2a09a522ad348e19c9968aa9d5`.
Read-only companion: `255fea0813bf1aabeaeea2f2de0b29564118f2fc`, based on public
main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Final runtime source is commit
`0ef135fa9c1e1d1716e951e41409e4ddbe8f6246`; the later handoff adds the sustained
heartbeat regression, this document and verification events.

## Behavior and authority

The existing normal-owner Task/Run flow now supports three typed phases:

1. Research runs researcher/reviewer under the current customer_research Config
   and authorization. It creates no canonical mail or Case.
2. Email consumes that exact successful immutable Task/Run/output handoff, then
   runs writer/reviewer under the distinct current email Config/authorization.
   Successful capture uses the existing canonical Case and MailMessage surfaces.
3. Reply resolves the canonical initial email Task, Case, latest inbound, revision
   and body fingerprint, then runs reply_coordinator/reviewer through the common
   worker. Its decision, captured mail, Task result and Run completion share the
   caller-owned transaction. Standalone Correspondence callers remain supported.

Both Configs must share the exact owner/Creation/Registration/Module/private
registration/source scope. Peer Config identity and expiry are checked freshly.
Completion reuses only the already-locked immutable parent proof in the same root
transaction; it never caches Git, private-file, target, lease or SQL admission.
After the final Git wait, fresh sealed bytes and current pair/target/inbound SQL
are checked before effects. Campaign stop, recipient containment, configuration,
authorization, grant and source drift prevent stale effects.

The common worker retains its 15-second lease. Exact-task dispatch is optional;
existing no-argument polling is preserved. Known and unknown model usage remains
charged on cancellation, denial and rollback. Campaign limits cover research,
email and reply together. Exact request replay returns retained results without
new dispatch; new requests cannot spend again for retained phase/target/inbound.

Additive migration0048 extends recognized0047 function definitions, Task kinds,
role barriers and phase/inbound unique indexes. Original0046/0047 migrations and
installers are unchanged. Historical rows are retained. Downgrade intentionally
refuses to erase native history; source rollback requires retained-schema-aware
code. All new activation flags default off.

## Protected native calibration protocol

`NativeWorkflow` supplies an optional hook to the existing maintained
`dialogue_lab.run_case`; it does not create a second model engine. Its trusted
caller uses normal-owner admission and dispatches the exact common Task. Role
prompts receive campaign/prospect/transcript, never persona or expected labels.
Evaluator reports include actual Task/Run receipts and native provenance.

A runtime manifest has version `acquisition-native-calibration.v1`, exact
source_revision, native pair, derived bindings, runtime campaign, original cases,
`corpus_sha256`, current evaluator hash and `protected_source: {path, sha256}`.
Both files must be bounded private runtime artifacts without symlink or Windows
reparse paths. Original protected JSON has exactly synthetic/now/campaign/cases,
synthetic=true, an aware original timestamp and unchanged cases/campaign facts.
Only an explicitly admitted new runtime campaign ID may differ. Malformed input
diagnostics are sanitized to avoid printing protected persona or labels.

The author freezes actual Registration site identity before sealing. Native
manifests accept that matching identity with strict canonical .test recipients
and synthetic evidence/fact bounds; legacy standalone synthetic-site validation
is preserved. A trusted binder may copy original bytes and verify hashes without
presenting the payload to the implementation agent. Every native admission
rederives current Config/Auth/Module/owner/source bindings. Original source time
is provenance; actual admission and expiry use current database time.

An exact episode reuses deterministic request UUIDs. Existing report directories
cannot be overwritten. A new episode for the same campaign/target encounters the
retained-stage barrier. An authorization bound to one manifest cannot authorize a
different manifest. A new experiment needs fresh explicit campaign/authorization
and private-registration admission plus a new manifest; original bytes/seal stay
intact. Reusing those cases is regression evidence, not a newly blind corpus.
Contact policy is shared by recipient within the exact private adapter scope;
retained history must never be cleared or case aliases invented to evade it.

The CLI `--native-binding --list` inspects metadata only and refuses native model
dispatch. Persona/evaluator execution needs a separately admitted allowance and a
trusted caller. No new allowance is implied here; the closed historical174/180
ledger stays untouched. The independently authored fresh six-case corpus has not
been opened or executed by this implementation agent. Known unit fixtures marked
holdout are synthetic fixtures, not fresh protected quality evidence.

## Verification evidence

Owned retained container: `wellness-native-chain-qa-20261018`, id
`8f8488391a79447ab3bd8effc15b446de817a7097d32e14b8125faae2e4aabdd`, loopback15549.
Final acceptance database: `pinet_acq_work_20261018042000`. Earlier development
DB `pinet_native_chain_20261018` used helper refreshes and is not the final
migration proof. Private URLs, passwords, source observations and raw logs remain
ignored in `agent-business-core/runtime/artifacts/native-chain-qa/`.

- Fresh schema 0047: 15 legacy preparation PG tests passed (run19).
- Fresh 0047→0048 migration: full-row hashes and counts unchanged for 15
  authorizations, 16 bindings, 24 attempts, 16 Tasks and 13 Runs. No helper refresh
  was applied to this acceptance DB after migration.
- Current source 0ef: 256 acquisition/mail offline tests plus 67 subtests passed
  (run22). Native offline cases are included.
- Current source 0ef: all 22 native PG cases have passing evidence across run23
  first 12 and run25 remaining 10 (350.75s). This is split evidence, not a claim
  that a single uninterrupted 22-case invocation passed.
- Native coverage includes exact R2→E2→reply2, one Case/three captured messages,
  normal-owner mail-view list/detail and Case correspondence projections,
  foreign-owner404, missing/unavailable translation without invented text,
  immutable handoff tampering, late Config/auth/grant/source drift, stale inbound,
  failed review, stop/privacy containment, cancellation known/unknown usage,
  rollback, queued email, shared campaign limit, exact dispatch and last-Git
  drift, sealed native lab/replay and retained-manifest denial.
- Sustained writer test passed with actual common-worker heartbeats for at least
  18 seconds, database lease windows in (0,15.5] seconds, unchanged 15-second default,
  four exact R2/E2 calls, one Case/mail and no unknown usage (run25).
- Legacy regression on migrated 0048: 99 passed, 1 skipped, 1 deselected in
  616.40s (run26). This covers model preparation/schema, common control Tasks,
  mail-view, canonical correspondence and standalone headless mail. The skipped
  case is explicit 0045 predecessor reproduction; the deselected case is the
  paid provider test. No existing test source was changed to obtain this result.
- Scoped Ruff over every changed Python file passed. Original 0046/0047
  migration/installers have an empty diff against the frozen base.

All model adapters in these checks are inert. No provider, SMTP, IMAP, discovery,
scheduler, live recipient or operating data was used. No manual browser/provider
or actual native calibration acceptance follows from these checks.

### Preserved failures and limits

Raw run0–10 preserve migration CASE/bind and SQL-precedence failures, fixture/RLS,
private-function privilege and receipt-field corrections. Repeated expensive
parent proofs exceeded the existing 15-second lease; correction reuses only locked
immutable parents within exact completion transaction, without widening lease.
Run11/13 retained fixture-default and usage-oracle failures. Run14 passed rollback,
last-proof revoke and known native lab cases; run15 passed the then-current 21
native cases. Run17 failed from missing scripts PYTHONPATH; corrected run18
passed 255 offline tests plus 67 subtests. These older passes do not replace current
source evidence.

Run21 reached the positive chain and owner GET assertions but failed the final
negative denial-code expectation. Commit0ef moved transcript ordering validation
after retained-decision detection, preserving the established stale/decided code.
Run23 then passed 12 cases and stopped on native_sources/source_unavailable during
normal-owner proof before the next Task/attempt admission. Three identical fresh
read-only source observations passed afterward (run24); no gate or timeout was
weakened. Run25 passed the remaining nine cases plus sustained heartbeat test.
Original failure logs remain unchanged; no root cause is asserted for that one
unreproduced source observation failure.

Earlier machine-wide disk containment paused the owned QA Python tree only.
Subsequent test/write groups required at least 1.5GiB free and ran sequentially.
No foreign processes, databases or original closed budget history were changed.

## Review and adoption

Own committed coverage against base97d8→7acb2a7 is PASS for all17 shared paths,
with no uncovered paths or journal errors. The default current-main533597c→7acb2a7
check is BLOCKED on inherited uncovered paths and old journal validation errors
outside this scoped diff. The first checker failure is retained in the task tool
history and the concrete dependency was sent to Root. Historical journal records
were not rewritten. Root's global integration must resolve that debt before
claiming main delivery; this packet does not claim the default gate passed.

This is a scoped source handoff to Root's integration branch, not main delivery
or operating adoption. Root must review/integrate it and separately record any
actual native Config/Auth allowance, protected-run execution, UI/provider proof
and deployment. Preserve the initial/final protected byte hashes and first
failures when admitting a later experiment. Do not retarget synthetic fixtures to
Root's saved business/config identities. No companion source changes are needed.
