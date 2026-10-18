# Private agent configuration readiness wire

The owner's explicit internal research/email preparation request requires a
narrow contract correction: private configuration eligibility must be visible
without asserting that the complete Website Foundation has passed. The previous
private-draft contract required full Foundation. This endpoint is the additive
wire for the corrected scope; its existence is not prior permission or proof
that the new authority has been implemented or adopted.

`GET /customer/v2/creations/{creation_id}/agents/preparation-readiness` uses
`contract_version: customer-agent-preparation-readiness.v1`. It is declared before
the dynamic `agents/{agent_id}` route and delegates only the existing owner
bearer and Creation identity to `service.preparation_readiness`. It has no model,
purpose, source, permission, skip flag or other readiness selector input. The
normal safe route preserves private/no-store responses and safe authority errors.

The data contains `creation_id` and exactly four purpose entries in canonical
order: `site_chat`, `customer_research`, `email`, `custom`. Each entry contains:

| Field | Meaning |
| --- | --- |
| `purpose` | Existing immutable draft purpose. |
| `readiness_scope` | `full_website` or `private_preparation`, chosen by the server. Only research/email may use private preparation. |
| `can_create_draft` | Strict boolean for current configuration eligibility. |
| `configuration_blockers` | Empty when eligible; otherwise one of `agent_business_not_current`, `website_foundation_not_ready`, `private_preparation_not_ready`. |

Top-level `operation` is always `agent_configuration_only`.
`provider_execution`, `can_calibrate` and `can_activate` are always false;
`channel_activation` remains `not_performed`. No Foundation, full F1, Source,
Profile, current knowledge, calibration or channel admission is inferred or
reported by this response. A successful GET is a read, not a configuration save,
model authorization, preparation run or delivery receipt.

The existing `customer-agents.v1` DTO fields, enums, paths and operation semantics
remain unchanged. Its listing retains conservative full-Website global creation
eligibility. A stored-agent detail may use its existing edit boolean and existing
blocker enum to describe current purpose-specific edit eligibility. The new
`private_preparation_not_ready` code belongs only to this separate contract;
strict old portal DTOs receive no new fields or enum members.

Root owns the authoritative readiness helper and purpose-specific write/model
calls. That implementation must retain current verified owner/Session/grant,
exact accepted Registration and freshly selected S37/private native/source pins.
Full Website, site-chat, custom, generic provisioning, Profile, channel and lab
gates remain separate. The wire does not disable any audit criterion, mark local
SMTP/inbox PASS, enable a live recipient or renew a closed model budget. There is
no migration, new queue, SQL grant or alternative configuration store here.

## Source verification

Base: `76db483db8213a5ec6eb8283e71ccd52e7b79c01`; public companion:
`255fea0813bf1aabeaeea2f2de0b29564118f2fc`. The new offline suite checks strict
shape/order/scope and contradictory readiness, forbidden admission claims, fixed
route precedence, separate envelope, in-process GET delegation/private headers,
safe refusals and both maintained app mounts. Removing only the new path and
three new schemas must reproduce the entire previous canonical OpenAPI document
with sorted-JSON SHA256
`93b1be9ee6660f0a15ce6dd88ad58ff6b3c7bfcf8f116b5462e1cc21f1fb48b9`.
The existing inventory assertions change only from six paths/eight operations to
seven/nine; their semantic and security assertions remain intact.

Tests use inert service results and no listening server, database, browser or
provider. They do not establish real S37/owner authority, model calibration,
operating adoption or Website completion. Root's separately retained plan-linked
PostgreSQL/operating checks are required for those claims. The original missing
fixed-route failure is retained privately before implementation.

The retained original route-presence regression failed once before the patch
(2.76s). After implementation, all 60 new-wire/existing-configuration tests
passed (6.48s); the related evidence/lab/session/protection/Foundation-projection
suite passed all 190 tests (4.09s). Scoped Ruff and diff checks passed. These are
wire/source results; Root's authority implementation and operating adoption are
separate dependencies.
