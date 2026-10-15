# Existing Creation test fixtures after S28

2026-10-15. Root authorized an additional test-only window in issue66,
comment6188534937. Exact base/frozen S28 functional commit:
`4f75b54fecae922a6a5aca4c017313e4286a9fde`. Separate managed checkout
`discovery-legacy-fixtures`, branch
`codex/verslomatika-discovery-legacy-fixtures-20261015`; paired start09:09Z
main808581d9/publicec8a9c03 and companion1a26f289 PASS. The S28 functional
checkout remains clean for Root's independent native QA.

## Reproduction before repair

The original broader Creation/Discovery cohort returned
**4FAIL543PASS7SKIP29.50s**. A read-only run on preserved, unchanged
`7e79c63ca2e767933e64a4ef95b4d497c5c43d1c` returned **4FAIL2.28s**.
The later explicit `--tb=line` rerun on that same clean HEAD returned
**4FAIL1.40s**, with these exact witnesses:

- `test_creation_team_wire.py::test_team_wire_advertises_overall_two_round_deadline`:
  expected600, actual900 (minimum30 unchanged).
- `test_creation_language_patch.py::test_team_uses_exact_mixed_patch_then_independent_second_review[False]`
  and `[True]`: `KeyError: user_id` at `creation/team.py:158`.
- `test_creation_language_mode.py::test_paused_business_uses_three_roles_without_language_repair`:
  the same missing claimed user identity at `creation/team.py:158`.

The7e79-to-d3d9 diff is empty across those three tests and the runtime
`creation/team.py`, `team_wire.py`, `deadlines.py`, `execution_profiles.py`.
The failures predate S28. No baseline files, environment/configuration,
historical receipt or runtime source were edited to obtain this evidence.

## Scoped repair

Only those three Python test files change. The wire expectation is900, matching
the maintained High900-second job policy and response bound; per-role and
DEFAULT execution policies remain untouched.

Language tests now supply explicit synthetic owner/job identity and a shared
inert current-actor fixture. Every actual team role still passes through the
production team controller's current-actor lookup. The fixture asserts the
owner scope, job and exact reserved Attempt id, returns that role's captured
model/instruction SHA, checks the current default-profile lookup, and verifies
the exact model/medium effort/instruction SHA forwarded to every fake role.
The two-round prose-patch test still requires six succeeded attempts, exact
allowed edits and an independent second review; the paused-language test still
requires three roles and UNVERIFIED language screening. Runtime SQL, actor
fencing, reserve/finish behavior and profile checks are not changed.

## Actual regression

Targeted three-file cohort: **89PASS3.53s**. Broader command selects actual files
with `rg --files offline_tests -g 'test_creation*.py' -g '*discovery*.py'`, then
`python -B -m pytest -p no:cacheprovider <selected files> -q`:
**548PASS7SKIP22.13s**. A fixture-import RuffF811 was corrected using the existing
import-alias/fixture-assignment convention; final exact broader rerun:
**548PASS7SKIP21.90s**. Counts are not additive and skipped cases are not PASS.
Final Ruff for the three files and `git diff --check`: **PASS**.

The original four failures and Ruff witness remain recorded above. These are
test-only compatibility fixes; no new shared upgrade is fabricated for them.
S28 provider-free native SQL acceptance, actual model research and serving
adoption remain separate Root-owned evidence.
