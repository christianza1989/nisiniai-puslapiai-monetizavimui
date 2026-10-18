"""Configuration history and genuine provenance are preserved across source updates."""
from copy import deepcopy
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest
from pinet_core.customer_agents import service
from pinet_core.customer_agents.business_wire import Import, Revise
from pinet_core.workspace_team.directory_wire import DirectoryEntry


def specification():
    return {"name": "External research assistant", "goal": "Research suitable synthetic accommodation buyers",
        "audience": "Synthetic business owners", "inputs": ["Reviewed business source"],
        "outputs": ["Evidence-backed buyer shortlist"], "boundaries": ["No contacting or live actions"],
        "escalation": "Ask the owner about unconfirmed facts", "autonomy": "recommendations_only",
        "sources": ["Approved synthetic source"], "examples": [{"input": "Find suitable buyers",
            "expected": "Review a supported shortlist"}], "unknowns": []}


def rows(external=False):
    agent = SimpleNamespace(id=str(uuid4()), purpose="customer_research",
        registration_fingerprint="a"*64, external_binding_id=str(uuid4()) if external else None,
        user_id="owner", organization_id="organization", portfolio_id="portfolio", environment_id="test-source")
    config = SimpleNamespace(id=str(uuid4()), agent_id=agent.id, revision=1, payload=specification(),
        external_binding_id=agent.external_binding_id,
        external_binding_fingerprint=agent.registration_fingerprint if external else None,
        import_provenance=None, created_at=datetime(2026, 10, 18, tzinfo=UTC), saved_source_revision="b"*40,
        **{key: getattr(agent, key) for key in ("user_id", "organization_id", "portfolio_id", "environment_id")})
    config.config_sha256 = digest(service.config_material(agent, config))
    return agent, config


def test_existing_configuration_material_and_hash_do_not_gain_null_origin_keys():
    agent, config = rows()
    old = {"agent_id": agent.id, "registration_fingerprint": agent.registration_fingerprint,
        "purpose": agent.purpose, "revision": 1, "specification": config.payload}
    assert service.config_material(agent, config) == old
    assert service.config_view(agent, config)["sha256"] == digest(old)
    assert "source_origin" not in service.config_view(agent, config)
    assert "import_provenance" not in service.config_view(agent, config)


def test_historical_external_configuration_keeps_its_own_source_after_agent_adoption():
    agent, config = rows(True)
    before = service.config_view(agent, config)
    source = deepcopy(before["source_origin"])
    agent.external_binding_id, agent.registration_fingerprint = str(uuid4()), "c"*64
    after = service.config_view(agent, config)
    assert after == before and after["source_origin"] == source
    assert after["sha256"] == config.config_sha256


@pytest.mark.parametrize("external,field", [(False, "external_binding_id"),
    (False, "external_binding_fingerprint"), (True, "external_binding_id"), (True, "external_binding_fingerprint")])
def test_partial_or_wrong_kind_source_pin_cannot_validate_as_a_configuration(external, field):
    agent, config = rows(external)
    setattr(config, field, None if external else str(uuid4()) if field.endswith("_id") else "c"*64)
    with pytest.raises(ControlError, match="invalid_agent_config"):
        service.config_view(agent, config)


def test_source_adoption_requires_exact_target_and_configuration_cas():
    base = {"request_id": str(uuid4()), "expected_revision": 1, "configuration": specification()}
    assert Revise.model_validate(base).source_binding_id is None
    with pytest.raises(ValidationError):
        Revise.model_validate({**base, "source_binding_id": str(uuid4())})
    with pytest.raises(ValidationError):
        Revise.model_validate({**base, "source_binding_fingerprint": "a"*64})
    value = Revise.model_validate({**base, "source_binding_id": str(uuid4()), "source_binding_fingerprint": "a"*64})
    assert value.expected_revision == 1 and value.source_binding_fingerprint == "a"*64


def imported():
    key = "research"
    return {"version": "business-agent-import.v1", "request_id": str(uuid4()),
        "source_binding_id": str(uuid4()), "source_binding_fingerprint": "a"*64,
        "agents": [{"key": key, "purpose": "customer_research", "configuration": specification(),
            "provenance": {"origin_agent_key": key, "origin_config_revision": "source-v1",
                "artifact_sha256": "b"*64, "instruction_sha256": "c"*64, "knowledge_sha256": "d"*64}}]}


@pytest.mark.parametrize("change", ["duplicate", "origin-key", "permission", "activated", "executable"])
def test_import_cannot_forge_identity_or_execution_permissions(change):
    packet = imported()
    if change == "duplicate":
        packet["agents"].append(deepcopy(packet["agents"][0]))
    elif change == "origin-key":
        packet["agents"][0]["provenance"]["origin_agent_key"] = "another"
    elif change == "permission":
        packet["agents"][0]["configuration"]["tools"] = ["send_mail"]
    elif change == "activated":
        packet["agents"][0]["enabled"] = True
    else:
        packet["executor"] = "arbitrary-code"
    with pytest.raises(ValidationError):
        Import.model_validate(packet)


def directory_entry():
    return {"agent_id": str(uuid4()), "business_id": str(uuid4()), "revision_id": str(uuid4()),
        "revision": 1, "configuration_sha256": "a"*64, "name": "External research assistant",
        "purpose": "customer_research", "goal": "Research suitable synthetic buyers", "business_state": "current"}


def test_directory_accepts_genuine_external_and_creation_origins_only():
    value = directory_entry()
    external = {**value, "external_binding_id": str(uuid4())}
    assert DirectoryEntry.model_validate(external).creation_id is None
    legacy = {**value, "creation_id": str(uuid4()), "registration_id": str(uuid4())}
    assert DirectoryEntry.model_validate(legacy).external_binding_id is None
    for malformed in (value, {**external, "creation_id": str(uuid4())},
            {**external, "can_delegate": True}, {**external, "calibration_status": "PASS"}):
        with pytest.raises(ValidationError):
            DirectoryEntry.model_validate(malformed)
