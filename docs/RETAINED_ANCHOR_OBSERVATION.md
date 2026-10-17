# Retained private-intake anchor: one fresh joined observation

This packet starts at Root's frozen execution source `90c5409157eeeb0d6b41d30395cbbe4aa8c11dd0`, with an unchanged companion at `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. Successful paired start fetches observed private main `9a46650a033d283dfb559d7b835a26384e3225fe` and public main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937` on 2026-10-17. Reservation: [issue66/comment6234520268](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66#issuecomment-6234520268). Upgrade: `93afd2d3-3352-44f4-a8b1-1c004a66d663`.

## Problem and bounded change

Every canonical `retained_anchor` call formerly loaded its historical Request, then separately called `terminal` to load the unique Receipt. The same pair was loaded again whenever a current P checkpoint required continuity validation. Root independently reported 53 marker-present anchor calls / 106 SQL statements in its private trace `564ada126a7e9813c9596085be49337a98becf2da622d072868c81c2d6e35c23`. These are Root's measurements; this helper did not access the live case or database.

Only `creation/private_preview.py` changes in production. The invariant is **one fresh SQL statement per retained-anchor observation**, with the same validators, phase pins, return value and typed refusals. No permission result is cached. A new invocation always executes SQL, including the final phase and late P revalidation.

| Input path | Fresh SQL shape | Preserved behavior |
| --- | --- | --- |
| Explicit marker | Request selected by exact `recovery_id`, LEFT JOIN its Receipt | Missing/RLS-hidden Request remains `409 private_intake_anchor_stale`; a visible Request with absent/hidden Receipt reaches the existing receipt validation and records the None receipt pin. |
| No marker | Same original inner join, creation/revision/imported-state/non-continuity filters, descending date/id, limit1; select both entities | Latest eligible original successful anchor is selected; unfinished, failed and renewed requests remain ineligible. No eligible row returns None. |

Both ORM entities use `populate_existing=True`; a cached Request or Receipt cannot preserve an earlier valid observation. Canonical migration0042 and the model declare `Receipt.recovery_id UNIQUE`, so the explicit join has zero-or-one child. Both tables retain their forced RLS and existing owner/environment policies. This packet changes no DDL, roles or policies.

The old receipt-pin side effect is now one synchronous `_pin_receipt(tx, row, receipt)` helper, shared by `terminal` and the joined anchor path. Its exact pin key/payload, including None, is unchanged. `terminal` still performs its original fresh scalar SELECT before calling that helper. The joined path preserves this order:

1. Validate marker before SQL, if supplied.
2. Observe both rows freshly; apply original missing-parent behavior.
3. `stored(row)` → maintained receipt pin → `result(row, receipt)`.
4. Existing source/continuity/binding/manifest/observer-hash/marker checks → original anchor pin and return.

Corrupt receipt fields are not filtered out in the explicit-marker WHERE clause: the canonical validator still observes them and retains its typed503 rather than disguising them as a missing parent. Request/Receipt identity, run, hash, terminal state, native source and v1/v2 continuity validation are unchanged.

## Authority boundaries

P `current`/`capture`, S6, `current_actor`, expected-pin native-before-Node, source checks, entry/final observations and all callers retain their existing invocation points and ordering. Their production functions were not edited. The helper does not reuse permission between callbacks or move a guard across Node output. It does not alter TTL, cadence, process bounds, immutable approvals or historical receipts. Root's `live_preview.py`, `studio.py`, actual case/status and existing journals remain outside this packet.

The existing canonical Authority SQL fake and the shared private-preview recovery SQL fake receive only the new joined-result leaf support. Continuity tests use that maintained recovery fixture; their file is unchanged. Validators, mutation scenarios, expected statuses and guard assertions are not replaced or weakened.

## Verification and retained failures

Before production edits, the new synthetic leaf tests reported **3 FAIL / 17 PASS in 3.17s**, SHA-256 `1464d37604a5ef8e985c450fc94275c3056aef41a1fade8d3e0f56ce58b523f5`: the v1, v2 and no-marker success paths each used two SQL calls. Typed corruption, missing/RLS-hidden rows, receipt/anchor pins and later-phase refusal already passed on the baseline.

The first focused passing run reported **20 PASS in 2.15s**, SHA-256 `9d6d15486d92f035d35838d2252ce59d8094a860c533388a5c3e690213699aaf`. Root independently reviewed the production hunk read-only and reported no actionable P0–P2. The suite additionally checks latest eligible anchor selection, failed-receipt pin preservation and invalid-marker refusal before SQL.

Intermediate failures remain separate evidence, not overwritten PASS: indentation collection error `e261457cade3a9ff79a88a11ef4e13b3029b9484d12342e866d4cf30ec9267c6`; the focused SQL fake's old compiler-parameter naming mismatch `951a900360788aca2cbd3087294a382e20665981d19555e93e1235acbaff07b9`; and the old graph fake's missing joined-result shape `95e310fc694c61b19da01bad67ac62be7ae4292993450f0f1880f7b223e56ee2`. Test fakes now bind actual SQL AST values and represent the joined row; production validators and original assertions remain real.

One related run returned **150 PASS / 1 FAIL**, SHA-256 `adf4aa751811baa0ccdf87ec86507aab6fcb7a798905a84d3a33a0ef7c69e500`. It unintentionally included the existing inert real Python↔Node observer smoke, which failed `intake_failed`. The child used the maintained transport/cleanup; no serving, DB, provider or customer-case operation was performed. The smoke was not retried or dependency-repaired by this helper. It is explicitly deselected from the final Python-only helper regression and remains an unresolved Root-owned native acceptance item.

There is no helper baseline proving that smoke failure predated this packet. Root separately reported the same smoke PASS on its parent `b035b29c6d1f6c431183ffae8148d0f5fa61c321` with its installed dependency junction, receipt `c8399f09dcaf182be23dcee1ab3c2a4298ae6ac891f590acce4137150897fd0e`. This is distinct evidence; Root will rerun native acceptance after integration. The helper neither attributes the failure to a proven shared defect nor imports that different checkout's PASS.

The first expanded Python-only run returned **203 PASS / 1 FAIL / 1 deselected**, SHA-256 `f0a98fef4e19b79d31450606a6439eaa46e18fdead3ae839f0d3d66cf460fdd2`: the base recovery fake still returned None for the newly joined statement. Adapting that common SQL leaf removed the need for a duplicate continuity-fixture adapter; no original status/guard assertion changed.

Final Python-only regression: **204 PASS / 1 explicitly deselected native smoke in 16.38s**, SHA-256 `c2e26c5a889ae0705774731a34732341c5d9392a740d80b5926b6a3e9985b38e`. It covers 23 new leaf cases plus the unchanged canonical Authority, continuity and private-preview scenarios. Ruff on the five changed Python files and diff whitespace checks PASS. No unrelated broad suite or actual DB test was run.

PostgreSQL source regressions are in `tests/test_retained_anchor_pg.py`. **Five cases collected only**, SHA-256 `76a8a56c8069fadb779813f8fe160afd88e246a0d78fb8e800af533f3394eca4`; no DB fixture executed. They cover marker/no-marker one-statement observation, both cached ORM entities, foreign restricted scope and a visible pending Request without a Receipt. The integrating owner supplies the dedicated QA environment and runs these fixtures; they never disable immutable triggers or weaken RLS.

Exact-staged safety, paired freshness and committed coverage results are recorded in new immutable journal events. Source delivery, reviewed main merge and actual PostgreSQL/native/serving adoption are separate events. The saved roundtrip count is not a promise that an authority callback will fit the unchanged 3s heartbeat budget.

## Delivery and rollback

Review the exact frozen Root-base→helper-head diff, not the many unrelated Root ancestors against its older remote branch. A scoped revert restores this leaf to90c while preserving private append-only intake history and all original failures. The companion has no changes. No automatic main merge or runtime adoption is performed by this helper.
