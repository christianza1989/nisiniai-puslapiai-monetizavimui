# Recipient-less acquisition evidence admission

The strict `acquisition-evidence-role.v1` request admits retained public material
to saved-agent research, then independently bound qualification. It reuses the
existing `acquisition.agent_role` Task kind, six current Config grants, common
worker/TaskRun, immutable attempts, owner/RLS, heartbeat and absolute deadlines.
The synthetic v1 request and `SyntheticAddress` remain unchanged.

An authenticated normal owner supplies a research-only campaign, candidate
key/name, requested country, exact excerpts and finite research-use admission.
Requested country must belong to the campaign and original query. The context
separately projects `verified_country=null`; query scope is not evidence of
location, intent, identity or contact rights. All source text remains untrusted.

The reference pins raw SHA-256 for `plan.private.json`, `receipt.safe.json` and
`evidence.private.json` in one absolute directory under the executing runtime's
ignored artifacts. Copy historical bytes exactly when custody is elsewhere;
preserve originals. The existing sealed reader refuses symlinks/reparse points,
outside-root paths, files over 1 MiB and changed hashes.

Receipt site/campaign/run/source must match its original plan. Selected sources
must have successful primary retrieval, original query URL/country, admitted
local exclusions, site, checked time and text hash. Exact excerpt offsets/text
are rechecked. Search snippets or unavailable pages cannot replace primary
evidence. These checks bind retained files; they do not authenticate remote
claims or fetch a source. Approved business facts still come independently
from the current business source binding and saved Config.

Owner admission lasts at most 24 hours. Original retrieval must also be at most
24 hours old against actual DB UTC; new admission or future excerpt expiry cannot
renew old text. Original timestamps/source revision stay exact. This version
has no historical-material mode. Execution clips to the earliest team/session,
campaign/fact/admission/excerpt expiry and original checked time plus 24 hours.
Files and live authority are checked before Run/reservation, before dispatch,
during heartbeat and at completion. Research use grants no contact permission.

Research has no parent. Qualification requires exact succeeded research
Task/Run/output digest with the same admission, candidate, campaign, team, scope
and source. A team cannot mix evidence and synthetic/calibration versions.
Request UUID replay returns historical work; another UUID cannot repeat the
same retained role. Changed evidence needs explicit new bounded admission.

Existing model-output schemas remain. Research has empty subject/body, no offer
fact claim and research/exclude/stop action. Qualification always returns
`eligible_for_draft=false`. The Task envelope has `origin=public_evidence`,
`synthetic=false`, `contactability=unverified`, `draft_authorized=false` and
`external_sent=false`. References must identify supplied source excerpts.

Recipient, mail, calibration and contact-permission fields are forbidden.
Writer/reply/quality/capture cannot consume this version/lineage; SQL enforces
the boundary independently of service parsing. No Contact, ContactPolicy, Case,
MailMessage or outbox is created. Existing contact stops remain unchanged.
Real CRM/contact ownership and bounded reviewed initial mail need a later
explicit admission with actual recipient provenance and applicable rights.

From runtime, `scripts/acquisition_evidence_task.py submit --session-file
ABSOLUTE_PRIVATE_SESSION.json --input ABSOLUTE_PRIVATE_REQUEST.json` admits a
typed request. `read --session-file ... --task-id ...` returns owned status and
usage without printing source text. Tokens stay private. `run-one` invokes the
existing fixed agent-role queue and accepts no session/input/task selection.
Every queued role retains its normal authority checks; this is not another
runner or scheduler.

Migration 0052 adds a narrow SQL helper/dispatch to 0050. Tables, existing rows,
grants, projections and synthetic behavior remain retained. Trusted migration
owner is required; runtime table privileges do not broaden. Stop exact grants
and worker to contain the feature; downgrade never erases attempts.

Inert acceptance covers owner submit/read/fixed-worker research/qualification,
replay/races, direct-SQL escalation refusal, source age/hash/quote/market/parent
boundaries, revocation, unknown usage and old synthetic regression. This is
separate from reviewed main delivery, operating adoption and an authorized
actual research run on real discovery material.
