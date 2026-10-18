# RUNNING workflow-route cancellation: source-only addition

Root requested one missing integration case after the12-case workflow packet.
This test-only follow-up starts at
`e49d4bdf769e56d834bb7867d5e94cef6a73983a`, with unique upgrade
`upgrade-6af127f0-ed88-4ea2-b4d6-c5f9e2ba08ee`.

New exact test:
`tests/test_workspace_agent_workflow_pg.py::test_running_workflow_route_cancel_after_native_reservation_keeps_usage_and_discards_reply`.
It adapts the maintained S5 cancellation-after-actual-reservation test to the
new `/team/agent-workflows/{workflow_id}/cancel` route.

The source first commits S4 through the maintained worker, records the immutable
parent result, then uses the existing inert native text and Quality transports.
Inside the text transport's late-return wrapper it observes a RUNNING native
child, explicitly cancels the workflow, then returns the deliberately late
reply/usage. Assertions require one cancellation, one text attempt, zero Quality
dispatch, no published reply, only the truthful coordinator assignment, a
cancelled child with no result, exact9input/5output retained Run usage and
unchanged successful parent result. Read/cancel replay stays cancelled and the
intent cannot reconcile another child. Calibration remainsUNVERIFIED.

The helper DID NOT EXECUTE THIS TEST. Full-file collection:
13 cases/1.40s, SHA256
`b40a9e5c3ea9058d6e954d15b4d3f96e7c715cf128a53541dc626c34647c45d1`.
No new failing runtime result is invented: this is an observed coverage gap,
not a claimed actual failure/recovery. Root is the sole isolated PostgreSQL,
migration, provider and serving-adoption owner.

AST boundary check proves all original test/helper declarations unchanged;
only the new test and one adapter import were added. Runtime/schema/contracts
have zero diff againste49. Boundary report SHA256
`29299d280ab96e9fe7a28949a3dd134b72c26db7e04fd40dcb25ffda5fe60665`.
Ruff and diff checks pass. No broader pure regression was repeated because no
runtime, contract or existing test changed.

This source targets cancellation while the native Task is running, immediately
after inert transport return and before the native adapter accepts the reply.
It is not a hard process-kill, stalled subprocess drain, real paid provider,
database restart or interleaved completion/cancel lock-race observation. Those
separate runtime gaps remain explicitly unobserved by this helper.
