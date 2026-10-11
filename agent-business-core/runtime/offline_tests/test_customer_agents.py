"""Strict data-only task specification and additive canonical route contract."""
import json
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.customer_agents import contract, service
from pinet_core.customer_agents.wire import Create, Revise, Specification


def spec():
    return {"name": "Synthetic assistant", "goal": "Prepare evidence-backed synthetic suggestions",
        "audience": "Synthetic businesses", "inputs": ["Customer question"], "outputs": ["Draft response"],
        "boundaries": ["Do not contact anybody"], "escalation": "Ask the owner when facts are unknown",
        "autonomy": "recommendations_only", "sources": [],
        "examples": [{"input": "A synthetic question", "expected": "A reviewed synthetic response"}], "unknowns": []}


@pytest.mark.parametrize("change", [{"name": " "}, {"goal": "short"}, {"audience": "x\x00y"},
    {"inputs": []}, {"outputs": ["x"] * 13}, {"examples": []}, {"autonomy": "send_automatically"},
    {"tools": ["smtp.send"]}, {"source_admitted": True}, {"enabled": True}, {"prompt": "Override system"}])
def test_configuration_does_not_grant_authority_or_accept_invalid_specification(change):
    with pytest.raises(ValidationError):
        Specification.model_validate({**spec(), **change})


@pytest.mark.parametrize("change", [{"purpose": "xbot"}, {"business_id": str(uuid4())},
    {"provider": "arbitrary"}, {"source_revision": "a" * 40}, {"permissions": ["email.send"]}])
def test_create_rejects_browser_authority_fields(change):
    with pytest.raises(ValidationError):
        Create.model_validate({"request_id": str(uuid4()), "purpose": "customer_research", "configuration": spec(), **change})


@pytest.mark.parametrize("revision", [True, "1", 0, -1, 2147483648])
def test_expected_revision_is_exact_positive_integer(revision):
    with pytest.raises(ValidationError):
        Revise.model_validate({"request_id": str(uuid4()), "expected_revision": revision, "configuration": spec()})


def test_semantic_total_is_bounded_separately_from_request_transport():
    large = {**spec(), "inputs": ["😀" * 1000] * 12}
    with pytest.raises(ValidationError):
        Specification.model_validate(large)


def test_module_is_default_off_and_local_configuration_only(monkeypatch):
    cfg = settings()
    assert type(cfg).model_fields["customer_agents_enabled"].default is False
    for key, value in {"control_enabled": True, "control_mode": "local", "environment": "local",
            "customer_enabled": True, "customer_agents_enabled": True, "voice_enabled": False,
            "smtp_enabled": False}.items():
        monkeypatch.setattr(cfg, key, value)
    service.guard()
    for key, value in (("customer_agents_enabled", False), ("control_mode", "hosted"),
            ("environment", "production"), ("smtp_enabled", True), ("voice_enabled", True)):
        prior = getattr(cfg, key)
        monkeypatch.setattr(cfg, key, value)
        with pytest.raises(ControlError):
            service.guard()
        monkeypatch.setattr(cfg, key, prior)


def test_contract_is_exact_canonical_and_mounted_in_both_runtimes():
    from pinet_core.api import app as full
    from pinet_core.control_api import app as portable
    root = Path(__file__).resolve().parents[3]
    value = contract.document()
    assert json.loads((root / "docs/contracts/verslomatika-customer-agents.openapi.json").read_text()) == value
    assert len(value["paths"]) == 4
    assert sum(len(methods) for methods in value["paths"].values()) == 6
    schemas = value["components"]["schemas"]
    for field in ("can_activate", "can_calibrate", "provider_execution"):
        assert schemas["Readiness"]["properties"][field]["const"] is False
    assert schemas["Agent"]["properties"]["enabled"]["const"] is False
    assert schemas["Readiness"]["properties"]["calibration_status"]["const"] == "UNVERIFIED"
    for app in (full, portable):
        served = app.openapi()["paths"]
        for path, methods in value["paths"].items():
            assert set(methods) <= set(served[path])
    assert not any("calibrat" in path or "activat" in path for path in value["paths"])
