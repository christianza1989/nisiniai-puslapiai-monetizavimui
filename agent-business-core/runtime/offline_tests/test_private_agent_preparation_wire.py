"""Additive readiness ABI and in-process routing; no database, server or model."""
import copy
import hashlib
import json
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI
from pydantic import ValidationError

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.customer.service import customer_guard
from pinet_core.customer_agents import contract, routes, service, wire

BASE = "/customer/v2/creations/{creation_id}/agents"
READINESS = BASE + "/preparation-readiness"
VERSION = "customer-agent-preparation-readiness.v1"
ORDER = ("site_chat", "customer_research", "email", "custom")
NEW_SCHEMAS = {"PreparationPurposeReadiness", "PreparationReadiness", "PreparationReadinessEnvelope"}
# Canonical sorted JSON of the entire existing contract at Root76db483.
LEGACY_SHA = "93b1be9ee6660f0a15ce6dd88ad58ff6b3c7bfcf8f116b5462e1cc21f1fb48b9"


def readiness():
    return {"creation_id": str(uuid4()), "purposes": [
        {"purpose": purpose,
         "readiness_scope": "private_preparation" if purpose in {"customer_research", "email"} else "full_website",
         "can_create_draft": purpose in {"customer_research", "email"},
         "configuration_blockers": [] if purpose in {"customer_research", "email"} else ["website_foundation_not_ready"]}
        for purpose in ORDER], "operation": "agent_configuration_only", "provider_execution": False,
        "can_calibrate": False, "can_activate": False, "channel_activation": "not_performed"}


def test_fixed_readiness_path_precedes_dynamic_agent_id():
    paths = [route.path for route in routes.router.routes]
    assert READINESS in paths
    assert paths.index(READINESS) < paths.index(BASE + "/{agent_id}")
    matched = next(route for route in routes.router.routes if route.path == READINESS)
    assert matched.methods == {"GET"}


def test_exact_ordered_scopes_do_not_advertise_execution_or_website_acceptance():
    value = wire.PreparationReadiness.model_validate(readiness())
    assert tuple(row.purpose for row in value.purposes) == ORDER
    assert set(value.model_dump()) == {"creation_id", "purposes", "operation", "provider_execution",
        "can_calibrate", "can_activate", "channel_activation"}
    assert not value.provider_execution and not value.can_calibrate and not value.can_activate
    assert value.channel_activation == "not_performed"


@pytest.mark.parametrize("change", ["missing", "duplicate", "reversed", "extra", "unknown_purpose",
    "site_chat_private", "custom_private", "unknown_scope", "unknown_blocker", "two_blockers",
    "string_bool", "integer_bool", "ready_with_blocker", "denied_without_blocker", "extra_field"])
def test_malformed_or_contradictory_purpose_projection_is_rejected(change):
    value = readiness()
    row = value["purposes"][1]
    if change == "missing":
        value["purposes"].pop()
    elif change == "duplicate":
        value["purposes"][2] = copy.deepcopy(row)
    elif change == "reversed":
        value["purposes"].reverse()
    elif change == "extra":
        value["purposes"].append(copy.deepcopy(row))
    elif change == "unknown_purpose":
        row["purpose"] = "xbot"
    elif change in {"site_chat_private", "custom_private"}:
        value["purposes"][0 if change == "site_chat_private" else 3]["readiness_scope"] = "private_preparation"
    elif change == "unknown_scope":
        row["readiness_scope"] = "source_admitted"
    elif change == "unknown_blocker":
        row.update(can_create_draft=False, configuration_blockers=["source_admitted"])
    elif change == "two_blockers":
        row.update(can_create_draft=False,
            configuration_blockers=["agent_business_not_current", "private_preparation_not_ready"])
    elif change in {"string_bool", "integer_bool"}:
        row["can_create_draft"] = "true" if change == "string_bool" else 1
    elif change == "ready_with_blocker":
        row["configuration_blockers"] = ["private_preparation_not_ready"]
    elif change == "denied_without_blocker":
        row["can_create_draft"] = False
    else:
        row["permissions"] = ["email.send"]
    with pytest.raises(ValidationError):
        wire.PreparationReadiness.model_validate(value)


@pytest.mark.parametrize("field,value", [("provider_execution", True), ("can_calibrate", True),
    ("can_activate", True), ("channel_activation", "active"), ("operation", "send_email"),
    ("foundation_status", "LOCAL_DELIVERY_CHECKS_PASS"), ("profile_current", True),
    ("knowledge_current", True), ("full_f1_status", "PASS"), ("calibration_status", "PASS")])
def test_projection_cannot_claim_other_readiness_or_activation(field, value):
    with pytest.raises(ValidationError):
        wire.PreparationReadiness.model_validate(readiness() | {field: value})


def test_existing_contract_content_is_exactly_unchanged_after_additive_projection():
    value = contract.document()
    root = Path(__file__).resolve().parents[3]
    assert json.loads((root / "docs/contracts/verslomatika-customer-agents.openapi.json").read_text()) == value
    legacy = copy.deepcopy(value)
    operation = legacy["paths"].pop(READINESS)
    assert set(operation) == {"get"}
    assert operation["get"]["operationId"] == "getCustomerAgentPreparationReadiness"
    for name in NEW_SCHEMAS:
        legacy["components"]["schemas"].pop(name)
    encoded = json.dumps(legacy, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    assert hashlib.sha256(encoded).hexdigest() == LEGACY_SHA


def test_contract_is_mounted_in_both_maintained_apps_with_separate_envelope():
    from pinet_core.api import app as full
    from pinet_core.control_api import app as portable
    document = contract.document()
    reference = document["paths"][READINESS]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    assert reference == {"$ref": "#/components/schemas/PreparationReadinessEnvelope"}
    schemas = document["components"]["schemas"]
    assert schemas["PreparationReadinessEnvelope"]["properties"]["contract_version"]["const"] == VERSION
    assert schemas["Envelope"]["properties"]["contract_version"]["const"] == "customer-agents.v1"
    for app in (full, portable):
        assert set(app.openapi()["paths"][READINESS]) == {"get"}


@pytest.fixture
def endpoint(monkeypatch):
    cfg = settings()
    for key, value in {"environment": "test-preparation-wire", "control_enabled": True,
            "control_mode": "local", "control_source_revision": "a" * 40,
            "control_cursor_secret": "synthetic-wire-secret-" * 3, "control_session_seconds": 3600}.items():
        monkeypatch.setattr(cfg, key, value)
    # Test only DTO/routing/transport. Root's separate tests exercise real owner/S37 authority.
    app = FastAPI()
    app.include_router(routes.router)
    app.dependency_overrides[customer_guard] = lambda: None
    observed = []

    async def dynamic_detail(*args, **kwargs):
        raise AssertionError("Fixed readiness route was consumed as an agent ID")

    monkeypatch.setattr(service, "get", dynamic_detail)
    return app, observed


async def test_in_process_get_delegates_only_owner_token_and_creation_and_is_private(endpoint, monkeypatch):
    app, observed = endpoint
    value = readiness()
    token = "t" * 64

    async def projected(actual_token, creation_id):
        observed.append((actual_token, creation_id))
        return value

    monkeypatch.setattr(service, "preparation_readiness", projected, raising=False)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        response = await client.get(READINESS.format(creation_id=value["creation_id"]),
            headers={"Authorization": "Bearer " + token})
    assert response.status_code == 200, response.text
    assert observed == [(token, value["creation_id"])]
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    body = response.json()
    assert body["contract_version"] == VERSION and body["data"] == value
    assert set(body) == {"contract_version", "environment", "request_id", "observed_at", "source_revision", "data"}
    assert wire.PreparationReadinessEnvelope.model_validate(body)


@pytest.mark.parametrize("status,code", [(401, "unauthenticated"), (403, "customer_agents_unavailable"),
    (404, "not_found"), (409, "private_intake_missing"), (503, "source_unavailable")])
async def test_authority_refusals_keep_safe_status_and_never_become_ready(endpoint, monkeypatch, status, code):
    app, observed = endpoint

    async def refused(actual_token, creation_id):
        observed.append(creation_id)
        raise ControlError(status, code)

    monkeypatch.setattr(service, "preparation_readiness", refused, raising=False)
    identity = str(uuid4())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        response = await client.get(READINESS.format(creation_id=identity),
            headers={"Authorization": "Bearer " + "t" * 64})
    assert response.status_code == status and response.json()["code"] == code
    assert observed == [identity] and "data" not in response.json()
    assert response.headers["cache-control"] == "private, no-store"


async def test_missing_bearer_is_denied_before_service_projection(endpoint, monkeypatch):
    app, observed = endpoint

    async def forbidden(*args):
        observed.append(args)
        raise AssertionError("Missing bearer reached the projection")

    monkeypatch.setattr(service, "preparation_readiness", forbidden, raising=False)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        response = await client.get(READINESS.format(creation_id=uuid4()))
    assert response.status_code == 401 and not observed
