# Saved customer task in the existing local calibration entrypoint

2026-10-11. Scope: an exact saved `site_chat` task can drive a private local text episode through the existing `network_lab.py` entrypoint and `customer_text` executor. This is an execution witness, with `calibration_status=UNVERIFIED`, `module_admission=not_admitted` and `activation=not_performed`. A completed episode is not a quality score, protected comparison or agent activation.

## Reuse of the existing system

The owner explicitly requested that existing calibration be reused. The canonical [business-agent-calibration skill](../SKILLS/business-agent-calibration/SKILL.md), its [runbook](../SKILLS/business-agent-calibration/references/runbook.md) and [create-and-calibrate contract](../SKILLS/business-agent-calibration/references/create-and-calibrate.md) remain authoritative. The dated [2026-10-03 learning report](../voice-agent-plan/AUTONOMOUS_LEARNING_2026-10-03.md) records earlier real runs and retained failures; those are historical evidence for their own source, profiles, knowledge and releases.

| Existing component | Treatment in this increment |
| --- | --- |
| `scripts/network_lab.py` | One entrypoint, with a mutually exclusive private customer-task mode that returns before the static lab's corpus/V1 load, environment mutation, model/judge/postcall and cleanup. |
| `learning_controller.py`, `calibration.py`, `adaptive_instructions.py` | Reused as the existing learning/admission/comparison/promotion mechanisms; unchanged. This episode does not invoke or bypass them. |
| Protected `evals/learning-v2`, older corpora/registries, packaged niche instructions | Unchanged; no new copies, relabelling, old score updates or holdout exposure. |
| Static `profiles.py`, `agent_instructions.py`, `onboarding.py` | Unchanged. Existing learning remains limited to its admitted static profiles and V1 source; customer V2 is not downgraded to pass that gate. |
| Existing `customer_text` provider transport, tools, ownership, history and accounting | Used directly. The new binding adds the exact saved Agent/Config and Profile snapshot to existing dispatch and acceptance checks. |
| New `customer_agents/lab.py` | Data/binding adapter only: snapshot validation and a bounded episode; no scheduler, judge, learning controller, corpus, provider, promotion or activation engine. |

The small untracked standalone CLI prototype was folded into `network_lab.py` before source delivery; its exact bytes are preserved privately. The existing evaluator fingerprint includes `network_lab.py`, so this source change creates a new evaluator fingerprint. Historical reports retain their original fingerprint. The existing fingerprint implementation, criteria and protected inputs are unchanged.

## Exact task execution

The operator supplies a private request under `runtime/artifacts/`: bearer, creation ID, agent ID, expected Config revision, a fresh request UUID and 1–8 synthetic customer messages. The existing private JSON reader has a 4096-byte input limit. Do not put bearer values, contacts, raw replies or receipts in Git or source transfer packages.

From `agent-business-core/runtime`, use the existing entrypoint after the paired freshness gate:

```powershell
uv run python scripts/network_lab.py --customer-task-input artifacts/request.private.json --customer-task-receipt artifacts/new-episode.private.json
```

Both paths must resolve inside the owned private artifacts directory. The output must be new and is reserved before authority, DB or provider work. Static `--site` and customer-task mode are mutually exclusive; customer-task mode rejects legacy learning/evaluator options. Static mode still requires its site and run ID; its execution path is unchanged.

Only explicit local/test customer-agent and text-runner authority can execute, with voice and SMTP disabled. The task must be current `site_chat`, belong to the same exact Creation/Registration/user/session/environment/source, and have a current Profile. The Config ID, revision, specification hash and Profile fingerprint are frozen for the episode. Each dispatch and reply acceptance rechecks them through current authority. Config changes or revocation reject stale output while preserving observed provider usage. No PostgreSQL locks are held over the model wait.

The model receives the saved task as untrusted proposed behavior within existing core rules. It receives only Agent ID, Config revision/hash and task specification from that binding; session/user/Profile identity is not added to model input. The task cannot grant channels, tools, business facts or new permissions. Existing approved V2 knowledge and typed `need.patch` remain authoritative.

Each step uses a deterministic UUID derived from the episode UUID. Exact replay reuses existing replies and the original need revision, including multi-step revisions; changed script material conflicts instead of making an extra call. Failure stops the episode; no automatic new request or retry hides it. Original history, fingerprints, attempts and usage remain durable. A private receipt/write/disposal failure is not a rollback of accepted turns. Public generic text requests cannot execute the private task binding; the current owner can still inspect its retained history.

## Acceptance boundaries

Source QA, actual configured model execution, protected multi-client quality/calibration, module admission, authenticated ordinary dashboard UI, target-PC execution and public launch are separate. Source tests use an isolated restricted PostgreSQL role and injected provider; they do not establish real model behavior.

The next integration must feed exact customer V2/Config evidence into the existing versioned quality/protected-comparison lifecycle and provide revision-bound module admission. It must preserve train/holdout isolation and current owner/source authority. This increment supplies no alternate evaluator, automatic promotion or boolean calibration shortcut. Dashboard calibration/start controls, real email/acquisition channels and Xbot per-module acceptance remain open. Language quality remains UNVERIFIED while owner-requested language correction is paused; Gemini is deferred.

Source reservation: [initial scope](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/77#issuecomment-6109307081), [existing-runner reuse supplement](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/77#issuecomment-6109447595). Delivery remains [draft PR80](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/80), without main merge or platform completion.

## Source verification at this checkpoint

- Frozen exact-binding PostgreSQL: 10 PASS, 71.48s, log SHA `17a36f2f1872aadeff2466c1dd85a791af6ac81673416401f0feac5e8d96b3c0`. This includes Config changes during provider wait, stale output rejection with retained usage, foreign/tampered binding denial, corrected needs, multi-step UUID replay and generic-public execution denial.
- Existing protected learning/calibration/instruction/adaptive/Codex suites: 20 PASS, 14.14s, SHA `47b49b4b827d4aba3fa6fb42f71c1ae1e7efa17a55d0cad5c6e813e6844d9053`. No real providers were called.
- Final runner/offline/text/agents/full-route checks: 79 PASS, 5.43s, SHA `ae6664d0cc3c657173d71b894e0f97dcad85601f1aef1d2895955ab67cac9498`. Only the test engine stub changed after its first run; production source stayed exact.
- Existing customer text + agent PG regression: 69 PASS, 555.39s, SHA `d0a4ff8fe5c31f835e7526bbc3379baa74076586790e24fa8710993d4c26e5c5`, before the runner-only integration. Those shared execution sources remained unchanged in the final runner checks.
- All 87 frozen pre-existing corpus/registry/instruction/controller/profile/onboarding/contract source files remained exact. Read-only independent source review found no P0–P2; that review is not QA or actual model evidence.

Original failures remain private: first lab test 1 FAIL/9 PASS due to a test assertion reading nested token usage at the wrong level, SHA `df11fd8f1728bf1580289c69d826a357e8ecb4776383e04b72d41db207086b2d`; first runner checks 75 PASS/4 setup errors from trying to monkeypatch a read-only SQLAlchemy engine method, SHA `ec364e3c57d69f53dc3d5da8d96b0edbad67bccc247fdb765f8ba62e6255db57`. The test-only corrections preserved accounting and production checks. One freshness wrapper command used an executable relative to its runtime cwd although the wrapper runs from repo root; the child did not start. It was corrected with absolute executable/script paths, without provider or DB effects.

All source-QA receipts pin their files, report unchanged source, zero provider/channel calls and an untouched operational database. These numbers do not assert real model quality, autonomous customer V2 learning, ordinary authenticated UI, target-PC or public launch acceptance.

## Customer quality evidence and existing lifecycle

The additive adapter fixes an actual restricted-PG failure: `jobs.load_input` expected legacy `coverage`/`release_hash` and omitted accepted customer reply events. Original 1 FAIL/41.48s log SHA `2048f020fc3eb30e1f6d66fe519ab41ab14392f7cae738bde86a975dcec7b78f` remains private and unchanged.

`customer_agents/quality.py` projects real client transcripts and only succeeded `customer_text_result.reply` events, preserving original IDs and sequence in the existing transcript/timeline shape. Failed/interrupted/provider material is not an agent reply; missing replies produce incomplete coverage. Contact chronology includes channel/state receipts rather than stored contact values. Need corrections remain the original saved need.

Factual input must match the retained Profile's exact admitted V2 reference and immutable index receipt. Expired, changed, revoked or unadmitted source provides no current facts and cannot invoke the injected evaluator. Reads do not renew TTL, import knowledge or create a Profile. The Config/Profile parent derives from retained behavior/source material, excluding principal Session, episode UUID and client-script identities. Different test scenarios/logins with the same exact Config/Profile share that parent; Config/Profile/source changes produce a new parent. Full execution Binding remains exact and separate. No later Config or retroactive legacy fields replace historical Conversation payloads.

The adapter reuses `bound_schema(Quality)`, packaged customer-profile quality text, contact chronology, independent root-cause attribution, observable guards and `complete_artifact`'s quality → issue → candidate → static evaluation lifecycle. A candidate remains unactivated and requires protected comparison; V2 learning admission stays false. Static admission uses the same immutable derived parent. The existing evaluator fingerprint now includes dynamic customer-agent/Profile/text Python sources; historical fingerprints and protected corpus/controller/criteria are retained.

Acceptance takes canonical policy/index source locks before artifact flush and its Conversation foreign-key lock. After awaited static/fence operations it repeats exact source/receipt/TTL verification, then synchronously checks the held job lease. Failure rolls back proposed quality/issue/candidate artifacts. Original expiry-after-final-fence and concurrent policy-disable deadlock were reproduced before the fix: 2 FAIL/29.58s, SHA `6d95478591601f4f4746b3cc3bb97c04cb308c1ecdb196e469a361a804eae1ed`. The replacement frozen QA is separate.

This increment has no customer quality provider entrypoint. `jobs.evaluate` denies customer evaluation before legacy learning/Gemini dispatch; `local_semantics` denies implicit provider creation and customer analysis, accepting only an explicitly injected quality consumer for source tests. A separately bound, durable/accounted evaluator must recheck current owner/Session/Registration/Profile/Config/source at dispatch and acceptance. Read-only evidence and a quality artifact supply no such authority. Language remains UNVERIFIED, with language-only rejection paused. Actual independent model quality, protected train/holdout comparison, module admission, dashboard calibration controls and activation remain OPEN.

Scope: [quality bridge](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/77#issuecomment-6109753493), [fingerprint supplement](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/77#issuecomment-6109788057), upgrade `eafc2462-b48e-4ee0-89c5-2504d66ae259`; delivery stays in draft PR80.

Before the final parent-material correction, frozen source checks: 9 restricted PostgreSQL PASS/101.85s, log SHA `0d192e6c92d38b5bc36bd2c4abc79eb4ce468449e3c3771ced93dbee74627bcc`; 23 offline PASS/3.32s, SHA `7e23d51387a9bb81ca059b2a3b9e9977a6c0e8940be49de39e9c6dbd4f5a976e`; 28 existing quality/calibration/learning PostgreSQL PASS/11.07s, SHA `5b777483a3b1e30a475eba95087677c8f2918518d50b278c91bbebb53e47af31`; 36 affected legacy worker/core/budget/onboarding PostgreSQL PASS/44.82s, SHA `b4155ce0effdd9a6484cea524e674990dacd791ac7a4f66169c05156fe185ceb`. Source and unaffected protected inputs remained exact, provider/channel calls zero, operational database untouched. Independent final read-only review closed both reproduced P2 and found no further P0-P2. This is source validation, not actual quality model evidence.
Final parent-material source verification: 26 offline PASS/3.34s, SHA `24dfc4b52938e9f4f2c60162e0d6c666651653182b90b015882b809653602528`; 9 restricted PostgreSQL PASS/106.15s, SHA `8d95818459042b41d9f15c0cdd60cdfd4aa19d43c2f9c0d6ca3fb721ea348de8`; 28 existing quality/calibration/learning PostgreSQL PASS/18.48s, SHA `0f569447d1e5606332ade50ad15138c161fc076e45a47d121a991c595b641fa6`. Original parent-invariance 3 FAIL/8.82s SHA `e22df7595b4c81ee6383441215b78c3ac718bc79709a1657fad9d868b103863d` is retained. The 36 legacy-worker checks above exercised identical shared jobs/semantics/calibration/fingerprint source before only the customer parent material changed; legacy paths do not invoke that helper. All frozen receipts preserve tested source, unaffected protected files, zero provider/channel calls and untouched operational DB. Read-only final reviews are separate from test/model evidence.

## Actual owned local execution

Functional source `cd902f6e38c3fa08e657f1c0ad6cceb35c05223a`, companion `5924a2eb858cf45e736bc5e79a2f07cfbbc39af2`: metadata-only adoption preserved schema0023 and every operational row (receipt SHA `a3e0f2947da53fa63256d83d5131bc825ac427221e4213d6ecac6320eabfdbbe`). Explicit source/Profile preparation then the existing saved synthetic site_chat Config revision2 completed a two-message fixedLuna episode through network_lab. A client budget correction was persisted at need revision2. Exact UUID replay added no calls and changed no operational rows; historical reopen reproduced all events/need; existing Agent/Config rows stayed exact. Two known provider usage receipts, monetary cost UNVERIFIED, zero channels. Actual receipt SHA `3fea802065913eab2da64aca51413861cace90839bf4ba7081152c51fc4bb17f`. This establishes configured execution and retained accounting, not independent quality/protected comparison, calibration/admission/activation, ordinary authenticated UI, target-PC or public launch.

## Explicit independent customer Quality dispatch

The existing network_lab entrypoint now has a mutually exclusive private mode:

```powershell
uv run python scripts/network_lab.py --customer-quality-input artifacts/request.private.json --customer-quality-receipt artifacts/new-receipt.private.json
```

The strictly typed request carries bearer, conversation_id, request_id and the exact retained Episode. Input and newly reserved output must stay under runtime artifacts. This delegates to the existing local_semantics Quality schema, contact chronology, independent attribution, observable guards and the same Quality/issue/candidate/static lifecycle. No second controller, corpus, criteria or promotion runner is introduced. Static and generic-learning routes remain separate; customer V2 learning is unadmitted.

Before any per-call provider reservation, the adapter checks current owner/Session/Creation/Registration/Profile/Config/source, complete accepted transcript evidence, unchanged input and evaluator fingerprint, and the maintained validated fixed Sol model profile/catalogue. Durable request and per-call events freeze binding/input/evaluator/model-profile/prompt/schema hashes. The exact existing no-tools/no-web/no-retry transport is reused. A generic job worker cannot recover or retry this private Quality dispatch. No PostgreSQL locks are held during a model wait.

Each actual call gets one durable usage receipt, with unknown monetary cost retained as null. Settlement uses frozen exact business/job/Conversation identity and survives Session/Config/source revocation. Known usage is completed by one shielded settlement task even when the caller is cancelled during its DB wait. Exact request replay reads running/terminal status without another call; changed request material conflicts, and expired attempts become interrupted without implicit replay.

Acceptance runs the existing guarded lifecycle inside the same canonical customer-authority transaction. It repeats exact evidence/Profile/Config/source and final lease/Session/Conversation time checks; stale output rolls back Quality/issue/candidate artifacts while retaining usage. A saved quality result is not protected calibration, module admission, activation, ordinary dashboard UI or public launch. Language is UNVERIFIED and language-only rejection paused; live channels/Gemini stay off.

Source validation:71 offline PASS4.86s/logSHAa7986b68372031551acf6a4c0141aedd2417a19301c2fe7f8067c542c43f8835; actual restricted PG23 PASS plus1 test-fixture error276.19s/SHA36b9b99b33f6c1f87e3b9a24abad774f9f148011e3ffb812a01cfe58163775b1, then the corrected Config-mutation case1PASS11.14s/SHAe529baf5b8a3fdc602d66c31b5d0ca613d4f624b4431c3314e83a44228985155. Production source stayed unchanged; the fixture used base_revision instead of the existing expected_revision.55 existing quality/contact/calibration/controller/core/budget PG regressions PASS65.49s/SHAe0510f976e899d54805562a3a7d6dbf82ccbd91e8c7c9916bb9561c58715bd05. Frozen source and unaffected protected inputs remained exact, providers/channels0, operational DB untouched. Independent final read-only review found no P0-P2; it did not run tests/models.

Original first QA15PASS4FAIL187.88s/SHAec9eec653783008dea8f60d143f4a69563d5a7088761d31d9414d34360fffc21 and the test-only required-field failures are retained. Two actual P2 regressions were separately reproduced before fixes: missing Sol catalogue1FAIL3.14s/SHA18e10aefe6df453559d1e4da07da14c1d1d51dd3ccf6f26edf6163c2c8281fa2, cancellation after known provider result during settlement1FAIL17.04s/SHA2cbb70b5d204fd112c8483e87d80207fe177ef358f86f8c69d7df619831f1798. Combined same-name test collection initially exited4 with zero tests; its logSHA12dda35cba5384c9a577ee8c3f314d7bc6b7002818691c573f1d34b06c7972ce remains unchanged. Separate-process regressions and the final source checks did not weaken acceptance.

Scope issue77/comment6110087356; upgrade032bab14-1795-4101-b4b0-b5f460f4ed97. Draft PR80 delivers source; actual independent model validation follows clean source adoption and remains separate from these injected-provider checks. Overall platform OPEN.
