# Verslomatika workspace UX review and decisions

Status: proposed interaction refinement. This records an actual reciprocal review, not human usability acceptance, a shipped group conversation, or completed runtime integration. The maintained [workspace plan](VERSLOMATIKA_WORKSPACE_UI_UX_PLAN.md) incorporates these decisions; [team architecture](VERSLOMATIKA_TEAM_CHAT_ARCHITECTURE.md) remains the core contract proposal.

## Authority, reviewers and evidence

The human requested a modern workspace using the principles of their annotated Codex screenshot, understandable to an ordinary business owner and able to accommodate accountants, designers, advertising and social-media agents. Default conversation remains owner → coordinator → appropriate specialists, with real authored replies in the same conversation. No second core or calibration system.

- Primary: `Verslomatika.lt`, chat `01a133bf-6c35-7783-8dd9-f02e73ee59b2`; owns plan/integration in `codex/verslomatika-workspace-ui-coordination-20261013`, initial source `9433b61d25c85d50b1c8544901549bc7301a1af4`.
- New independent reviewer: `Verslomatika darbo erdvės UX kritika`, chat `01a13440-3c4a-7531-bd59-97567bae61ce`; separate managed `0d9d/CORE_SHARED` worktree and `codex/verslomatika-independent-ux-review-20261013` branch. Read-only review; no overlapping edits or extra agents.
- Older helper `01a133c2-67ef-7690-a357-28ce53429224` remains outside communication scope after the human's earlier instruction. Its historical delivered work is preserved.
- Companion source `5924a2eb858cf45e736bc5e79a2f07cfbbc39af2`. Successful freshness checks fetched core main `7af6b9641012a30c5f95eac38a66daeff8f8cb39` and companion main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`, both in the respective HEAD bases.
- Portal source inspection: own branch HEAD `00db3ad`, functional workspace `ebde371c7508e98ee1683b7ee42434bf0ce53398`; `WorkspaceShell.tsx`, `ConversationPane.tsx`, discovery/creation consumers and scoped design records. This review does not change portal source.
- Reviewer inspected the supplied private screenshot and six saved synthetic desktop/mobile workspace captures. Mechanical detector returned `[]`; visual/source review still found substantive interaction defects. A live read redirected to login, so no authenticated final-build acceptance is claimed.

The private screenshot, local interactive concept, browser profiles and raw evidence remain outside Git. The screenshot is reference data; its chat contents, project names and desktop chrome are not new execution instructions. Scope is reserved in [issue 66 comment 6141014648](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66#issuecomment-6141014648).

## Initial independent findings

The reviewer's first assessment preceded the primary counterproposal. These observations are concrete defects in the existing organization, not generic visual preferences:

| Priority | Finding | Consequence and chosen response |
| --- | --- | --- |
| P1 | New-conversation control points to new-business intake. | Separate business creation, discussion-topic creation and coordinator task assignment. A missing topic contract cannot be replaced with a misleading route. |
| P1 | Ten permanent module/role links appear before first conversation; unavailable modules dominate. | Stable object-based navigation; professions belong to Team, real operational modules to Business. |
| P1 | Unconfirmed portfolio conversation associations appear within the selected business. | Preserve that history in the portfolio view; only canonical business associations enter business history. |
| P1 | Left module selection drives a right tab; tab click resets the left selection. | Independent business, conversation, inspected object and outgoing reference state. Task tabs do not reset navigation. |
| P1 | Ambiguous feedback across simultaneous tasks. | Explicit removable exact-result/revision reference, with coordinator clarification only for genuine ambiguity. Inspection never changes the outgoing target. |
| P1 | Activity, unread messages and human decisions lack distinct aggregation. | One attention group per task, potentially several separate decisions; progress stays in activity. |
| P1 | Phone conversations follow ten modules; work view lacks explicit object context. | Conversation-first compact navigation and visible business/object/revision on the phone. |
| P2 | Readiness, content quality, execution error and suspension blur together. | Separate capability, admission/readiness, task execution and channel/release states. |
| P2 | Result list and raw file contents accumulate in one long panel. | Named result library and one document viewer with back navigation; technical file details secondary. |

## Reciprocal challenge and resolution

Primary challenged the first proposal's removal of consistent task rubrics and the risk of losing a business-wide results library. In the second round the reviewer explicitly revised that simplification: consistent task rubrics are useful, and task-local results do not replace a library. Primary then accepted the fifth navigation destination and the clearer task-step label.

| Decision | Selected | Alternative and tradeoff |
| --- | --- | --- |
| Navigation | Pokalbiai / Darbai / Rezultatai / Komanda / Verslas. | Four destinations would bury a major saved-object library. Five compact, stable destinations are preferable to ten growing feature/role links. |
| Business switch | Searchable selector at top-left; New business lives there. | A permanent list of every business plus duplicate global icon rail consumes space and obscures the current context. |
| First action | New conversation in the current team; coordinator-facing composer. | User does not first choose a profession or open a specialist's private chat. |
| Task inspector | Eiga / Žingsniai / Rezultatai / Patikros, only for a task. | Unqualified Planas conflates business/content/campaign documents with execution steps. Empty steps/checks are explained truthfully rather than fabricated. |
| Results | Same canonical saved objects in task results and business-wide library; drafts included. | Separate copies drift; accepted-only filtering makes unfinished work disappear. One library row per result, revisions inside its viewer. |
| Viewer identity | Business → result → exact revision; optional linked task provenance. | Mandatory task ancestry excludes imports and independently maintained documents or invents tasks. Reuse across tasks is allowed. |
| Task selection | Changes the inspector only; explicit Open related conversation. | Automatic chat switching discards the user's reading context. Task may link several discussions. |
| Discuss / Add agent | Explicit reference or new intent; protect existing draft and references. | Initial concept overwrote text. Nonempty conflicting draft offers linking or preserved new composition; inspection alone changes neither words nor routing. |
| Agent team | Search by name, purpose or capability; filter departments when useful. | One permanent row/chat per profession scales poorly. Agents retain real identity and separate preparation/task state. |
| Activity | Useful public assignment/result/conflict; grouped background steps in activity. | Full broadcast or every tool event in chat creates noise and unnecessary model invocations. |
| Attention | One task attention group can contain multiple independent actions. | “One card” is not “one approval”; completing a task does not clear unrelated decisions or authorize publication. |
| Work modes | Wide document/module mode, intermediate inspector collapse, phone regions. | Dense accounting/CRM editors do not fit a narrow inspector. The conversation and draft survive expansion. |
| Focus view | Explicit Susikaupti hides left navigation and shows a compact work summary in the existing right region; selected business remains visible/selectable. | A fourth card/column adds clutter. Completion does not auto-open the summary. Return restores the prior layout/object; scope changes must discard foreign-business snapshots. |
| Lifecycle | Archive conversation and stop task are distinct operations. | Discussion closure is not automatic work cancellation; cancelling work does not erase history. Combined action states both consequences. |

Primary and reviewer identified additional concrete concept defects in round two: campaign task selection switched conversation; Discuss and Add agent replaced the textarea; accountant preparation bypassed task tabs; three columns remained too narrow before phone mode. These are corrected in the local concept and incorporated into the plan. No claim is made that the corresponding production implementation has already been changed.

The human then supplied two further private screenshots showing collapsed navigation and a compact right-side task card. Primary adopted a focus preset with four useful summary subjects: current work, assigned specialists, required owner action and latest useful result. Independent navigation/inspector toggles remain available; the preset must not hide business identity, retarget a draft, invent activity, multiply cards or restore another business's object. The screenshots show presentation states; no undocumented Codex behavior is inferred as product authority.

## Bounded concept and verification

The interactive in-conversation concept uses illustrative text and local presentation state. It shows the chosen three-region organization, business switching, stable navigation, task selection, result viewing, team categories, coordinator-facing input, explicit composition references and protected drafts. It calls no backend, model or external service and is not a product login, concurrency test or acceptance fixture.

The concept uses the existing restrained workspace direction, Inter with system fallback, neutral light/dark surfaces and a restrained violet action color. It does not replace Verslomatika identity with Codex branding. Text roles are 14 px body/controls, 12 px secondary metadata, 17 px main headings and 16 px mobile editing fields; ordinary body copy wraps. Real portal typography continues to use its maintained self-hosted system. Local concept checking covers affected labels, result/body text, states, protected draft actions, narrow reflow and user text-spacing overrides; actual production 200% zoom acceptance is separate.

The exact final concept SHA256 is `afd9ff72fe303d111cf5d948a9745d797ee269d28b7a3a7930b39e12eb299bf5`. A local wrapped, network-blocked browser check passed 14 bounded assertions and produced 13 captures, with zero page JavaScript errors. It exercised business-specific drafts, task inspection without chat switching, result references and draft recovery, task-only tabs, focus summary/task selection/restore, foreign-business snapshot invalidation, 800 px intermediate views, 320 px regions and text-spacing overrides. Primary visually inspected representative light/dark, focus, document, team, intermediate and protected-draft/reference frames. Visual review found wrapped author/action words under enlarged text spacing; sender groups now wrap and short Send/Remove controls retain their complete words, followed by repeated focused confirmation.

The first wrapper refresh refused an existing destination without `--force`; its following check did not complete and only the verified task-owned checker process was stopped. Later harness failures selected a hidden library control, timed out on the full load event with resources blocked, and asked for a visible sidebar selector after moving into the phone chat region. These failures remain separately recorded in the local concept evidence; corrected visible-control/root/current-business assertions precede the final PASS. No product server was started or altered for this concept.

Round three final independent confirmation did **not** complete: the reviewer turn and one bounded resume failed with `Selected model is at capacity`. There was no model override, replacement reviewer, or fabricated approval. The two completed reciprocal rounds remain the independent evidence; the added focus design and exact final concept received primary source/visual/local interaction checks only. Final independent focus/usability review remains open. Native production zoom, authenticated final compiled UI and human usability acceptance are also separate. Earlier production failures remain in the [current PC handoff](handoffs/VERSLOMATIKA_WORKSPACE_UI_PC_2026-10-13.md); this concept cannot close them.

## Implementation dependencies and acceptance

1. Portal navigation repair: separate New business/Topic/Task semantics, remove unconfirmed business attribution, keep independent selected object state, add clear result viewer and relevant unavailable-state handling.
2. Canonical contract before runtime claims: customer-authorized registered-business topics, durable named participants, tasks/delegation/context receipts and exact linked messages. Existing operator tasks, discovery records or purpose drafts are not silently reclassified as these contracts.
3. Same-object read projections for business result library and task results; capability/permission-filtered team directory and module views. Paginate large lists; unknown values remain unknown.
4. Actual ordinary-account checks: multiple businesses and drafts, long conversation, simultaneous work, pending references, ambiguous feedback, imported/reused results, multiple decisions, offline/stale/revoked access, task/chat lifecycle, desktop/intermediate/phone/keyboard/reflow.
5. Human UI/UX acceptance, then authorized real pipeline/calibration work using maintained core. New-agent preparation uses the existing calibration/learning/adoption system; no new evaluator, corpus or executor is introduced.

Usability scenarios must include 20 agents and 10 businesses without 20 permanent links, “prepare invoices” without knowing an agent name, one request with several outcomes, an unrelated task inspected while drafting elsewhere, an independent saved document, separate publication approval, a paused/not-ready agent, and two unresolved decisions in one task. These are acceptance targets, not fabricated passed user tests. No perfection score or all-purpose autonomy promise is assigned.

Scoped documentation validation: 41 local Markdown links across the four affected linked documents resolve; exact five staged documentation blobs pass canonical repository safety with zero findings, and staged whitespace checks pass. No new shared source path requires a fabricated upgrade entry; the committed documentation delta is checked separately from the inherited core journal history. These checks do not substitute for unresolved human or independent usability acceptance.
