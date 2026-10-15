# Bounded workspace invocation of the existing native lab

This source boundary supports the owner's requested coordinator → saved agent → test episode → existing Quality chain. It reuses the maintained Task worker and `customer_agents.lab` / `customer_agents.review`. It is not another calibrator, evaluator, scheduler or provider executor. Follow the [canonical calibration method](../../SKILLS/business-agent-calibration/SKILL.md).

## Current adoption boundary

The active local API remains immutable `bef7476d32b59314c7bc0c721127cee4f26f8a0e` on 18871 with its existing 0039 database, UI3030 and Studio4319. The accepted private site and all earlier receipts/data remain intact. This accounting source is being verified in separate restricted QA databases. It has no customer dispatch route, automatic coordinator intent or activation flag yet. Source-only tests must not be reported as a completed calibration run or actual business admission.

One native-only intent allows one frozen episode of up to eight normalized client messages and at most two existing independent Quality calls. It cannot dispatch ordinary plan/adviser/synthesis phases using that allowance. If a later intent includes coordinator model calls, those calls need an explicit additional reservation and a revised reviewed bound. Do not label nested model calls as ordinary adviser attempts.

## Exact intent and authority

`EpisodePlan` freezes the canonical ProvisioningScope and saved Snapshot, independent episode/Quality UUIDs, normalized script and digest, protected proof identity and Quality input digest. The Quality intent digest uses the maintained parsed request, excluding only bearer and the later-generated conversation ID; all Episode, request, scoring and typed-reference fields remain pinned. The actual conversation ID is independently bound by the native lab. This is private test data, never business facts or tools permission.

The internal Session principal requires a concrete TaskFence. A root fence verifies current Task/run, original owner/Session/source, immutable context, current topic, live lease and hard deadline. It reads DB time **after** obtaining the Task lock. The native Session/Profile/Foundation/Config/protection gates remain authoritative before and after awaited work. A caller cannot supply a bearer or reconstruct one from the Session record.

The native call identity includes actual script and input fingerprints. A text turn must match its canonical UUID5 step and exact normalized message hash; a Quality call must match the precommitted request digest. Reusing the same operation IDs with different first-dispatch input is refused before a provider reservation. Prompt/schema/model hashes are observed at the native reservation, not invented from the plan.

## Accounting and lock order

Admission takes the existing actor/day advisory lock before Task/native locks. An immutable queued allocation replaces the existing three-call team hold and transfers once to its exact claimed run/context. It expires no later than UTC midnight. Ordinary role attempts are forbidden for an allocated native-only Task.

The actor/day equation is unchanged ordinary task reservations/attempts, plus unique native reservation links from the current UTC day, plus unconsumed slots in live queued/running allocations. Native consumption replaces one held slot atomically. Cancellation/expiry releases unused slots; a committed timeout, failed call or missing usage remains spent. Crossing UTC midnight cannot revive an old allowance. A reserved call is a call admission count, not a monetary charge; unknown cost stays unknown.

The Session adapter checks the Task after native parent/actor/Creation locks and before policy/index/Conversation locks. Reservation inserts the unique link in the same transaction as the new canonical provider-attempt Event, after native replay checks. Deferred FK/identity/hash checks require the real Event at commit. There is no parent completion savepoint around a provider call. Do not invoke heartbeat, global admission or queue cleanup from a native transaction. An independent heartbeat must retain nonlocking native authority checks to avoid reversing this order.

Native usage is retained in the original text/Quality event ledgers, including after Task cancellation or authority loss. The narrow accounting projection reads actual `usage_receipt` objects: `known`, nested `tokens`, unknown `cost_usd`. It validates receipt kind/model and native request/run or Quality job/number, sums disjoint known calls once and reports missing/unknown usage as incomplete. It never uses a maximum to combine independent calls, invents zero cost or exposes model output after authority loss.

Migration `0040_calibration_task_budget` adds only the allowance/link tables, forced RLS and narrow functions. Downgrade refuses retained allocations. Do not drop or rewrite charged history to obtain a clean rollback.

## Remaining integration gates

The existing customer text transport/wire still pins Luna. The owner chose 6.1 Sol High for all roles; this plan rejects non-Sol calls, but an immutable canonical text model/effort profile must be connected and verified before actual paid dispatch. A plan field alone is not High-effort execution evidence. Bearer defaults and historical receipts must remain readable and unchanged.

Coordinator intent/worker progression, parent usage projection and UI results still need the final combined integration. The existing three-role deadline must not be silently reused or extended for up to ten native calls. Baseline/protected comparison, V2 Config-bound decision, module admission, adoption/rollback and real channels remain independent acceptance gates. The current nine-page `.test` business still lacks actual Foundation/facts/editorial/release acceptance; this connector cannot manufacture it.

## Bounded verification

The corrected accounting/source boundary passed 19 plan checks, 48 combined Session/plan offline checks, nine actual restricted-PG accounting cases and two additional concrete-fence/input/unchanged-row clock-wait cases. The unchanged ordinary team/task quota cohort passed 38 cases. An independent authorized reviewer found no remaining blocking issue in the final bounded accounting source after the original three findings were corrected. These are source-layer checks with zero providers, not paid calibration or complete platform acceptance. The helper's new Session and existing compatibility cohorts use a separate immutable checkout and their results are recorded separately. Original fixture/setup failures and the real-receipt regression remain retained.
