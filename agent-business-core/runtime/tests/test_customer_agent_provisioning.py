"""Native expectations cannot carry credentials or become mutable permission."""
import json
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from pinet_core.control.routes import ControlError
from pinet_core.customer_agents import provisioning, service
from pinet_core.customer_agents.wire import Create


def scope():
    material = {key: str(uuid4()) for key in ("user_id", "organization_id", "portfolio_id", "session_id",
        "creation_id", "registration_id", "business_id", "grant_id")}
    return provisioning.ProvisioningScope.model_validate_json(json.dumps(material | {
        "environment_id": "test-provisioning", "registration_fingerprint": "a" * 64, "source_revision": "b" * 40}))


def value():
    return Create.model_validate_json(json.dumps({"request_id": str(uuid4()), "purpose": "custom",
        "configuration": {"name": "Synthetic draft", "goal": "Review the supplied synthetic business question.",
            "audience": "Synthetic owner", "inputs": ["Owner text"], "outputs": ["Reviewable draft"],
            "boundaries": ["No external action"], "escalation": "Ask about missing facts",
            "autonomy": "drafts_for_review", "sources": [], "examples": [{"input": "Question", "expected": "Draft"}],
            "unknowns": []}}))


def test_native_scope_is_frozen_and_rejects_credentials_or_permissions():
    pin = scope()
    assert set(pin.owner_binding()) == {"user_id", "organization_id", "portfolio_id", "environment_id"}
    for extra in ({"bearer": "x" * 64}, {"permissions": ["execute"]}, {"token_hash": "a" * 64}):
        with pytest.raises(ValidationError):
            provisioning.ProvisioningScope.model_validate_json(json.dumps(pin.model_dump(mode="json") | extra))
    with pytest.raises(ValidationError):
        pin.business_id = uuid4()


def test_internal_objects_are_revalidated_before_any_transaction_action():
    pin, draft = scope(), value()
    assert provisioning.validated(pin, draft, Create) == (pin, draft)
    for bad_scope, bad_value in ((pin.model_copy(update={"source_revision": "bad"}), draft),
            (pin, draft.model_copy(update={"purpose": "runtime_admin"})), (pin.model_dump(), draft), (pin, {})):
        with pytest.raises(ControlError) as error:
            provisioning.validated(bad_scope, bad_value, Create)
        assert error.value.status == 400


def test_only_exact_retained_uuid_conflict_is_translated_through_driver_wrappers():
    root = RuntimeError("synthetic unique failure")
    root.sqlstate, root.constraint_name = "23505", "uq_customer_agent_request_key"
    outer = root
    for _ in range(4):
        wrapper = RuntimeError("synthetic driver wrapper")
        wrapper.__cause__ = outer
        outer = wrapper
    original = IntegrityError("synthetic", {}, outer)
    with pytest.raises(ControlError) as error:
        service.write_conflict(original)
    assert error.value.status == 409 and error.value.code == "idempotency_conflict"
    root.constraint_name = "another_unique_constraint"
    with pytest.raises(IntegrityError) as error:
        service.write_conflict(original)
    assert error.value is original
