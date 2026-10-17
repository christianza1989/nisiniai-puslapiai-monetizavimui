# One selected intake for an accepted proof

`studio.intake_observation(tx, creation)` performs one fresh canonical intake
selection and the same ContentView construction/validation formerly held in
`studio.projection`. It returns the validated view, selected native host/intake
and observed revision ID to internal Python callers. It accepts no observation,
proof, path or result from a customer. Nothing is stored or reused across calls.

The public `studio.projection(tx, creation)` signature and dictionary shape stay
unchanged. Each call performs a new intake observation and returns only the
ContentView. It remains a historical intake snapshot, not current native workflow,
publication, source adoption or full-site acceptance.

`creation_registration.service.accepted_proof` still starts with the maintained
`accepted_material` validator. It then consumes the single fresh studio
observation rather than selecting the same intake a second time. The private
selector itself is unchanged: its own current owner/Session/source/accepted
material checks still run. This removes one selected_intake traversal and its
nested accepted_material/team projection; it does not remove the initial material
check or replace the selector's current guard. Private/S6/Foundation composition,
RLS, model/role/quota rules and3/20/120/150-second limits are unchanged.

Before awaiting the observation, the proof reader pins its accepted revision ID,
sequence, candidate hash, source revision and job ID. All five must agree with
the fresh observation before proof construction. Construction after that await
is pure and synchronous. It uses the same intake bytes for the projected state,
native identity, manifest hashes and intake digest, so two independently selected
intakes cannot be mixed. There is no generic cache, lease attachment or completed
authority result reuse.

All former studio checks remain in one body: intake version/state, Creation and
revision identity, candidate/source digest, native host, fullF1/launch/deployment
status, page mapping/workflow fields, ContentView bounds and types, plan/issues
and observation fields. Missing or failed intake still raises409private_intake_missing
at the proof boundary. Invalid content retains503invalid_content_source; invalid
manifest/native proof or incoherent material observations use503invalid_registration_source.
Upstream ControlError objects remain unchanged. No new request/wire/error contract
is introduced. Standalone selector and projection callers remain fresh.

Focused tests use fake SQL/material and model the selector's existing nested
material check. They show2→1 selector calls and3→2 material checks per accepted
proof, not measured production SQL or latency. Mutation seams exercise changes
between accepted material and intake observation: revision ID/number, job/source/
candidate, payload digest, native state/identity/status, manifest and workflow.
They retain typed401/404/409/503 refusals and byte-exact valid proof output.
Existing private-intake/registration/content/Foundation/S6 source regressions
also run. No actual DB, native Node producer, server/provider/current-case or
serving adoption is exercised by helper tests; Root owns actual acceptance.
