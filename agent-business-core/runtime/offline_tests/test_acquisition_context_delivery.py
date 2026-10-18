"""Preserve actual qualification fields without exposing execution provenance."""
from test_acquisition_business_projection import value

from pinet_core.acquisition.agent_role_projection import business_context


def test_verified_contact_basis_and_evidence_validity_reach_business_roles():
    original = value()
    packet = business_context(original, parents=[])
    for field in ("contact_source_id", "contact_verified", "contact_basis_verified", "provider_allowed"):
        assert packet["prospect"][field] == getattr(original.prospect, field)
    expected = original.prospect.evidence[0]
    evidence = packet["prospect"]["evidence"][0]
    assert evidence["checked_at"] == expected.checked_at.isoformat()
    assert evidence["expires_at"] == expected.expires_at.isoformat()
    assert evidence["use_allowed"] is expected.use_allowed
    assert packet["campaign"]["expires_at"] == original.campaign.expires_at.isoformat()
    assert packet["campaign"]["facts"][0]["expires_at"] == original.campaign.facts[0].expires_at.isoformat()
    assert "calibration" not in packet and "recipient" not in packet
