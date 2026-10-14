# Exact approved-build lookup

Root follow-through review found a second queue boundary after the S7 owner keyset fix: site_build.service.advance applies its selected creation_id outside the legacy control_site_build_candidates(e) function, which limits to100 historical approval rows internally. A newer valid target can therefore remain blocked even though the supervisor reaches its ID.

Reserve a separate additive exact-approval overload, filtering target before its bounded result, preserving the old one-argument function and its eligibility predicates. The maintained worker must consume this selected result and continue its existing current actor/Session/source/approval/native-intake/GUIDE gates. Require the overload at supervisor readiness; a missing migration fails closed. No new evaluator, scheduler, permission system, DTO or provider path.

Initial proof uses one actual canonical Discovery/approved Creation/native-intake target and105 older lookup-only fixtures. Only the actual newer target is executed through the existing GUIDE worker with inert role outputs. Earlier fixtures do not prove accepted content or native writes. Baseline/regression receipts and current-source migration/adoption are recorded separately.

Own source startsc26384d5dc5c3a319a71b08edf1a4065d80e89ca/public1a26f289092cecadc5799de898e809dc1769498a. Scope reservation issue66#6175192300; upgrade7303532c-907a-44cd-b95e-9a705cddff98. Peer S8 profile/0038 remains independently owned. Migration0039 will follow released0038; original0030/0037/0038 and preview0032 remain unchanged. Before adoption rollback is a scoped source revert; additive migration downgrade removes only the new overload and needs a coordinated source restart.
