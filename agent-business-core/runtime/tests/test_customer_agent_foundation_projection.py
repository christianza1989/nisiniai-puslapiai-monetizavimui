"""Read capabilities agree with Foundation write gates; no DB or provider."""
from contextlib import asynccontextmanager
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pinet_core.business_discovery import service as discovery
from pinet_core.control.routes import ControlError
from pinet_core.creation.models import Creation
from pinet_core.customer_agents import service
from pinet_core.customer_agents.wire import Listing, Readiness


@pytest.fixture
def projection(monkeypatch):
    creation = SimpleNamespace(id=str(uuid4()))
    session = SimpleNamespace(id=str(uuid4()), user_id=str(uuid4()))
    registry = SimpleNamespace(id=str(uuid4()))
    agent = SimpleNamespace(creation_id=creation.id, registration_id=registry.id)
    calls = []
    state = {"current": True, "failure": ControlError(409, "website_foundation_not_ready")}

    class Transaction:
        async def get(self, model, identity):
            return creation if model is Creation else registry

        async def scalars(self, statement):
            return []

    tx = Transaction()

    async def configuration_current(*args):
        return state["current"]

    async def require_foundation(actual_tx, actual_creation, *, session=None):
        assert actual_tx is tx and actual_creation is creation
        calls.append(session)
        if state["failure"] is not None:
            raise state["failure"]

    @asynccontextmanager
    async def authority(*args, **kwargs):
        yield tx, session, creation, registry, agent

    async def current_config(*args):
        return "retained-configuration"

    monkeypatch.setattr(service, "configuration_current", configuration_current)
    monkeypatch.setattr(discovery, "require_agent_foundation", require_foundation)
    monkeypatch.setattr(service, "authority", authority)
    monkeypatch.setattr(service, "current_config", current_config)
    monkeypatch.setattr(service, "agent_view", lambda *args: {"name": "Retained agent"})
    monkeypatch.setattr(service, "config_view", lambda *args: {"retained": True})
    return SimpleNamespace(tx=tx, session=session, creation=creation, registry=registry,
        agent=agent, state=state, calls=calls)


async def test_foundation_denial_does_not_advertise_draft_creation(projection):
    p = projection
    value = await service.listing("synthetic-token", p.creation.id)
    assert value["can_create_draft"] is False
    assert value["configuration_blockers"] == ["website_foundation_not_ready"]
    assert p.calls == [p.session]


async def test_foundation_denial_keeps_agent_and_configuration_readable(projection):
    p = projection
    value = await service.get("synthetic-token", p.creation.id, str(uuid4()))
    assert value["agent"] == {"name": "Retained agent"}
    assert value["configuration"] == {"retained": True}
    readiness = Readiness.model_validate(value["readiness"])
    assert readiness.can_edit_configuration is False
    assert "website_foundation_not_ready" in readiness.blockers
    assert not readiness.can_calibrate and not readiness.can_activate and not readiness.provider_execution
    assert p.calls == [p.session]


async def test_current_foundation_or_legacy_gate_preserves_draft_capabilities(projection):
    p = projection
    p.state["failure"] = None
    listed = await service.listing("synthetic-token", p.creation.id)
    detail = await service.get("synthetic-token", p.creation.id, str(uuid4()))
    assert listed["can_create_draft"] and not listed["configuration_blockers"]
    assert detail["readiness"]["can_edit_configuration"]
    assert detail["readiness"]["blockers"] == ["calibration_not_implemented", "module_admission_missing"]
    assert p.calls == [p.session, p.session]


async def test_stale_business_stops_before_foundation_probe(projection):
    p = projection
    p.state["current"] = False
    listed = await service.listing("synthetic-token", p.creation.id)
    detail = await service.get("synthetic-token", p.creation.id, str(uuid4()))
    assert not listed["can_create_draft"] and listed["configuration_blockers"] == ["agent_business_not_current"]
    assert not detail["readiness"]["can_edit_configuration"]
    assert detail["readiness"]["blockers"][-1] == "agent_business_not_current"
    assert not p.calls


@pytest.mark.parametrize("status,code", [(503, "foundation_bridge_unavailable"), (409, "foundation_context_stale")])
async def test_unavailable_evidence_keeps_history_readable_but_not_editable(projection, status, code):
    p = projection
    p.state["failure"] = ControlError(status, code)
    value = await service.get("synthetic-token", p.creation.id, str(uuid4()))
    assert value["configuration"] == {"retained": True}
    assert not value["readiness"]["can_edit_configuration"]
    assert value["readiness"]["blockers"][-1] == "website_foundation_not_ready"


@pytest.mark.parametrize("status", [401, 403, 404])
async def test_auth_denial_is_not_downgraded_to_a_read_capability(projection, status):
    p = projection
    p.state["failure"] = ControlError(status, "unauthenticated")
    with pytest.raises(ControlError) as failure:
        await service.get("synthetic-token", p.creation.id, str(uuid4()))
    assert failure.value.status == status


def test_foundation_blocker_is_part_of_the_bounded_existing_wire():
    value = Readiness(can_edit_configuration=False, blockers=[
        "calibration_not_implemented", "module_admission_missing", "website_foundation_not_ready"])
    assert not value.can_activate and value.module_admission == "not_admitted"
    assert "website_foundation_not_ready" in Listing.model_json_schema()["properties"]["configuration_blockers"]["items"]["enum"]
