# Protected customer script uniqueness — 2026-10-12

Status: **SOURCE_QA_PASS; ACTUAL_SOURCE_ADOPTION_PENDING; CALIBRATION_UNVERIFIED**.

The root reproduced a gap on clean source `a9cebfa0b4b07cfb1a8b91f01ad48fdfb64d0902`: differently named cases carrying the same exact messages within one split were accepted. Three declared holdouts could contain only two unique scripts. Original private reproduction receipt `00b72586effd25f5e3c8af27523cc2f71d6f92083014454e0f37e4d3d3225129` records no database writes or provider calls; the original manifest remains unchanged. Focused negative regression preserved four failures and two passing cross-split rejections, log `2dfa8f4f46ebd2514ff0ede8472390ad5af5fdefa99fafd2e36339c0b31c57e6`.

The existing protected-manifest validator now rejects every repeated whole-script hash before starting a conversation. Case IDs and labels cannot inflate coverage. Exact compact/spaced corpus digest semantics, text bytes, split rules and full-script hashing remain unchanged. Two dialogs may share an initial turn when their continuations differ. Execution replicates remain separate from distinct corpus cases. No scorer, evaluator, controller, corpus, SQL, HTTP, model option or activation mechanism was added or changed.

Verification on the owned branch:

- 36 offline protection checks passed in5.44s, log `b652ceb412c47ef91352d5c7784172e71e76d3a445a135442e7f45855dbca90c`.
- Seven restricted PostgreSQL checks passed in126.55s; nine unrelated tests were explicitly deselected. Log `01ceaf76f6211736cc966ffa53161c4e1752367bd39de125a33ca278f107eb81`. Four negative same-split cases cover train/holdout and compact/spaced encodings: no new Conversation/Event/Job/Artifact/Outbox rows and no injected provider dispatch. Three existing positive lifecycle cases retain train candidate/static handling, holdout no-tuning protection and exact replay/history.
- Scoped Ruff and Git whitespace checks passed. Source review confirms that only the existing hash-map membership guard changed; the runbook records the rule.

Initial combined pytest collection failed because offline and PostgreSQL modules share a basename; original log `76e28597160f2248cbfe893851d7cdb75736065093274c759bb9f4778a8c70ac` is retained. Suites were run separately. Ruff exposed one missing test-only Event import, corrected before the final pass. Neither is reported as a model defect.

Before tracked writes, only the exact owned source-supervisor Windows tree was stopped, preserving37 committed proofs (`ad5facfcb9e60f1afb20807393bbed7141869cb91343a5a8db7fc6b51c05006e`), and the owned API44364 was stopped with PID/creation-time/command/cwd guards. No foreign checkout/process or operational rows were modified by source QA. Earlier calibration scores, original failures, manifests, approvals and expiry remain historical evidence for their original bindings.

This fixes future protected-input integrity; it does not regrade previous runs, prove useful model behavior, admit a customer module or accept ordinary dashboard UI, target-PC startup or public release. Real provider calls0; external_sent=false. Madbeauty email/inbox/reply processing is deferred by the owner. Customer setup continues on the existing configuration and calibration lifecycle.
