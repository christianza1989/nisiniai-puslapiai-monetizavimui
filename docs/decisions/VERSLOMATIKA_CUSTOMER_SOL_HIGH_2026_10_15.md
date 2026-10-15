# Canonical High customer-agent execution pin

Status: source candidate; **High native PostgreSQL acceptance is pending**. This packet starts at coordinator `519df2565036ef9bde1508cf80b584e12f59ce92` in owned `codex/verslomatika-customer-sol-high-20261015`. Paired fetch verified main808581d919d06cb4a2d151cc7f9ec1be1782aba2 and read-only public companion1a26f289092cecadc5799de898e809dc1769498a/main ec8a9c032fe926d1d9722802d8eb26fa8bd02937.

Source upgrade `upgrade-d27cef34-daee-40f0-90e1-9d89fe1908f6`, issue66/comment6184148785. Separate test-clock repair `upgrade-9f62d97a-5e18-4a79-be2b-aecbc1bbd192` is described below. Original Session552 has separate127-case acceptance and PR154; those results do not verify this new High source.

## Maintained implementation

`customer_text.execution.Pin` is strict frozen metadata over the existing `creation.execution_profiles.SOL_HIGH` (`local_sol61_high_v1`). Its text/quality RoleProfile values come from `creation.adapter.pipeline_profile` for creator/critic. Each fixes6.1 Sol/high/verbosityNone and the canonical catalogue hash; its fingerprint is the canonical JSON digest. This is not a registry, evaluator, executor or runtime permission.

`capture_high()` requires the admitted local/test runtime selection and canonical catalogue. `current(pin)` deep-validates the same pin against that current selection. Shape-only retained validation supports historical data under another current selection. High transport reuses the existing argument builder with explicit execution_profile, webFalse, no tools and the same bounded `execute`; independent critic uses High rather than the unrelated default Medium role profile. Existing public adapter/evaluator/bearer/CLI signatures are unchanged; internal High wrappers share execution bodies.

`SessionPrincipal(scope, fence, execution_profile=pin)` owns the server choice. Snapshot/Episode stores it only when present; wrap serialization omits absent metadata even inside the retained Binding. Bearer requests cannot execute a High Episode. Current pin, source and Task authority are checked before reservations and after awaited checks; CallIdentity derives the immutable profile hash/effort from native binding. Missing optional fields are omitted from old CallIdentity fingerprints.

Conversation binding, provider attempt, Quality job/attempt and usage retain the profile hash and effort. The real argv is checked immediately before execution; captured actual model, effort, argv SHA and profile SHA survive success, failed arguments, provider error and cancellation. Captures are stored outside `usage_receipt`, whose nested token shape is unchanged. Settlement uses the frozen binding and captured metadata after Task/session/profile authority loss; it does not consult current model selection or relabel old usage.

History, Quality parent, need/typed receipts and evidence validate the exact retained pin and matching attempt/usage, including captured execution proof. Merely accepting a second model literal would be insufficient. Old default Luna/Medium histories, manifests and parent hashes retain their serialization. New High cases use a new source-bound frozen Snapshot/corpus/manifest; protected criteria, split/tuning and admission rules are unchanged. Public Start/Turn and Capability remain default Luna; only SessionView's existing output model enum can represent retained Sol history. The canonical customer-text contract is regenerated; Root owns portal synchronization.

## Separate metadata preflight

Final caller API:

`lab.snapshot_in_transaction(tx, session, creation_id, agent_id, expected_revision, *, execution_profile=None, lock=True)`

It shares the exact Snapshot body with existing snapshot/snapshot_session and returns metadata without a TaskFence or model authority. Canonical Profile projection always retains policy/index/KnowledgeState locks, including with lockFalse; the flag only controls Registration/actor/Creation/Agent locks. Root explicitly accepted a separate committed preflight Scope that reloads the exact authorizing Session, captures ProvisioningScope and Snapshot, then closes all native locks BEFORE outer chat-admission/Task/global quota locks. The actual worker must recheck the frozen values with the real running TaskFence. No nonlocking Profile variant or permissive preflight fence was created.

## Evidence and preserved failures

- Baseline positive High capture test failed1/1 in1.76s because the metadata adapter did not exist.
- First transport/default regression43PASS2.57s.
- Expanded customer regression183PASS/4FAIL18.31s: the old inert Session binding fixture omitted native model. It now supplies the same existing default model that real native binding has always carried; runtime validation was not weakened. Initial import-order diagnostics were corrected.
- Current customer/High offline cohort: **389PASS8.20s**, including19 High cases, actual canonical argv via inert execute, success/error/cancel and argument-drift captures, legacy/nested hash invariance, exact preflight body, historical High reading and first-permit profile drift. Two existing Pydantic model_fields warnings remain.
- Scoped Ruff passes; native High file collects **8 cases**. These cover separate preflight, exact High text replay/history, Task/profile loss usage, bearer/pin denial, protected typed High Quality with one/two independent calls and replay, and snapshot drift. Native execution is pending Root's separate frozen checkout/private QA launcher; no helper credentials are copied/probed.
- Read-only AST comparison against519: **70 existing public function signatures and6 request/capability schemas unchanged**. Start/Turn contain no model/profile selector. Canonical output contract changes only its description and SessionView model enum.
- Existing locked content-studio dependencies installed through the paired freshness wrapper before QA preparation; no manifest/lock version change.

## Inherited clock fixture repair

Adding the existing pipeline-profile regression exposed **404PASS/4FAIL8.55s**. The unchanged creation clock reserves300 seconds for creator and150 for critic, while that old offline argv/receipt fixture supplied30. It therefore correctly raised run_timeout before mocked execute and could not exercise four intended assertions. Root explicitly released only `offline_tests/test_pipeline_execution_profile.py` for this repair. Its two run_role calls now use `deadlines.job_seconds(SOL_HIGH)`; all actual argv, provider-error and captured receipt assertions remain. The complete file reports **21PASS2.72s**. No runtime/deadline/threshold/creation adapter was edited. The389-case and21-case cohorts are410 unique offline passes, not a claim the original failed invocation passed.

## Scope and remaining gates

Root owns Task intent/profile/budget matching, progression/heartbeat and portal/UI. This helper owns the execution metadata/adapters/bindings/readers, scoped tests and canonical output contract. No provider call, configuration edit, operational DB mutation, serving activation, clock/lease change or deployment occurred. Module calibration/admission remains UNVERIFIED/not_admitted. High source acceptance requires exact committed frozen-source native regression, original failure preservation, scoped journal/coverage and review; actual High model success and operational adoption are separate.
