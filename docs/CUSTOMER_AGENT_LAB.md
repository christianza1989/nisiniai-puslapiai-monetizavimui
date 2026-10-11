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
