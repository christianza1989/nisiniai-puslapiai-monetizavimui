# Coordinator-led business team conversation

Status: **proposed architecture and UI/UX extension**, 2026-10-13. The owner has selected the interaction rule: the owner primarily speaks to the coordinator; the coordinator delegates by purpose; specialists reply under their own identity in the same conversation. That requirement is accepted as planning input. The wire, persistence changes and runtime described below are not implemented or accepted by this document.

Planning source: core `f343717c79441485ae006992a6eb15c207e0e00b`, containing helper functional projection/admission source `2ba2fbad40ba0b334b32be329fb693224e90b0be`; companion `5924a2eb858cf45e736bc5e79a2f07cfbbc39af2`. Main ancestry was verified by successful canonical freshness fetch. Primary owns this plan; no production DTO, schema, migration, runner, model or calibration change is included. The owner subsequently stopped further coordination with the helper chat; this planning increment makes no independent-review claim.

This extends the [workspace UI/UX plan](VERSLOMATIKA_WORKSPACE_UI_UX_PLAN.md). UI/UX acceptance still precedes actual pipeline trials. Existing foundation, customer authority, model budgets, channels and deployment holds remain authoritative.

## Product interaction

One selected business workspace has one main team conversation. The owner types into a composer labeled **Koordinatoriui**. The coordinator owns the response to the owner's question, the necessary task plan, unresolved dependencies and the final combined answer. A specialist contributes when assigned a specific task; the owner does not need to manage a separate chat for each agent.

Example of proposed visible messages (illustrative copy, not execution evidence):

> Jūs: Norėčiau daugiau užklausų iš svetainės. Nuo ko pradėti?
>
> Koordinatorius: Pirmiausia patikrinsime, kaip lankytojas randa pasiūlymą ir pateikia užklausą. SEO agentui pavedu įvertinti paieškos puslapius, o svetainės agentui – užklausos kelią.
>
> SEO agentas · atsako į paskirtą užduotį: Peržiūrėjau nurodytus puslapius. Mano išvada ir šaltiniai pateikti šalia.
>
> Svetainės agentas · atsako į paskirtą užduotį: Užklausos kelio patikros rezultatas pateiktas šalia. Nepatikrintos dalys aiškiai pažymėtos.
>
> Koordinatorius: Sujungiau išvadas. Siūlau pirmiausia atlikti šį pakeitimą; kitam veiksmui reikia jūsų sprendimo.

The main conversation shows owner messages, coordinator decisions/delegations, useful specialist results, material disagreement and the next owner action. Routine tool events and repeated progress updates remain in the right-hand Activity panel. A task's public discussion can be expanded inside the same conversation view. Raw prompts, hidden model reasoning, private customer inbox material and unrestricted event payloads are never the public transcript.

Message replies retain a reference to the original message and task. Replying to a specialist's bubble sends a contextualized owner message to the coordinator in the first version. Explicit owner-to-specialist `@` targeting is an optional later extension, not a prerequisite for the chosen coordinator-led flow.

## Who receives and reads a message

Persisting an owner message does not invoke every agent. The server records it once and routes the coordinator's turn. The coordinator either answers within its remit, asks one necessary question, or proposes a bounded delegation. A specialist invocation is created only after that proposal passes current server-side authority and capability checks.

All eligible team members can use the permitted common business context when assigned work. They do not continuously reread every message, maintain a live model connection, or receive an identical full transcript on every turn. Team awareness and model invocation are separate capabilities.

An `@seo` shown in the coordinator's delegation is a readable link to a server-resolved team member. The actual execution target is a stable participant ID in a typed delegation, not text matching. An agent's incidental mention of another agent does not start that agent. Unknown, renamed, ambiguous or unavailable members cannot silently route to a different identity.

## Maintained core primitives and their limits

| Maintained source | Reuse | Limit that the group conversation must address |
| --- | --- | --- |
| [Discovery wire](../agent-business-core/runtime/src/pinet_core/business_discovery/wire.py) and [service](../agent-business-core/runtime/src/pinet_core/business_discovery/service.py) | Owner-scoped discovery, ordered history, exact reports/build approval, saved job/attempt states | `MessageItem` has only user/assistant; execution roles are a bounded workflow, not arbitrary speaking participants or delegation |
| [Creation team wire](../agent-business-core/runtime/src/pinet_core/creation/team_wire.py) and [team execution](../agent-business-core/runtime/src/pinet_core/creation/team.py) | Real saved role/attempt/event provenance, evidence findings, shared reservation limits, current source and authority fences | Fixed creator/critic/coordinator and private-draft job scope; not a general-purpose team-chat protocol |
| [Customer text wire](../agent-business-core/runtime/src/pinet_core/customer_text/wire.py) and [service](../agent-business-core/runtime/src/pinet_core/customer_text/service.py) | Ordinary customer authority, durable text events, cursor history, exact request replay, need revisions, leases, bounded context and knowledge reads | Creation-bound, admitted local text service; no arbitrary recipient/participant list or delegated group messages |
| [Customer agent wire](../agent-business-core/runtime/src/pinet_core/customer_agents/wire.py) and [models](../agent-business-core/runtime/src/pinet_core/customer_agents/models.py) | Stable configured-agent identity, business binding, immutable specification revisions and readiness | Existing configured modules are drafts with execution/activation disabled; a saved specification is not a callable team member |
| [Task models](../agent-business-core/runtime/src/pinet_core/tasks/models.py), [service](../agent-business-core/runtime/src/pinet_core/tasks/service.py), [routes](../agent-business-core/runtime/src/pinet_core/tasks/routes.py) | Task/run/event accounting, sequence, lease and parent-scope patterns | `chat.v1` routes are operator-only and `chat.consult`-restricted; never expose them as customer authority by merely reusing the URL |
| [Conversation/event models](../agent-business-core/runtime/src/pinet_core/models.py) | Durable ordered events, immutable keys, scoped parent constraints and job infrastructure | Existing Conversation requires a business/case; an unregistered discovery cannot be placed there by inventing a business grant |
| [Knowledge service](../agent-business-core/runtime/src/pinet_core/knowledge.py) and [index](../agent-business-core/runtime/src/pinet_core/knowledge_index.py) | Approved source references, bounded retrieval, hashes, TTL and durable revocations | Approved website knowledge is not a general bucket for chat guesses, coordinator instructions or private customer records |

Extend this canonical core. Do not add a parallel agent executor, permission system, scheduler, memory database or calibration framework. New domain records inside the existing PostgreSQL/core are acceptable when existing strict models cannot represent the requirement; their exact migration and runtime ownership need a reviewed contract before implementation.

## Architecture responsibilities

| Responsibility | Required behavior |
| --- | --- |
| Conversation and event storage | One authoritative ordered history; server-bound author, audience, task and reply links; resumable reads |
| Team registry | Who belongs to this scoped team, each member's role/capabilities/configuration, current availability and execution admission |
| Coordinator routing | Convert an owner's goal into an answer or bounded task proposals; keep one owner-facing accountable coordinator |
| Context assembly | Build a versioned, permission-filtered context packet for the assigned task |
| Delegation admission and execution | Validate proposals, reserve the shared budget, reuse maintained executors, fence changes and retain attempt receipts |
| Customer projection and UI | Show trusted authors, assignments, actual results, artifacts, blocked states and explicit approval actions |

These are responsibilities within one core, not a prescription for six independent services. Begin with a small core domain extension and the existing worker/executor infrastructure. Transport can initially use cursor polling; correctness must not depend on SSE or WebSocket delivery. A later streaming transport reads the same committed events and resumes by sequence rather than creating another transcript.

## Proposed semantic contract

The following records are design requirements, not supported DTO names or a final SQL schema:

- **Team conversation:** stable conversation identity, customer/environment/portfolio scope, explicit lifecycle binding, accepted event sequence and state.
- **Participant:** stable member ID, display name/alias, built-in role or existing configured-agent reference, current configuration revision, capability/admission state and scoped membership revision. A name or model session is not identity.
- **Public message:** immutable message ID/sequence, trusted sender ID/type, visibility, root turn/task ID, optional reply-to message, concise content and exact artifact/evidence references. Execution provenance is server-bound.
- **Delegated task:** parent/root task IDs, initiating coordinator run, recipient member ID, purpose, deliverable, dependencies, acceptance conditions, pinned context/configuration, execution state and budget reservation references.
- **Context snapshot receipt:** context revision, history cutoff and selected event ranges, fact/decision/document references, roster/configuration revisions, source hashes and omitted/unavailable-source markers. Sensitive bodies remain private.
- **Decision/approval reference:** exact decision or artifact revision/hash, who had authority to approve it, current state and supersession reference. Discussion cannot grant activation/publication.

The server does not accept client- or model-selected sender identities, source revisions, authority, provider profiles, arbitrary tool permissions or fabricated approval states. A model supplies a proposed task/answer; the maintained core binds and validates its execution metadata.

Strict versioned customer read/write contracts and source imports are required before portal implementation. Historical business-discovery.v1, creation.v1, team.v1, customer-text.v1 and customer-agents.v1 retain their promised compatibility; do not overload their existing `assistant` field with invented authors. A future team-conversation contract should be additive unless a separately reviewed migration requires another version.

## Lifecycle and authority

Before business registration, only the scoped discovery/build participants and currently admitted capabilities are eligible. A future SEO, designer or customer-service member is not activated by being visible in the roster.

Discovery → linked creation → registered business must be resolved through canonical IDs and exact build/registration relationships. Preserve original segment IDs, reports, authors and approvals. One logical workspace can compose these segments, but a visual composition alone is not a new persistence or permission contract. Do not join segments by title/domain, transfer ownership, create a phantom grant, or rewrite historical messages to pretend a specialist spoke them.

Before selecting the final storage shape, record an ADR deciding how a customer-owned team conversation spans this lifecycle while preserving the existing business/case requirements. Default is an additive domain aggregate in the current core with explicit segment bindings, not modification of every legacy Conversation row. The ADR must name migrations, RLS/foreign-key scope constraints, ordinary-customer authorization and compatibility behavior.

Every read, delegation, provider start, result commit and privileged action rechecks current actor/environment/scope and relevant member authority. Revoked membership, source/configuration changes, archived work or expired leases cannot be bypassed by an old context snapshot.

## Shared context and team awareness

Common context has distinct layers:

1. **Business facts:** maintained accepted profile/source data; fact, owner statement and hypothesis remain distinguished.
2. **Conversation history:** ordered messages and their reply/task links; a summary points back to its source events.
3. **Decisions:** accepted goals, constraints and superseded decisions with their scope and revision.
4. **Tasks and results:** dependencies, status, exact documents, reviews and relevant evidence.
5. **Team roster:** eligible colleagues, their purposes, capabilities and current availability; this is not their private prompts or all customer data.

For each invocation, assemble only the permitted portions needed for the current task: coordinator goal, delegated deliverable, current relevant facts/decisions, recent relevant messages, selected historical references, exact document revisions, dependencies and role configuration. The coordinator can retrieve broader permitted history when planning; specialists normally receive the relevant subset and can request additional scoped evidence.

Summaries are derived caches with explicit covered sequence ranges, hashes and invalidation rules. They never become permission grants or replace exact approved facts/documents. Contradictory facts or missing context are exposed as an unresolved decision. Do not silently truncate a business requirement and then claim it was considered. A context receipt makes replay/explanation possible without publishing raw prompts or hidden reasoning.

Reuse the current knowledge index's source/TTL/revocation rules for approved website material. Other private context stays in its proper existing domain and joins the packet through controlled reads. If that domain needs a maintained decision projection, define the smallest missing projection in core; do not build a second universal memory store.

A new agent joins through the maintained configuration/admission process, receives a stable scoped participant mapping and a permitted onboarding packet of current business/decisions/tasks/team capabilities. It can identify which colleague to request without executing that colleague. New roster/configuration revisions are checked at the next task and before execution; they do not hot-rewrite an active run's instruction snapshot. Agent creation/configuration, team membership, execution readiness, calibration and external-channel activation remain separate states.

## Coordinator-owned agent creation and calibration

The owner's additional requirement is end-to-end: “we need a new agent that does this work” becomes one coordinator-owned provisioning task, including creation, tool/source preparation, calibration, correction, verified adoption and team onboarding. The owner must not need a second “now calibrate it” request. This is an accepted planning requirement; a universal production agent factory is not implemented by this document.

Reuse the canonical [create-and-calibrate contract](../SKILLS/business-agent-calibration/references/create-and-calibrate.md), [calibration skill](../SKILLS/business-agent-calibration/SKILL.md), maintained [runbook](../SKILLS/business-agent-calibration/references/runbook.md), existing [customer agent lab](../agent-business-core/runtime/src/pinet_core/customer_agents/lab.py) and [business tool contract](../BUSINESS_TOOLS_CORE.md). Do not duplicate their evaluator, scorer, protected corpus, learning controller or tool policy. Their applicable authority, channel and execution-budget conditions remain in force.

Proposed coordinator-owned stages:

| Stage | Coordinator responsibility and saved evidence |
| --- | --- |
| Purpose and result | Convert the owner's goal into a concrete job, outputs, success conditions, autonomy and business constraints. Ask only for indispensable unknown facts/choices; derive routine configuration from existing context. |
| Capability coverage | Compare required actions against currently admitted tools/adapters. Record existing coverage, missing implementation and external access dependencies; a prompt cannot supply a missing capability. |
| Durable creation | Save/reconcile one existing agent draft identity and immutable specification revision using canonical request/CAS rules. Bind the provisioning task and future team participant to that exact agent/business/configuration. |
| Knowledge and tools | Prepare approved sources, maintained role instructions, relevant team context and only the tools needed for this job. Resolve actual connector/admission prerequisites without copying secrets into chat. |
| Baseline and calibration | Run the maintained task-appropriate calibration path against actual supported core/tool behavior, retaining source/configuration/knowledge/tool versions, protected cases, usage and original failures. |
| Repair and regression | Diagnose whether the cause is behavior, facts, an adapter, transport, infrastructure or evaluation; fix the smallest authorized cause, run meaningful regression and unseen protected cases. Preserve the original failure. |
| Adoption and rollback | Bind acceptance to the tested configuration/release and actual adapter adoption; preserve the last verified version and restoration path. A candidate or stored numeric score alone is not calibration. |
| Team onboarding | Add the prepared stable participant with its current purposes/capabilities, relevant common context and verified readiness. Coordinator and colleagues can discover what it can do. |
| Operational execution | Start only the admitted job/channel with applicable current business authority and source/readiness. Agent creation, calibration, team presence and external activation remain independently visible. |

All stages are one resumable parent task. The chat shows concise milestones and specific blockers; the Activity/Checks panels retain detail. Reconnect or a repeated owner request with the same key/material reconciles the original draft/provisioning job instead of making a duplicate agent. Known existing authorization is reused; a missing credential, unavailable runtime or exhausted execution budget is a concrete dependency, not a reason to ask the owner to supervise every routine step.

“Created and calibrated” refers to the declared, actually tested job. An internal data-analysis agent needs its data/tool/output behavior verified; a customer conversation agent uses the applicable conversation/contact/channel requirements of the maintained contract. Group-chat membership does not silently add voice, SMTP or other external channels to an unrelated internal purpose. Existing narrower owner scope and holds take precedence.

### Extensible capabilities rather than fixed agent names

Purpose names and display aliases organize the UI. Flexibility comes from a maintained capability registry and task composition. Each executable capability must have a stable key/version, typed inputs/outputs, implemented adapter, relevant data/resource scope, allowed action class, current admission, test evidence, quota/cost/deadline rules and failure behavior. Agents can combine compatible admitted capabilities into a new business role without rewriting the whole conversation system.

Maintain three distinct states: requested capability, implemented/tested adapter, and admitted execution for this business. Customer-agents.v1's four purpose choices organize saved drafts; they do not install four runtimes or grant arbitrary capabilities. A `custom` specification must not become unrestricted shell/tool execution or an unvalidated model-selected endpoint.

Provisioning uses a capability dependency graph: sources/access, required adapters, configuration, tests, readiness and operational job/channel dependencies. Future readiness should be defined per actual purpose rather than forcing every internal role to have every external channel. This does not weaken current discovery-origin foundation or registration gates; changing an existing prerequisite requires an explicit core contract/policy increment and regression, not a frontend exception.

When a required capability is missing, the coordinator owns a development dependency: define the smallest adapter/core extension, route it through the maintained source ownership/review/regression/release process, then verify actual adoption and recalibrate the affected job. It cannot invent a tool result or hot-install self-generated production code. Reuse [CORE_IMPROVEMENT](../CORE_IMPROVEMENT.md); do not create a second execution or permission framework.

Flexibility includes research, writing, analysis, pricing/stock reads, offer preparation, approved CRM/catalogue updates and other domain work when the corresponding capability exists and is admitted. Actual supported coverage is discovered from the registry rather than promised universally. High-impact action classes use their existing precise authority; the owner's requested job can authorize applicable operations within its stated scope, without giving all agents every permission by default.

Every custom role's acceptance must cover both useful work and relevant exceptions: incomplete data, revised intent, duplicate execution, unavailable tools, scope denial, interruption and recovery. Use the existing supported evaluation/learning mechanisms; define only the missing task adapter/cases/criteria, keeping protected tests and production facts unchanged. A configured but uncalibrated member stays visibly in preparation and cannot be presented as operationally ready.

Provisioning also needs acceptance tests: duplicate requests produce one identity; calibration failure never activates; missing capability opens a truthful development dependency; replay after crash retains usage and configuration; a revised specification requires appropriate revalidation; registry membership cannot widen permissions; newly admitted colleagues learn current team capabilities; current quotas apply across the entire preparation task; verified release/rollback is demonstrated in the actual adapter.

## Scheduling, disagreements and new owner messages

The coordinator is the single writer of the active task plan for an owner turn. Specialists can work concurrently only on genuinely independent admitted tasks. Shared document/business mutations require the maintained resource owner, exact base revision and serialization/CAS checks. A new chat feature does not permit a late result to overwrite a newer document.

An owner can continue writing while work runs. For the future group contract, the server should persist the new message and clearly mark it queued for coordinator attention rather than ambiguously dropping it or pretending every active specialist has already read it. Existing discovery/creation write restrictions remain until that new behavior is implemented in the canonical service.

A reply/correction references the affected task. The coordinator revises its plan after admitting the new intent; affected old work is fenced or explicitly cancelled. Independent tasks may continue if still valid. A Stop action is server-authoritative and acknowledged only after its result is known; it cannot depend on a model interpreting a sentence promptly. Charged in-flight attempts and historic failures are retained.

Specialist disagreement stays visible with the disputed decision, evidence and required change. The coordinator resolves a normal dependency or asks the owner for the specific business choice. It cannot hide a blocker, impersonate a specialist, or convert a negative review into approval. A unavailable specialist gets a truthful blocked/queued state; a proposed alternative colleague is disclosed before execution.

## Bounded delegation and failure handling

Only typed, admitted task proposals schedule work. An agent reply or untrusted document containing an `@` does not trigger another model. Parent/root IDs and a visited-task/participant path prevent ping-pong loops and uncontrolled delegation. First implementation restricts specialist onward requests to the coordinator; broader peer delegation is a later separately admitted capability.

Use one shared root-turn budget/reservation tree across coordinator planning, specialists, synthesis and retries. Existing stricter daily/per-job/per-provider quotas and deadlines continue to apply; splitting work into children cannot multiply the allowance. The creation team's current two-round/six-call limits belong to that job type and must not be blindly copied or relaxed for a new conversation type. Exact team-turn limits need a reviewed core configuration and the actual owner's execution budget before model trials.

Message acceptance, delegation admission and corresponding durable queue/reservation state must be atomic, with immutable request keys/fingerprints. Refresh/reconnect replays accepted results, not model calls. An uncertain request remains uncertain until the canonical status is read. Lease expiry, interrupted provider output, worker restart or logout do not authorize an automatic paid repeat. Preserve per-attempt usage and unknown monetary cost.

Results publish once under an exact current task/context/configuration and trusted run/member binding. Event sequence is assigned by storage, not timestamps or clients. Late results retain their history but do not become the active accepted result after a superseding owner correction. No generic UI sorting by receipt timestamps.

## Workspace UI extension

- Main header: selected business, current conversation, coordinator identity and accessible team roster. Composer recipient remains Koordinatoriui.
- Messages: actual author name/role, task/reply relation and links to exact results. A compact coordinator → specialist assignment explains why the member joined.
- Activity: admitted tasks, dependencies, actual running/completed/failed states and important checks; no fabricated typing/progress.
- Plan/results/checks: preserve the existing right-hand documents, approval/version behavior and module readiness. Ordinary discussion does not publish, send marketing or activate a channel.
- Team roster: purpose, availability and last maintained configuration/readiness. Visible membership is not an assertion that an inactive agent is working.
- Long discussions: collapse a task's supplementary public discussion while retaining the main conclusion and blocker. Filters provide the complete permitted public transcript; no mandatory separate agent chat.
- Mobile/keyboard: retain the current three-area switching, draft preservation, focus return, author text and clear contextual reply controls.

Read/delivery indicators distinguish message saved, task queued, admitted/running and result saved. Do not label a message “read by everyone” from mere group membership. A context receipt proves what was supplied to an invoked task, not that a model semantically understood every sentence.

## Implementation sequence and acceptance

1. **Contract/ADR first:** inventory maintained primitives; choose lifecycle binding/storage, participant identity, typed delegation, author provenance and ordinary-customer grants. Reserve exact files with one writer for each schema/service/BFF.
2. **Provider0 persistence and projection:** ordinary customer can save/read ordered conversation messages and scoped roster; replay/paging/reconnect work without invoking models. Legacy authors and approvals remain intact.
3. **Coordinator-facing UX:** composer, actual authors, assignment/task cards, contextual reply, waiting/error/disabled states and right-hand results. Use isolated synthetic fixtures, inspect desktop/mobile/keyboard and receive UI/UX acceptance.
4. **One real coordinator + one specialist:** after UI/UX acceptance and execution admission/budget, perform a bounded actual task using existing executors, shared accounting and exact context/result receipts. No simulated specialist answer as acceptance evidence.
5. **Multiple specialists and corrections:** controlled independent tasks, shared-resource CAS, disagreements, interruptions, queued owner follow-ups and authoritative Stop. Extend existing regression/protected calibration cases; no new scorer/corpus/framework.
6. **Future member onboarding:** configured/admitted agent joins the roster, discovers permitted colleagues, uses current facts and survives rename/removal/configuration change without broadening authority. Optional direct owner `@` routing comes only after this foundation.

| Acceptance case | Required evidence |
| --- | --- |
| Owner asks a normal question | Coordinator is the only default recipient; no all-member model fan-out |
| Coordinator assigns one task | Same conversation shows the assignment and real specialist author bound to its saved run |
| Unknown/disabled colleague | Clear blocked/clarification state; no guessed substitute, fake reply or accidental call |
| Later agent joins or is renamed | Stable identity and permitted roster updates; old message authors and configuration provenance remain correct |
| Large history/context | Required facts/decisions retained or explicitly unavailable; source ranges and summaries verifiable |
| Parallel specialist results | Deterministic stored ordering, unique publication and exact artifact revisions |
| Owner corrects ongoing work | Durable new intent, visible waiting/revision state; superseded work cannot overwrite current decisions |
| Negative review or conflict | Visible evidence/blocker; no automatic approval disguised as coordination |
| Reconnect, duplicate POST or crash | Same request/result IDs and charged receipts; no double task/provider invocation |
| Membership/knowledge/source revoked mid-run | Current authority fences execution/result; original history preserved |
| Foreign portfolio/environment | Customer API/BFF/RLS deny access; IDs/aliases cannot disclose another team's private content |
| Budget/cycle/deadline exhaustion | Bounded stop with partial saved results and truthful accounting |
| Publication/channel action requested | Existing exact approval/readiness/transport gates still apply |
| Old discovery/creation/customer text flows | Their prior contracts, UUID/CAS/hash semantics and authority remain compatible |

Planning completion means this source-backed design is saved and reviewable. It does not mean the group protocol, agents, shared-context projection, running UI, real model quality or full platform is accepted. Current workspace final-browser confirmation also remains a separate outstanding receipt.
