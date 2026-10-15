# Session ID authority over the existing customer-agent lab

Upgrade `upgrade-a11d021c-30bb-4865-b079-0a1e9aa06ff0`, issue66. Owned helper branch `codex/verslomatika-session-authority-20261015` starts at coordinator `51a83116e38f2d4579da59aa88e26ba04951947d`. Paired freshness fetched core main `808581d919d06cb4a2d151cc7f9ec1be1782aba2` and public main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`; read-only companion source `1a26f289092cecadc5799de898e809dc1769498a`.

## Problem and scope

A claimed workspace Task has a canonical Session ID and native ProvisioningScope. The existing lab and independent Quality require an operator bearer. Reconstructing a bearer or inventing a second conversation/evaluator would bypass the maintained authority or duplicate receipts. This change provides an internal principal over the same transaction bodies, native conversations, UUID replay, Config/Profile binding, protected cases and usage settlement. Public HTTP/CLI/bearer signatures and receipt formats stay compatible.

The helper owns only `customer_agents/session.py`, shared internals in `customer_text/service.py` and `customer_agents/lab.py` / `review.py`, and its scoped tests, journal and handoff. The coordinator owns Task intent, progression, durable allocation, migrations and UI. No model/profile/evaluator/source configuration, protected thresholds, activation, serving process or accepted customer data is changed.

## Internal contract

`SessionPrincipal(scope: ProvisioningScope, fence: TaskFence)` is an internal frozen value, never accepted from HTTP or CLI JSON. Invalid/untyped/absent fences and invalid reconstructed scopes fail closed. The Session loader uses the exact Session ID, user and environment under canonical user RLS; it neither looks up a bearer nor renews a login. The same Registration lifetime, actor/Creation locks, current Foundation, Config, Profile, protected proof and source checks remain in force. A final fence/source check also runs after canonical awaited authority checks.

`TaskFence` has mandatory asynchronous `check(tx) -> None` and `reserve(tx, call: CallIdentity) -> None`. Any exception denies authority; any non-None result is invalid. There is no production default implementation. The coordinator implements fresh SQL Task/run/lease/cancellation/source checks and actual durable allocation. Callbacks receive the existing native transaction, must follow native parent/Task/policy lock order, and must not heartbeat or recursively enter native authority while those locks are held.

`CallIdentity` version `customer-agent-session-call.v1` is strict and frozen. It binds kind, Creation/Agent/Config revision ID/number/hash, Admission ID/fingerprint, Episode, Conversation, request UUID, native call key and number, actual model, source SHA, exact prompt/schema SHA-256 and optional protected-case hash. Its fingerprint is the canonical digest of its JSON representation. Text keys are `attempt:<turn UUID>` with number1. Quality keys are `quality-attempt:<native Quality job UUID>:<number>` with number1..2. Root binds this identity to its Task/run and preallocated slot.

The entry points are `lab.snapshot_session(principal, agent_id, expected_revision)`, `lab.episode_session(principal, frozen, messages, request_id, *, protected_case=None)` and `review.run_session(principal, SessionReviewRequest)`. Quality also accepts internal SessionScoredRequest / SessionTypedRequest through `parse_session_request`. No internal request admits a bearer or activation flag.

## Reservation and accounting

Text and Quality call `reserve` only for a new native provider reservation, after the existing UUID replay checks and before inserting the existing provider-attempt event in that same transaction. Authorization polling invokes checks without consuming allocation. The provider still runs outside SQL transactions. Frozen business-scoped settlement records observed usage even when Task authority or the Session is later lost; late output and Quality acceptance remain refused. No accounting operation grants new provider authority.

## Verification history

- Initial missing-module reproduction: 1FAIL in0.13s, before implementation.
- Expanded inert tests initially had 14PASS/2FAIL because their binding fixture omitted specification; fixture corrected without changing runtime requirements.
- Combined regression exposed 145PASS/2FAIL: the shared AccountedLab path bypassed existing bearer reservation/authorization interception points. Thin legacy dispatch was restored; existing tests were retained.
- Current offline command: `python -B -m pytest -q -p no:cacheprovider offline_tests/test_customer_agent_session.py offline_tests/test_customer_agent_lab.py offline_tests/test_customer_quality.py offline_tests/test_customer_agent_protection.py offline_tests/test_customer_competence.py offline_tests/test_customer_typed_checks.py` — **152PASS**, latest4.83s; two existing Pydantic model_fields deprecation warnings. Includes inert text/Quality same-transaction reservation, zero allocation, replay, no reservation on polling, final authority/source loss and usage-before-denial checks.
- Final callback review reproduced a Session deadline gap: the awaited Task callback could return after the canonical Session observation expired (targeted2PASS/1FAIL, DID NOT RAISE). The adapter now checks the held Session's deadline without another await after callback/native authority completion, and rechecks source after the callback. The same combined command now reports **153PASS in6.23s**, with the same two existing warnings. This follow-up requires the coordinator's final-source PG rerun; the first frozen QA candidate was `a4a6d23f27aa75be9341d7db3c3536945ab972f6`.
- Ruff on the four source files and both scoped test files passed. Initial source import order and test import diagnostics were corrected, not suppressed.
- The direct-executable freshness wrapper cannot launch Windows npm shims; two attempts exited1 without executing npm. Using `-- node <npm-cli.js> ci --prefix content-studio` passed and installed the existing locked five-package dependency set; no manifest/lock change.
- Restricted PostgreSQL tests are committed for the coordinator's explicitly agreed private QA launcher. They cover Session-only lookup, exact native replay and bearer reconciliation, zero allocation, stale/foreign identities, Task cancellation, logout with usage, existing Quality/protected holdout and Session typed checks. Providers and the allocation fixture are inert. **PostgreSQL execution is pending; this candidate is not fully accepted.** No credentials were copied or probed by the helper.

## Remaining acceptance and limits

The coordinator must run the exact committed candidate in a newly isolated restricted-role PostgreSQL database, retain original0032 and serving data, and return sanitized source/selectors/results. The helper then fixes actual scoped regressions and completes its journal and PR. Default main-based coverage is known to include inherited foreign journal failures; only exact coordinator-base-to-helper-head coverage describes this packet. No foreign historical journal is rewritten.

This adapter is not actual Task admission, full calibration, protected learning/adoption, voice/email/UI acceptance or runtime activation. Genuine current Foundation/Profile and the coordinator's durable nested-call allocation remain required. Reverting the scoped adapter source preserves native conversations, attempts, usage and protected receipts.
