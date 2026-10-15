# Native episode answer provenance

Owned schema window: issue66 comment6184320092, branch
`codex/verslomatika-native-episode-proof-20261015`, source base
`519df2565036ef9bde1508cf80b584e12f59ce92`. Core main
`808581d919d06cb4a2d151cc7f9ec1be1782aba2`, public main
`ec8a9c032fe926d1d9722802d8eb26fa8bd02937`, companion
`1a26f289092cecadc5799de898e809dc1769498a`; paired freshness passed.

## Reproduced incompatibility and decision

0040 intentionally rejects ordinary team role Attempts for native-only allocated
Tasks. The canonical event author CHECK and deferred team fence require every
nonuser event to reference a succeeded ordinary Attempt. They therefore cannot
represent a coordinator summary of an already completed native episode/Quality
test. Creating a fake paid Attempt would violate both provenance and accounting.

0041 adds nullable `native_episode_task_id` to the existing TeamEvent. It must
equal the event's own Task ID. Only a coordinator answer with a real coordinator
participant and no ordinary Attempt can use it. Existing user/adviser/ordinary
coordinator author rules require the new column to remain NULL. Existing scoped
Turn/owner/participant/reply FKs and immutable history protections remain.

Migration locates exactly one canonical author CHECK by its normalized expression
(PostgreSQL text casts/grouping only), and exactly one known Attempt branch in
the current `pg_get_functiondef`. Unknown or duplicate anchors refuse migration.
All other live function bytes are retained. No old schema or migration is edited.

The new SECURITY INVOKER boolean helper requires current owned running Task/run,
original live Session/source, lease/Turn deadline/allocation expiry and matching
allocation/context/plan pins. Its native Conversation binding must equal the full
frozen Snapshot plus episode/script IDs. A succeeded native Quality Job must
match the same Conversation/business/environment, dispatch version, request ID,
model and precommitted input digest. Both text and Quality native reservations
must be allocated to that exact Task/run/Conversation, with committed native
Event rows. This proves receipt custody, not a passing evaluation or admission.

The root completion handler remains responsible for native authority, Config /
Foundation currency, typed output reconciliation, receipt-based summary wording,
native-parent-before-Task locks and business RLS scope. It must flush and validate
`workspace_team_fence` while the Task is still running, before terminal state.
No Task.result dependency, new event store, runner, model or permission exists.

## Checks and adoption boundary

Initial 10 offline anchor/unknown-branch/invoker checks PASS; scoped Ruff PASS. A
follow-up uses a strict allowlisted boolean-tree comparator, preserving quoted
literal bytes and AND/OR precedence instead of stripping every parenthesis/cast
substring. Two changed-literal collision witnesses failed against the first
normalizer; an initially equivalent grouping fixture was corrected to a real
precedence change. All 13 offline checks now PASS. Original failures remain in
the tool transcript; base c077121 retains the initial source for reproduction.
The new PG
file collects 16 selectors covering exact proof, missing/foreign/mismatched
receipts, role/dual provenance and lease refusal, ordinary role replay, and
permissions. Execution in a fresh isolated 0041 QA DB is pending root launch.
The metadata fixtures use zero providers and prove no actual calibration grade.

Root owns the model/wire/service/handler integration. Serving remains unchanged;
this source does not migrate an operational DB or complete the platform.
Downgrade refuses retained native history rather than discarding its provenance.
