# Six saved agents on the common native runtime

The previous `NativePair` executes a research Config and an email Config. Its
generic reviewer/reply labels do not prove execution of separately saved
qualification, reply, quality or coordinator agents. Workspace Team/Direct
previews also have a different owner/Creation/Profile contract. This additive
adapter gives each of six saved Agent Configs its own common Task, Run and
durable model attempt. It does not activate a channel or authorize a model call.

## Exact source contract

`acquisition.agent_role` uses adapter `acquisition-agent-role.v1`. Its strict
`RoleRequest` identifies a six-member `NativeTeam`, exact primary authorization,
Campaign, Prospect, recipient and typed parent receipts. Each member is a distinct
saved Agent, with its current immutable Config revision/hash. Existing owner,
session, environment, external SourceBinding, module, source and private transport
checks remain in force. The same six authorities are checked at submission,
claim, heartbeat, attempt reservation, settlement and effect completion.

| Role | Saved purpose | Typed output | Required parent |
| --- | --- | --- | --- |
| research | customer_research | Assessment, no draft | coordinator route to research |
| qualification | customer_research | Qualification | research |
| writer | email | Assessment with draft | eligible qualification |
| reply | email | ReplyDecision | accepted quality and exact current inbound |
| quality | custom | ArtifactReview with artifact SHA256 | writer or reply |
| coordinator | custom | RouteDecision | none initially, quality subsequently |

`custom` is admitted only with an explicit quality/coordinator execution role.
It cannot gain ordinary preparation authority. Existing purpose-only grants keep
their original serialized material/fingerprints; the nullable new field is
omitted for those grants. A role grant cannot enter the older preparation path.
Browser input cannot select a Config, arbitrary schema, provider, model, tool,
executable or send action. All six outputs use the same bounded, tool-free
`gpt-6.1-sol` / `high` transport and existing cancellation/unknown-usage accounting.

A parent receipt binds role, Task ID, Run ID and exact output hash. The server
also verifies its actual succeeded attempt, same team, Campaign, Prospect,
recipient and calibration reference. Qualification is a separate saved Config;
quality reviews the exact artifact using its own saved Config. A coordinator
decision supplies routing information without creating authority.

Accepted initial quality uses the existing atomic reviewed capture. Accepted
reply quality uses the existing atomic correspondence decision and suppression
semantics. Rejected reply prose cannot erase an independently recognized refusal:
a contained stop/privacy handoff persists without emitting the rejected copy.
Reply inputs bind current thread/inbound/revision/hash. A newer inbound
invalidates queued work. A failure after a correspondence effect rolls back the
effect with Task completion, while the separate durable model charge remains.
Replay returns the retained Task; a new UUID cannot repeat the same role/parents.

Migration `0050_acquisition_agent_roles` extends the existing checks and fixed SQL
functions, adds one nullable role and a unique work index, and preserves the old
Task kinds/adapters. Only a trusted migrator can apply it. It grants no runtime
DDL/UPDATE rights and has no destructive downgrade. Use exact source/Config
rollback; retain history and charges.

## One maintained calibration runner

`agent_role_calibration.SixRoleWorkflow` supplies optional hooks to the existing
`dialogue_lab.run_case`; the default runner and its original evaluator instruction
remain unchanged. It supports one persona reply at most. A full case executes
eight native attempts: coordinator, research, qualification, writer, quality,
reply, quality, coordinator. One persona and one independent evaluator make ten
total calls. A legitimate stop can end the native chain earlier.

The new manifest version is `acquisition-six-role-calibration.v1`. Exact keys:
`version`, `source_revision`, `team`, `bindings`, `campaign`, `cases`,
`corpus_sha256`, `evaluator_hash`, `protected_source`, `max_turns`.
The manifest and protected source must be bounded, sealed private artifact files;
symlinks/reparse points and changed bytes are rejected. Protected source keys are
exactly `synthetic`, `now`, `campaign`, `cases`. Campaigns must match exactly;
cases use the existing strict `LabCase`, synthetic recipients/evidence, unique
IDs/personas, 6–100 cases, at least one train and three holdouts. `max_turns` is 1.

The six grants are bound to their first calibration manifest path/hash, excluding
only selected `case_id`. Both Python and the final SQL fence reject moving the
same grants to another manifest, including a renamed copy. A new campaign label
does not renew consumed authority or budget. Source/Config candidates require
genuine fresh authority under the authorized stage's aggregate accounting.

`SixRoleGrade` includes every role as PASS/FAIL/NA. PASS requires actual succeeded
native receipts for that role's exact saved Config, known complete usage and one
charged attempt. Executed roles cannot be NA. An unexecuted role can be NA only
after an observed workflow stop, silence or signup, with a precise reason. Early
qualification/review stops still receive independent evaluation. Role labels,
template wording or grade booleans alone cannot establish six-agent coverage.

Private personas and expected labels enter only persona/evaluator contexts.
Native Task inputs contain the sealed reference and selected public evidence;
native model packets contain current saved specification, approved business
facts, actual parent output and current original correspondence. They do not
receive the protected persona or expected labels. Provider failure metadata stays
in the existing bounded observation vocabulary, without prompts or message text.

Custodians can call `validate_corpus(source_dict)` offline before real grants
exist. The sealed-file entrypoint returns only counts/hashes:

```text
python -B -m pinet_core.acquisition.agent_role_calibration validate-corpus --path ABSOLUTE_RUNTIME_ARTIFACT_PATH --sha256 EXACT_SHA256
```

This creates no authority, Task, ledger or provider call. Canonical persona and
expected fields are flat `LabCase` fields (`persona`, `expected_classifications`,
`expected_initial`); arbitrary nested objects are not accepted. Corpus errors are
sanitized so malformed protected inputs never appear in a traceback.

## Source validation and separate adoption

Initial dedicated PostgreSQL QA passed the full eight-Task path, exact replay and
role/parent/peer tampering tests (9 tests). The expanded suite passed 14 tests,
including cancellation
with known/unknown usage, stale inbound, atomic reply rollback and a sealed full
runner test. The focused offline regression passes 164 tests and 8 subtests.
Five final-source PostgreSQL supplements passed: rejected-copy refusal and privacy
containment, sealed full runner, atomic reply rollback and shared feature stop.
The separate JSONB negative plus two legacy positives passed (3 tests). Prior
failed attempts remain in private logs.

The retained migration check compares SHA256 of canonical sorted row material
across all public tables before/after 0049→0050, excluding only Alembic version and
the newly added NULL role column on older authorizations. It does not rewrite
historical task inputs, Configs, grants, ledgers or fingerprints.

Two separate retained QA databases were used; no other database was migrated.
The first 95-table/156-row comparison and final 95-table/87-row comparison both
passed. The final 0049→0050 migration includes the manifest-retention SQL fence.
The first JSON literal bind failure, final migration import mistakes, harness
bootstrap ordering failure and test assertions missing correspondence RLS scope
remain explicit failures in private QA logs, followed by corrected checks.

The last six-role fence honors the shared native feature stop, rechecks private
registration/corpus seals after the final Git wait, and then checks SQL team,
campaign/contact state and current clock. Separate late-stop/expiry/seal tests
cover that order.

The final two-agent SQL fence also passed `json.dumps(envelope)` to a JSONB-typed
SQLAlchemy bind. Actual PostgreSQL `jsonb_typeof` returned `string`; binding the
object returned `object`. The former reached the native-pair function's legacy
missing-native branch. Earlier Python pair checks remained active, but this
specific final SQL check was ineffective. A dedicated PostgreSQL regression
deliberately bypassed the earlier Python check and supplied a wrong peer
fingerprint: it failed to raise before the fix. The source now binds the object
directly. This repair has its own upgrade record and negative/legacy-positive
checks; it adds no DDL, provider permission or budget.

This source work has zero paid/provider/live channel calls. Final source review,
Root integration/adoption, exact source/Config/knowledge/evaluator/corpus freeze,
new campaign/policy/grants, actual no-dispatch preflight and a specific Root GO
remain separate gates. A proposed future stage is bounded to 120 total attempts,
3600 seconds, smoke ≤12, zero automatic retries; native, persona, independent
evaluation and proposer calls must all reserve before provider use. This document
does not create that ledger or grant.

Retained conversation gates also apply to candidate comparisons. New grant IDs
alone do not authorize recapturing a replied/stopped Campaign/Prospect. Any optional
paired candidate needs an explicit canonical isolation/adoption mechanism within
the same aggregate stage budget. That mechanism and actual adoption/rollback are
not established by this source QA; a justified no-change decision is valid.

Gmail OAuth/send/inbox, ordinary browser operation, Lithuanian correspondence
display and actual model quality are separate acceptance evidence owned by the
integrating task. Local inert QA does not establish them, main merge, adoption on
another PC or hosted acceptance.
