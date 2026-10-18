# Fresh set-based model-profile observation

Read-only current-case profiling at53967fa observed789SQL in a full Authority
capture,2571 across capture/inspection including477 model-profile row lookups.
The existing team history reader invoked schema and profile SELECTs separately
for each attempt. This multiplied every accepted-material/private/S6 observation.
Only deidentified query counters/table names and timings were retained privately.

Meaningful original actual team.projection baseline:1 FAIL/12 PASS2.23s,
30 profile row reads for30 attempts instead of one; log SHA256
36740dd34c1fd341022be11f5a174425a565536b952b533f1764ffd796b912c5.
No missing-function surrogate was used. The old single-attempt API stays intact.

The new reader fetches profiles for its existing bounded job set in one RLS SELECT,
validates every immutable job/profile binding and every role/model with the same
pure rules, and checks schema state again before return. No projection/history
is filtered, rewritten or cached across operations. Missing/legacy default rows,
wrong High creator, duplicate source, source/session/owner binding and schema loss
have focused regressions. No model, effort, quota, profile catalogue, RLS rule,
migration, receipt/fingerprint or preview timeout/TTL changed.

Related source regression:162 PASS/7 SKIP44.71s; skipped tests require an explicit
no-provider CLI pin/catalogue and are not claimed. Log SHA256
debbfa911ebb79aa41a57020016b1bf7dbb12aab76f27c2f67030b7cef1b2fc0.
Ruff for exact three changed/new Python files passed. An earlier broad invocation
named a nonexistent test file; no tests ran and that failed invocation log remains
private. Corrected invocation used the actual review/registration/controller/wire
and pipeline-profile modules. Source/mock passes do not establish real latency.

Next actual gate: restricted PG High/default history/profile-source cases plus
live-preview authority; compare current real team projection and repeat private
timings. Serving remains539 until the complete reviewed packet is adopted through
the same-DB backup/cutover. The existing live-preview authorization_revoked failure
and new Node first-refusal diagnostics remain separate evidence. Never make the
3s/20s/120s/150s guards permissive to compensate for source inefficiency.
