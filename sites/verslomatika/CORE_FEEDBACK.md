# Verslomatika integration feedback

2026-10-10, development/testing. Shared upgrade: `upgrade-fbea2507-21fa-45fd-95c1-ce17c8778a98`, scope [issue70](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/70).

Accepted I2 provided persisted business chat/task events but no cross-thread task history, catalogue, execution report or portable minimal owner server. The dashboard therefore could not reconstruct past results through its canonical API. We extended existing session/grant/RLS and Task/TaskRun/TaskEvent rows, avoiding a separate ownership or task database. Only the existing consultation executor is catalogued. Availability is configuration, while worker health stays unknown; counts describe actual core tasks, not revenue or deployment activity.

A real fresh-default setup then showed that the executor OFF flag blocked reading history/report/events and cancellation. Admission and durable read authority were unnecessarily coupled. Commit `b9a648cda3d7358b1f20b2f85042350aa6edd545` removes the admission guard from authorized reads/cancel only; worker and submit checks remain unchanged.26PostgreSQL task/operations/bridge regressions plus corrected empty-state HTTP rehearsal passed. Original invalid receipt labels remain documented instead of being rewritten into PASS.

Portable helper parameterizes the existing local setup and retains no-overwrite behavior. Minimal control_api isolates owner surfaces from legacy channel/operator APIs. Signed future hosted transport keeps its actor/session separate, exact bytes and persistent replay protection. Actual hosted ingress and production inventory are not accepted by these local tests. Current PostgreSQL remains; optional Supabase is a later adapter decision.

Checks and original failures: [dashboard acceptance](../../docs/VERSLOMATIKA_DASHBOARD_ACCEPTANCE.md). The upgrade is locally verified source awaiting scoped Git delivery/review; it is not all-PC main adoption or completion of later business-creation/customer runtime.
