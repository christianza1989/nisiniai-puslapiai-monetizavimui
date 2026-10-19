# Six saved agents on the common native runtime

## Configured CLI identity for the Lab

The Lab honors the normal paired `chat_codex_executable`/`chat_codex_sha256`
configuration for persona and evaluator calls. It validates the absolute file and
hash before preparation and again immediately before dispatch. Partial, missing,
changed or mismatched configured identities fail closed, without choosing a
different npm installation. Only a Lab with neither configured field retains its
historical Node/npm launcher. Private process metadata records the selected
origin and pinned executable hash. Model, effort, fixed provider arguments,
tool restrictions, timeout, accounting and zero-retry rules remain unchanged.

The observed failure completed eight native role calls and one persona call,
then its npm CLI0.159.3 evaluator emitted only thread/turn-start events until the
300-second limit. Its failure and unknown usage remain retained. One separate
same-input diagnostic through the existing bounded executor and normal pinned
CLI0.163.0-alpha.10.2 completed in28.11458seconds with known usage and six PASS
grades; no native role was repeated. This establishes the executable-selection
defect and a working bounded alternative, not the internal upstream stall cause
or acceptance of the original incomplete suite.

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

The grade's two role maps have fixed six-property JSON Schema representations.
The actual `codex_lab.strict_schema` transport closes objects; a dynamic map with
six required entries otherwise became an empty closed object and was impossible
to emit. The first actual-converter regression failed before this correction
(while all six native output schemas passed). Each role status and NA-reason slot
can now be expressed. Pydantic map validation, grading thresholds, exact roles,
NA logic and the evaluator instruction/hash are unchanged. No paid probe was
used to discover or verify this representation repair.

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

Authenticated request reads use `agent_role_tasks.read_request(tx, session,
task_id)`. The caller first runs `customer_session(tx, token)` in the same
`scope(token=token_hash(token))` transaction. A bare token scope deliberately has
no authenticated `pinet.control_user`; its model binding is hidden by the existing
owner RLS. The private calibration controller omitted this step before reserving
its first native attempt. Actual restricted PostgreSQL reproduced hidden binding
before authentication, visible binding afterwards, and a successful existing
canonical `read` before this addition. This was a controller context defect, not
a broken authenticated read or a missing `pinet.business` setting.

The typed helper proves the owned Task's business through the maintained
read-only business authority, checks binding scope/kind/input hash, historical
authorization and request fingerprint, then validates `RoleRequest`. Metadata
`read` uses the same boundary. Missing/foreign ownership remains 404; inconsistent
retained data is 503. Stopped or expired execution grants remain readable as
history by a current owner. Neither helper reserves budget, dispatches work,
renews a grant nor replaces the worker's current execution checks. No SQL policy,
GUC setup, schema, campaign, Config, evaluator or transport changes are required.

Focused retained0050 restricted PostgreSQL verification passed nine cases,
including an ordinary foreign owner and revoked business 404, explicit
read-identity corruption seams (not persisted corrupt rows), stopped history,
genuine 30-second grant expiry with unchanged historical fingerprints, current
execution refusal, legacy two-agent reads, and the complete eight native
Task/Run/attempt workflow with inert responses. The initial missing-helper FAIL,
first implementation's `NativeTeam` indexing error and rejected immutable SQL
test rewrites are retained separately. Corrected tests never disable SQL fences.
Fifty-four offline six-role/strict-grade checks and 22 private controller tests
also pass. These checks authorize no paid retry or reset of the stopped stage.

### Business context and calibration provenance

Saved-role provider input now uses the maintained `agent_role_projection`
business DTO. Runtime site/campaign/organization keys, contact authority flags,
capture addresses, budgets and immutable source-file locators remain server
context. Business need, quantities, uncertainty, approved facts, role boundaries
and parent outputs remain actor context. Ordinary evidence URLs and genuine
public citations remain available. Only technical calibration `.test` URLs are
omitted; the exact authored `Synthetic buyer requirements in en/de/pl: ` prefix
and exact authored display name are projected without changing stored data.
Customer text, including quoted malicious instructions, is not broadly rewritten.

The optional recipient-input hook changes only the six-role workflow. An exact
known authored persona wrapper yields its original need verbatim; a cue-free
natural persona passes through verbatim. An unrecognized wrapper with lab cues
fails closed. The recipient receives natural customer context and conversation,
without case/split/expected labels or instructions announcing a test. The legacy
runner retains its original recipient path. The evaluator retains the complete
original provenance and unchanged grading instruction/hash. No Config, campaign,
corpus, hidden label, original mail or backend `.test` fence is modified.

Each successful workflow receipt additionally exposes the canonical typed input
SHA and consumed typed parent Task/Run/role/output hashes. These are re-read from
the owned retained request; the grader can compare them with preceding native
handoffs without raw input, capture addresses or hidden persona leaking to agents.

The first actual source8bd06 smoke remains a quality/expectation FAIL with four
complete known-usage calls. Source QA is not a claim that the corrected model
quality passes. Any explicitly admitted source correction retains all four calls
in the original aggregate/native/role ceilings and original whole-stage clock;
fresh grants use remaining role caps. Only the new phase/SQL-grant comparison uses
the sealed post-prefix suffix. A new source, exact parent STOP/GO/prefix proof,
no-dispatch preflight and manual Root GO are required; unknown usage is never
resumed or refunded. These private controller gates create no new budget.

Failed dispatches now receive one best-effort historical receipt read, bounded
to five seconds, before the identical original exception or cancellation is
re-raised. Task status/failure code and ModelRun execution/usage are attached as
soon as the canonical read succeeds; typed input SHA/consumed parents follow.
Normal reads attach this metadata before the success-status check. Unavailable,
slow or cancelled cleanup cannot replace the original error. The fallback never
promotes a result, even if it observes a succeeded Task, and never retries work.

This repairs workflow-report visibility only. Canonical ModelAttempt/ModelRun and
the aggregate ledger already retained the actual writer's known token usage.
The underlying completion failure's historical cause remains unproved because
its optional guard trace was not enabled. An explicitly injected completion
denial in isolated PG verifies failed receipts after real inert settlement; it
does not establish that injection as the historical cause. No authority, worker,
lease, provider, frozen controller, old receipt or stage accounting is changed.
