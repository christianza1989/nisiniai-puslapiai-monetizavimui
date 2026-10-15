# Direct messenger wire handoff

This packet exports `workspace-direct.v1` independently of the existing group,
directory and immutable native Episode contracts. Import/export starts no API,
database, worker, provider or native preview. It does not establish serving
readiness. Root owns public OpenAPI combination, frontend codegen/BFF and actual
PostgreSQL/adoption/provider trials.

Export from the runtime source with the normal Python dependencies:

```powershell
$env:PYTHONPATH='agent-business-core/runtime/src'
python -X utf8 -B -m pinet_core.workspace_team.direct_contract --output <private-output.json>
```

Base: `/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/direct`.
Seven operations cover recipient listing, chat listing/creation/detail, chat
history, sending one turn and cancelling a URL-bound turn. The immutable recipient
is selected when creating the chat; `DirectSend` accepts only UUID, content and an
optional reply. It cannot override recipient, execution scope, model or tools.

`DirectRecipient` distinguishes source-fixed consultant identity/capability/hash
from saved Agent/Config revision/hash. `DirectExecutionScope` independently
distinguishes an owned portfolio/creation/discovery workspace from a real business/grant.
Saved-agent preview cannot use workspace-only execution. The server derives and
rechecks these bindings; schemas and directory metadata never supply authority.

The frontend receives actual readiness/blockers, real Task states and reserved/
settled call observations. Consultant turns allow one tools-disabled call. Native
preview reserves at most one text plus two existing Quality calls, preserves
current transcript/config evidence and remains draft/not admitted/not activated.
Until native preview is implemented and explicitly admitted, its composer remains
blocked. DTO support is not admission or a promise of an operating channel.
Every turn also carries server-projected `can_cancel`; terminal Tasks cannot claim
that capability. The frontend must not infer current authorization from status alone.

History is server-held and chat-bound, including trusted owner/consultant/native
author provenance, message SHA, exact current configuration and native conversation
identity. It must survive reload; browser filtering/localStorage is not isolation.
Existing 20-turn chat and 20-event model-context limits remain. Preserve old group
rows/receipts and never silently import their context into a direct chat.

Runtime follows this wire in separate bounded packets: consultant direct calls
first, then incremental native preview using a new immutable plan/fence. Do not
append future messages into an old frozen EpisodePlan or impersonate a saved
agent through the generic adviser. Root explicitly authorized only the necessary
Task execution-scope union; old business/native grant requirements stay exact.

Rollback of this packet is a scoped wire-export revert. It registers no routes,
changes no Task/database schemas and performs no migration or effect.
