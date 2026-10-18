# Canonical clocks in synthetic pipeline tests

The shared PostgreSQL synthetic team runner receives the remaining whole-job
budget, just as an injected production role runner does. Its bound must use
`creation.deadlines.job_seconds(execution_profiles.selected())`: the default
profile keeps twice `creation_runner_seconds`, while the existing local High
profile has its independently source-bound900s policy. The actual adapter still
applies its existing per-role clamps and review reserves.

An actual High admission regression stopped after its first synthetic creator
because the helper assumed the default360s bound. Numeric-only diagnosis found
899.7864705s remaining against canonical900s. The helper assertion aborted before
its authority callback and became the worker's generic provider_error. This was
a test-helper mismatch, not a provider execution or a changed model selection.

The focused helper regression preserves both profile boundaries, refuses excess
time and refuses a false authority callback. No production clock, profile,
allowance, role count, model, quota, or authorization rule is changed. Retain
original failed logs and repeat actual isolated PostgreSQL admission/history
tests; a passing helper unit test alone does not establish runtime acceptance.
