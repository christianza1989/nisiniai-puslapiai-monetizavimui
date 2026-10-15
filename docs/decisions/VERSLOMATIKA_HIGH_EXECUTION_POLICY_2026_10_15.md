# Explicit customer execution policy — 2026-10-15

Upgrade `upgrade-89eac400-7f0c-4739-a74f-8ecb9ba0cec4`, issue [66](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66). Owned base `3fa5b2ac15b0b3f73bb0aaf13c2dd777a7667ea5`; branch `codex/verslomatika-high-execution-policy-20261015`. Root authorized this disjoint follow-up from the already verified High packet. Paired freshness PASS at 2026-10-15T05:27:17Z: core main `808581d919d06cb4a2d151cc7f9ec1be1782aba2`, companion `1a26f289092cecadc5799de898e809dc1769498a`, public main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`.

## Reproduction and cause

The High Pin packet retained the exact default Luna text and Sol Medium independent Quality paths. When the local selected pipeline profile was `local_sol61_high_v1`, enabling shared customer text flags still allowed an unprofiled bearer Capability/Start and a default Session reservation. Ordinary readiness tests the configured Luna executable, workspace, source and limits; it does not select a customer execution profile. The first policy regression run preserved **3 FAIL in 2.70s**: Capability and Start reached a forbidden native scope; an unprofiled Session consumed the inert test permit.

This is an execution admission problem. Metadata-only Snapshot capture and historical binding validation do not authorize new provider work. A default Medium Quality request also passes through the canonical principal text authority before a native Job or provider attempt; it must obey the same choice.

## Canonical rule and implementation

`customer_text.execution.require_choice` allows an absent Pin only when the admitted selected runtime is `default`. An explicit Pin must pass the existing exact current High catalogue/profile validation. The bearer execution authority and Session text/reservation boundaries enforce this choice before execution and after awaited authority/reservation work, before the native transaction can commit. An unprofiled request under High returns `customer_text_profile_required`; it cannot silently fall back or acquire a High identity.

Keep generic `chat.guard`, default `runner_ready`, default models, CLI argument builders and public signatures unchanged. High runner readiness deliberately reuses ordinary executable readiness. Metadata-only no-Pin Snapshot remains valid under High. Historical status/list/events/end use retained owner authority; they do not require the currently selected execution profile. Frozen usage settlement stays independent of current execution authority, preserving observed Luna/Medium/High usage while refusing late output after policy loss.

Root owns Task intent/progression, portal integration, configuration and serving adoption. This packet changes no flags, executable configuration, operational database, provider access or activation.

## Verification

- Baseline policy reproduction: **3 FAIL**, retained above.
- After the initial fix: policy + existing High + Session offline cohort **53 PASS in 2.92s**.
- Expanded policy + existing High + Session offline cohort **56 PASS in 2.74s**. This includes explicit DEFAULT/High choice and policy loss at transaction exit and inside a permit callback.
- Broader `offline_tests/test_customer*.py` plus the policy file: **431 PASS in 7.84s**, actual exit 0, two existing Pydantic deprecation warnings. The 56-case cohort is included, not added again.
- Ruff for the three runtime source files and two policy test files: PASS (two unused imports removed from tests).
- **29 native PostgreSQL PASS in 305.08s**, frozen Root integration `27fe292424598eb92e3a3a90f71c28c50be2865b`, separate restricted QA database and inert providers. Eight new policy cases cover bearer Capability/Start, metadata/no-permit Session, retained Luna history/end, bearer and Session default Medium refusal before Job/attempt, and in-flight Luna/Medium known-usage settlement with late output rejected. The same cohort includes eight existing pinned High cases, seven Root caller cases and six targeted DEFAULT text/review/receipt cases. This is **22 helper/compatibility cases plus 7 caller cases**; the earlier completed 141 histories are not reclassified as policy acceptance.
- The exact native terminal summary was read through a restricted status-line filter from Root's ignored `native-agent-high-policy-native.raw.private.log`; no private bodies/configuration were copied. Read-only verification confirmed the frozen `agent-session-frozen-qa` checkout still at exact `27fe2924` and clean after completion. `git diff f8de263b4f86069669701fe5b36e6d0fd5a84411 27fe292424598eb92e3a3a90f71c28c50be2865b` is empty for all three owned source files and both policy test files.
- AST comparison against owned base confirms 67 existing function signatures unchanged across the three source files. Request wire and canonical OpenAPI have no diff.

## Delivery and adoption

Current state: locally verified source `f8de263b4f86069669701fe5b36e6d0fd5a84411`, integrated and tested as exact owned bytes in Root `27fe2924`. Local verification is separate from PR review, main merge and serving adoption. Root owns operational activation and any later serving receipt. A scoped source revert can restore the previous execution gate; preserve all immutable receipts, first failures and journal history.

Acceptance metadata commit `029469cc962c3a0d8dc8d0cce77d060611f836a8` contains the new immutable local-verified event `87c552d3-97aa-448a-a31f-ef027f46a361`. Exact owned `3fa5b2a..029469c` coverage: PASS, 3 shared paths, zero uncovered/errors. Paired handoff freshness PASS at 2026-10-15T05:44Z against unchanged main808/publicec8; own checkout clean.

Created and attached [draft PR 156](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/156). Root already integrated the functional source: take **only acceptance metadata `029469c`**, and optionally this later PR receipt, avoiding duplicate source cherry-picks. GitHub creation reported remote base `6463878d` and `mergeable=false`; exact conflict blocks were not inspected. This draft records the packet; it is not a declaration that its broader divergent history is ready for a whole-branch merge.
