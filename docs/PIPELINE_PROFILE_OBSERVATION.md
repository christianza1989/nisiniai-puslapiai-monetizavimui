# Fresh profile observation for a team-history projection

Team history keeps every existing job/attempt/event and the same model validation.
`execution_profiles.validate_attempts` reads schema readiness, then the profiles
for the existing bounded job set in one RLS-protected SELECT. It validates each
job's owner/organization/portfolio/environment, Session, source and profile, then
every attempt's role/model with the same pure rules as single-attempt validation.
Missing rows retain the existing default-profile interpretation; invalid High
creators cannot be silently downgraded. Legacy default history remains readable.

No result survives the projection. Schema readiness is observed again before a
successful batch returns. Invalid, lost or newly changed schema fails closed;
unexpected duplicate/foreign rows are not silently selected. An empty attempt
set adds no database read or new schema gate. Single-attempt admission/runtime
callers keep their existing fresh validation API. No model, reasoning effort,
profile catalogue, quota, receipt, historical fingerprint or RLS rule changes.

Measured Root authority diagnostics found789 SQL statements in one full capture,
2571 across capture/inspection, including477 model-profile row lookups. The old
team reader repeated schema and profile SQL for each historical attempt. The
meaningful synthetic history baseline observed30 profile reads for30 attempts
instead of one; original failure is retained. The new observation uses one
profile SELECT and two schema observations irrespective of attempt count. This
is query grouping within one read, not an authorization/proof/time-based cache.

Source/mock query counts do not prove actual latency or preview heartbeat health.
Root must repeat actual restricted PostgreSQL/legacy-High validation, compare the
real private history projection and retime current authority before adoption is
accepted. Preserve original performance/authorization failures and the3s/20s/
120s/150s preview bounds; do not compensate by relaxing those guards.
