# Explicit local acquisition-module administration

The normal capture runtime requires an existing trusted `acquisition_modules`
row. Its restricted database role remains SELECT-only. The explicit operator
CLI supplies the missing maintained writer; it does not grant permission to a
customer, model, browser or runtime worker to approve itself.

Run `scripts/acquisition_module_admin.py approve|stop|inspect --input <private.json>
--receipt <new-private-path>` through the current paired Git freshness wrapper.
Use a privileged local/test connection. Input and receipts stay outside Git and
public artifacts. No route, migration, background job or provider is added.

Every action requires the exact `registration_id`, current verified owner's
`authorizing_session_id` and current clean `execution_source_revision`. The
Registration used for approval must be current/unrevoked and still match canonical accepted native
material, owner, portfolio and enabled Grant. Site/business/organization/approver
are derived server-side; input cannot choose them. Website Foundation, public
launch and customer Profile remain separate. Existing host/domain authority is
not promoted by this operation.

Approval additionally supplies a stable `adapter_id`, unique explicit permissions
from `acquisition.capture`, `acquisition.read`, `acquisition.correspondence`,
`acquisition.correspondence.read`, `acquisition.work`, and a 30–3600 second lease.
These are the existing synthetic capture/work permissions. There is no sending,
discovery, scheduler, model execution or production permission in this list.
SMTP and voice must remain disabled for this local capture configuration.

Initial approval requires no existing module (`expected_fingerprint: null`).
An explicit subsequent approval requires the exact observed fingerprint. It
records a new DB-clock approval/expiry; retries do not implicitly extend it.
Changing the adapter of an existing module is refused because retained Case and
recipient bindings depend on it. `stop` requires the exact fingerprint and changes
only `enabled` to false, preserving approval metadata and retained correspondence.
Containment (`stop`/`inspect`) retains the exact historical Registration, current
verified owner, immutable tenant/Business/Grant identity and clean operator source
checks. It does not require a fresh native intake, current Registration revision,
unrevoked Registration, idle website Creation or enabled Grant, so expired upstream admission cannot
prevent disabling an existing module. A misconfigured module can be stopped
without rewriting its metadata. SMTP/voice configuration cannot block containment;
these actions perform no channel I/O and cannot grant or renew a lease.
The shared Registration actor keeps its default idle-Creation precondition for
all existing writers. Only these containment calls opt out; owner/Session/account,
tenant checks and the actor-before-Creation lock order stay unchanged.
`inspect` writes no database state. No action starts the API or enables global
capture/work flags, a private transport registration, channels or workers.

The required private receipt is reserved before database work, then stores full
before/after module metadata in a prepared record. A separate committed marker
follows transaction commit. Authority, source, module identity and approval TTL
are checked again after receipt fsync before commit. A missing committed marker
requires inspecting retained evidence and current module state; do not replay an
uncertain approval into another lease. Existing receipt paths are never replaced.
Same-material API idempotency is not claimed: these are explicit operator CAS
operations, not a public self-service endpoint. Historical rows and messages are
not rewritten to appear current.

Headless model preparation/calibration remains the existing acquisition engine
and dialogue lab. Saved customer Agent native S5 currently supports `site_chat`;
this writer does not turn an email/research draft into that runtime. The normal
common-Task capture path still uses model `none`. A later bounded Task/model
adapter and actual transport/inbox admission remain required for continuous work.
Old correspondence pinned to another source remains blocked by its maintained
source fence; this command does not migrate/adopt those Cases or relabel old tests.

This source increment is initially unused and not adopted into operating data.
Verification and actual adoption are recorded separately in its unique upgrade
journal and the platform checkpoint. No live mail or completed calibration is
implied by an enabled configuration row.
