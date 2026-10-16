# Separate inspection from paid generation admission

Base1fb549619c7f1bc5d9b4f8b523e3f2af1329ae27 with unchanged
public255fea0813bf1aabeaeea2f2de0b29564118f2fc. Scope reserved on issue66,
comment6211107441. Only service.py and lifecycle.py are shared implementation
paths. See [guard contract](../../../docs/SITE_BUILD_INSPECTION_GUARDS.md).

Root's ordinary owner had successful current-source private intake, but S6 GET
returned503site_build_unavailable because the shared feature guard required the
paid Creation worker. The retained response was inspected read-only; no helper
operational request or byte change occurred. An isolated source baseline reproduces
1FAIL12.22s, logSHA256
a6e0e909033b5de74d1a414b2c63e0fe857ba4c52b1da23e7e75098998981356.

service.enabled now retains feature/environment requirements independently of
worker admission. generation_enabled adds the exact previous Creation runner
requirement. Both advance and lifecycle.actors select generation_enabled, retaining
every prior lifecycle control/supervisor/discovery/allowlist gate. Router/Foundation/
receipts keep the same feature guard call; no other production module changes.

The existing lifecycle allowlist test now mocks generation_enabled instead of
enabled, preserving its assertions and the deliberate allowlist-only seam. New
offline tests use real feature/source guards, held worker flags and actual router
dependency execution with explicit unit-only SQL/auth transport seams. No unit
fixture is claimed as current owner/RLS or operational Foundation acceptance.

The first native test collection omitted runtime itself from PYTHONPATH; an
existing shared fixture imports offline_tests.test_business_discovery. That
ModuleNotFoundError was an invocation error, retained in tool history; no source
was changed to hide it. Correct native collection uses src;tests;runtime, not the
offline_tests directory as a bare-module competitor.

## Verification and preserved broad failure

- 104 focused tests passed8.62s across the new inspection tests, existing Site Build
 policy/lifecycle, candidate preview, strict S6 contract and Foundation bridge.
 One expected deliberate-invalid-UUID serializer warning. LogSHA256
 d32fd7a0817964203329b1a407ad3413ed780351112b723532aef9668aeace89.
- Five changed/new Python files pass Ruff; diff whitespace clean.
- Two native cases collect2.18s only, not executed. Exact command:
 `python -m pytest --collect-only -q agent-business-core/runtime/tests/test_site_build_inspection_pg.py`.
 Use PYTHONPATH=runtime/src;runtime/tests;runtime and PINET_PRIVATE_PREVIEW_QA=1
 only when Root supplies the dedicated QA database for actual execution.
- Broad offline run:2003passed,8skipped,67subtests,2failed+1error203.68s. One
 Windows1450 insufficient-system-resources error happened creating a temporary
 fixture path; two unchanged subprocess tests hit their6s/1s deadlines. A transient
 code-mode host stdout closure also occurred during this run. No source/threshold/
 deadline or operational process was changed in response. This run is not PASS.
 LogSHA25644b2ae4d622abccef611ee02dfbef9c30a02ecec9dfb1f62a13fb73254bd9b77.
- Exactly those three cases passed unchanged on isolated replay2.82s:
 creation_team_controller's False/event4/tool_attempted terminal child case,
 partial_cli_receipts' error/provider_error case, and editorial_review_bridge's
 workflow_review_rejected409 transport case. This supplements focused coverage;
 it does not replace or erase the original broad-run failure.
 ReplaySHA256a3f299766240d5c8104e0310e9ce507d9d435d842076f44de8aa3a500acbaf66.

The new native cases are test_real_owner_s6_inspection_and_blocked_preview_with_workers_held
and test_real_native_review_and_atomic_approval_with_all_workers_held. They use
retained isolated fixtures, actual restricted owner HTTP/S6/source/foreign-owner
guards and actual Node readiness/approval. The preview case must remain blocked
by missing real fixture review/approval, while generation/lifecycle remain refused
and no GUIDE is admitted. All six provider/supervisor flags stay false after setup.
No source-level claim is made about actual PostgreSQL or operational UI adoption.

Rollback reverts only the two guard source changes. Retain all historical intake,
S6, review/approval, Foundation and failure evidence. Do not turn paid runners on
to regain inspection. Root owns actual dedicated-PG execution, source adoption,
normal-owner source-intake/S6 renewal and native/UI acceptance. Source merge or a
prepared preview is not operational adoption or full-site/launch acceptance.
