# Reviewed external-business registration

Issue66, source baseline f774485093a92b076575804749877928bfe6ae57.
The existing `network_bootstrap.py` admits only the six static legacy voice
Profiles. `customer.admin.decide` correctly requires a registered Business UUID;
neither registers a newly built independent business through the customer claim.
The existing privileged control bootstrap already has a general Business mapper;
this change connects that mapper to the reviewed customer claim. A source binding
or saved Agent cannot fill that missing customer step. Do not fabricate a CreationRegistration
or add a voice Profile merely to attach acquisition agents.

`customer.registration.register_intake` now supplies that narrow local admin
step. It consumes an existing pending `claim` Intake with a normalized canonical
host, registers an explicit stable site ID/host pair, and calls the maintained
`customer.admin.decide` in the same transaction. Current verified Account/User,
owner Membership and Portfolio checks remain in that decision. An invalid owner,
proof or conflicting existing grant rolls back a new Business mapping too.

The CLI is `python scripts/customer_public_admin.py register-intake --input
<private.json>`. Input keys are `intake_id`, `site_id`, `note`, and
`evidence_reference`. The existing admin database connection must be privileged;
only local or explicit test environments are accepted. No HTTP endpoint is added.
Proof references and account data stay outside Git. Output contains the decision,
Business UUID, stable site/host and whether a new mapping was registered.

Site and host are globally unique identities. The maintained control bootstrap's
global registration lock and `registered_business` mapper serialize concurrent
writers across environments; exact existing mappings
retain their UUID. A mismatched site or host is refused. Existing grants are never
reassigned, including disabled grants. An already consumed intake is refused;
inspect its stored decision before retrying after an ambiguous CLI termination.
Registration does not activate any model, campaign, sender, channel or website,
and does not assert domain control, launch readiness or a supplier agreement.

Local verification: the retained, dedicated0049 PostgreSQL lane passes11 cases,
including new and exact-existing mapping, both conflict directions, consumed
intake, unverified owner, invalid proof, foreign environment, wrong intake kind,
runtime-role rejection, existing-grant rejection and simultaneous claims. The
first PG execution passed11/3.56s. A lint-only fixture-import correction retained
that result; the final same selection passed11/2.92s with scoped Ruff PASS.
No operating database or provider was used. Actual account/source/Agent import,
model admission/calibration and live mail delivery remain separate acceptance.
