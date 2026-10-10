# Verslomatika integration feedback

## P3/P4 customer/public integration — 2026-10-10

Issue73 / upgrade-22251602-e55f-4318-8e1b-cd31b53fe350; actual path supplement upgrade-e1ca879a-0057-4244-afbb-e3c6fc58458c; final runbook scope upgrade-8b2df3e3-79f0-4e07-95de-28a36b0696b5. Source checkpointdb23aee, wire191ed795, main13c9649/publicec8a9c0.

Actual early tests exposed missing dependency Request typing, cache headers on the minimal API, and a membership FOR SHARE operation requiring UPDATE privileges. Corrected the concrete wiring/header defects and removed the unnecessary write-requiring membership lock rather than granting runtime membership UPDATE. Obsolete no-identity-INSERT test was replaced with current RLS creation/foreign-identity/grant negative checks; synthetic operations runner fixtures no longer depend on private `.env`. Original FAIL receipts preserved. Prior combined80PASS, focused follow-up21PASS and separate upgrade/downgrade/upgrade rehearsal passed.

Account delivery failure handling now checks readiness before email lookup and rolls back password/token/session changes if local notification storage fails. Corrupt public source returns sanitized unavailable503 rather than leaking private payload or pretending the inventory is empty. Nine local approved summaries retain unknown/unverified operation labels; unsupported no-launch wording was corrected and its revision reapproved. Director paired BFF registration/verification/login/intake/reset/revocation PASS; separate Chrome views PASS. Full browser credential mutation remains UNVERIFIED, not silently converted into HTTP proof. [Acceptance](../../docs/VERSLOMATIKA_CUSTOMER_PUBLIC.md).

The new owner's full-business/customer critique request exposes a separate architectural gap: existing operator `chat.consult` is a read-only typed consultation and cannot create/render/revise a business. P3/P4 account/intake completion does not resolve that gap. Next core creation/progress/artifact/revision executor will have a separate scope and meaningful tenant/cancel/persistence/tool-boundary tests; test-domain/private email fixtures never become actual public business facts.

2026-10-10, development/testing. Shared upgrade: `upgrade-fbea2507-21fa-45fd-95c1-ce17c8778a98`, scope [issue70](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/70).

Accepted I2 provided persisted business chat/task events but no cross-thread task history, catalogue, execution report or portable minimal owner server. The dashboard therefore could not reconstruct past results through its canonical API. We extended existing session/grant/RLS and Task/TaskRun/TaskEvent rows, avoiding a separate ownership or task database. Only the existing consultation executor is catalogued. Availability is configuration, while worker health stays unknown; counts describe actual core tasks, not revenue or deployment activity.

A real fresh-default setup then showed that the executor OFF flag blocked reading history/report/events and cancellation. Admission and durable read authority were unnecessarily coupled. Commit `b9a648cda3d7358b1f20b2f85042350aa6edd545` removes the admission guard from authorized reads/cancel only; worker and submit checks remain unchanged.26PostgreSQL task/operations/bridge regressions plus corrected empty-state HTTP rehearsal passed. Original invalid receipt labels remain documented instead of being rewritten into PASS.

Portable helper parameterizes the existing local setup and retains no-overwrite behavior. Minimal control_api isolates owner surfaces from legacy channel/operator APIs. Signed future hosted transport keeps its actor/session separate, exact bytes and persistent replay protection. Actual hosted ingress and production inventory are not accepted by these local tests. Current PostgreSQL remains; optional Supabase is a later adapter decision.

Checks and original failures: [dashboard acceptance](../../docs/VERSLOMATIKA_DASHBOARD_ACCEPTANCE.md). The upgrade is locally verified source awaiting scoped Git delivery/review; it is not all-PC main adoption or completion of later business-creation/customer runtime.
