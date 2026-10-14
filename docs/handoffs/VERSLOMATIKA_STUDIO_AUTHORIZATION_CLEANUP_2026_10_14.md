# Studio authorization cleanup handoff

Upgrade `922c5e66-693f-4b1f-8870-3ac3d1d746dc`; owned scope and behavior are recorded in [the decision](../decisions/VERSLOMATIKA_STUDIO_AUTHORIZATION_CLEANUP_2026_10_14.md). The Foundation observation boundary was delivered separately as functional `bc077504da8ea691b108d2eebf15de53435e0f26`, metadata `f0c904622f0b1cf8f15819e354e1649cf210bbd3`, [PR143](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/143).

This packet stops new periodic authorization at EOF, drains the current callback before serial final authorization, includes that final check in the operation deadline, and joins callback/child cleanup despite repeated caller cancellation. It preserves revoked authorization failure and does not mutate a borrowed transaction.

Evidence retained locally:

- `agent-business-core/runtime/artifacts/s5-foundation/error-boundary/tests-e5f7ff38.log`: actual restricted borrowed SQL baseline1 FAIL in1.61s; the next SQL raises `PendingRollbackError`.
- `tests-e6d3653a.log`: earlier Foundation regression57 PASS/1 FAIL in185.41s, preserved.
- `tests-e89cd8e6.log`: first repair regression31 PASS in12.42s, covering the actual SQL reproduction, callback serialization/final denial, deadline/drain, repeated cancellation, child stop, joined callback cleanup, zero later periodic callbacks, and maintained studio output/environment/dispatch bounds.
- `tests-9e8bbf34.log`: final expanded regression89 PASS in97.62s; nine new lifecycle cases, maintained studio cases, offline/native-PG Foundation and current-page cases. The previously failing Foundation cached-owner/source-change case now passes without changing its test. One existing Pydantic warning from the intentional invalid-UUID serialization case remains.
- Scoped Ruff and `git diff --check`: PASS.

QA uses only the already authorized loopback container and the peer's isolated database, schema0034. Original preview schema0032, all table counts and restricted-role attributes are compared before/after; superuser and RLS bypass remain false. No provider/model or external-channel calls occur. Initial failures and QA artifacts are retained; raw credentials, runtime data and customer records are excluded from Git.

Primary owns integration, its S6 continuation and producer, original-account adoption and full-platform acceptance. Exact S6 source `7ddb1347df64912ee1e637bc57294fd916c9670e` was read only; two late-membership/replay projection review cases were sent to its owner. No primary files, original public checkout, runtime flags or live preview were edited.

Delivery: functional `787af5c534a829e5b019cdf5dee7634582ba5c80`, [draft PR144](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/144), stacked on PR143/f0c9046. Exact8 staged blobs passed safety with0 findings; paired handoff freshness passed on functional source and unchanged public1a. Committed coverage from full basef0c9046 to787af5c passed for one shared source path and this upgrade. Source/test window is released and read only; only own delivery metadata follows. Primary accepted the two S6 review cases for separate reproduction/repair; this packet claims no S6 execution or fix.
