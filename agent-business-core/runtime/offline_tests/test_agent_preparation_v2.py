"""Bounded exact binding projection; no invented runtime observation or channel authority."""
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.agent_preparation.v2_service import empty_runtime, registration_checks
from pinet_core.agent_preparation.v2_wire import AgentPreparationViewV2
from pinet_core.agent_preparation.wire import IntakeObservation, TeamReviewObservation
from pinet_core.config import settings
from pinet_core.creation_registration.wire import RegisteredRevision, RegistrationView
from pinet_core.models import utcnow


def view(*, state="missing", pending=False):
    now, identity = utcnow(), uuid4()
    recorded = state != "missing"
    registration = RegistrationView(creation_id=identity, current_revision=2 if state == "stale" else 1 if recorded else None,
        observed_at=now, state=state, revision_pending=pending, binding_current=state == "current" and not pending,
        registration=RegisteredRevision(registration_id=uuid4(), business_id=uuid4(), site_id="creation-" + identity.hex,
            canonical_host="agent.example", accepted_revision=1, candidate_sha256="a" * 64,
            accepted_source_revision=settings().control_source_revision, registered_at=now,
            revoked_at=now if state == "revoked" else None) if recorded else None)
    review = TeamReviewObservation(state="accepted" if recorded else "no_revision",
        accepted_candidate_sha256="a" * 64 if recorded else None)
    intake = IntakeObservation(state="private_draft_imported" if recorded else "not_imported",
        import_job_id=uuid4() if recorded else None, observed_at=now if recorded else None,
        page_count=3 if recorded else 0, approved_page_count=0, failure_code=None)
    runtime = empty_runtime()
    if registration.binding_current:
        runtime.scope = "current_registered_business"
        runtime.knowledge_state = "missing"
        runtime.source_admitted = runtime.learning_admitted = runtime.policy_enabled = runtime.policy_paused = False
        runtime.followup_enabled = False
    revision = SimpleNamespace(source_revision=settings().control_source_revision) if recorded else None
    checks = registration_checks(creation=SimpleNamespace(status="queued" if pending else "succeeded", active_job_id=None),
        revision=revision, team_review=review, intake=intake, registration=registration, runtime=runtime, now=now)
    return AgentPreparationViewV2(creation_id=identity, accepted_revision=registration.current_revision,
        candidate_sha256="a" * 64 if recorded else None, accepted_source_revision=settings().control_source_revision if recorded else None,
        canonical_host="agent.example", observed_at=now, registration=registration, team_review=review, intake=intake,
        runtime=runtime, checks=checks, blocker_keys=[c.key for c in checks if c.status != "PASS"])


@pytest.mark.parametrize("state,pending", [("missing", False), ("current", False), ("current", True),
    ("stale", False), ("revoked", False), ("grant_revoked", False)])
def test_exact_current_binding_is_the_only_runtime_observation_scope(state, pending):
    value = view(state=state, pending=pending)
    bound = state == "current" and not pending
    checks = {c.key: c for c in value.checks}
    assert value.registration.binding_current == bound
    assert value.runtime.scope == ("current_registered_business" if bound else "unmapped")
    assert all((checks[k].status == "PASS") == bound for k in ("business_registration", "creation_business_binding"))
    assert len(checks) == 14 and value.can_activate is False and value.launch_status == "UNVERIFIED"
    if not bound:
        assert value.runtime.knowledge_state == "not_observed" and value.runtime.source_admitted is None


@pytest.mark.parametrize("damage", ["runtime_scope", "profile", "instruction", "knowledge", "knowledge_hash",
    "knowledge_revision", "knowledge_stamp", "active_pages", "source", "policy", "followup", "binding_pass"])
def test_unbound_or_revoked_registration_cannot_expose_runtime_or_pass_binding(damage):
    value = view(state="revoked").model_dump(mode="json")
    patch = {"runtime_scope": {"scope": "current_registered_business"}, "profile": {"profile_registered": True},
        "instruction": {"role_instruction_hashes": {"conversation": "c" * 64}}, "knowledge": {"knowledge_state": "v2_current"},
        "knowledge_hash": {"knowledge_sha256": "b" * 64}, "knowledge_revision": {"knowledge_revision": 1},
        "knowledge_stamp": {"knowledge_refreshed_at": utcnow().isoformat()}, "active_pages": {"knowledge_active_page_count": 1},
        "source": {"source_admitted": False}, "policy": {"policy_enabled": False}, "followup": {"followup_enabled": False}}
    if damage == "binding_pass":
        check = next(c for c in value["checks"] if c["key"] == "creation_business_binding")
        check["status"] = "PASS"
        value["blocker_keys"].remove("creation_business_binding")
    else:
        value["runtime"].update(patch[damage])
    with pytest.raises(ValidationError):
        AgentPreparationViewV2.model_validate(value)


@pytest.mark.parametrize("damage", ["registration_creation", "registration_revision", "registration_hash",
    "registration_source", "registration_host", "team_hash", "activation", "duplicate", "blocker"])
def test_bound_projection_rejects_inconsistent_exact_identity_and_false_acceptance(damage):
    value = view(state="current").model_dump(mode="json")
    if damage == "registration_creation":
        value["registration"]["creation_id"] = str(uuid4())
    elif damage == "registration_revision":
        value["registration"]["current_revision"] = 2
    elif damage in {"registration_hash", "registration_source", "registration_host"}:
        key, changed = {"registration_hash": ("candidate_sha256", "b" * 64),
            "registration_source": ("accepted_source_revision", "c" * 40),
            "registration_host": ("canonical_host", "other.example")}[damage]
        value["registration"]["registration"][key] = changed
    elif damage == "team_hash":
        value["team_review"]["accepted_candidate_sha256"] = "b" * 64
    elif damage == "activation":
        value["can_activate"] = True
    elif damage == "duplicate":
        value["checks"][-1] = value["checks"][0]
    else:
        value["blocker_keys"] = []
    with pytest.raises(ValidationError):
        AgentPreparationViewV2.model_validate(value)


def test_current_native_knowledge_is_not_exact_draft_publication_or_channel_acceptance():
    value = view(state="current")
    value.runtime.knowledge_state = "v2_current"
    checks = registration_checks(creation=SimpleNamespace(status="succeeded", active_job_id=None),
        revision=SimpleNamespace(source_revision=settings().control_source_revision), team_review=value.team_review,
        intake=value.intake, registration=value.registration, runtime=value.runtime, now=value.observed_at)
    knowledge = next(c for c in checks if c.key == "v2_knowledge")
    assert knowledge.status == "UNVERIFIED" and knowledge.code == "knowledge_revision_binding_unverified"
    calibration = next(c for c in checks if c.key == "calibration")
    assert "juodraščiui" in calibration.summary and "priimtai" not in calibration.summary
    assert next(c for c in checks if c.key == "v2_session").status == "FAIL"


def test_v1_contract_bytes_remain_exact_and_additive_v2_contract_is_reproducible():
    import sys

    scripts = Path(__file__).resolve().parents[1] / "scripts"
    sys.path.insert(0, str(scripts))
    from customer_agent_preparation_v2_contract import contract

    root = Path(__file__).resolve().parents[3]
    old = root / "docs/contracts/verslomatika-customer-agent-preparation.openapi.json"
    assert hashlib.sha256(old.read_bytes()).hexdigest() == "89c02974b120c164dabc3a29eef5d0f36f974b0119ca6420269c66c6f36c6e0c"
    generated = (json.dumps(contract(), ensure_ascii=False, indent=2) + "\n").encode()
    assert generated == (root / "docs/contracts/verslomatika-customer-agent-preparation-v2.openapi.json").read_bytes()
    schemas = contract()["components"]["schemas"]
    assert "registration" in schemas["AgentPreparationViewV2"]["properties"]
    assert "mapping" not in schemas["AgentPreparationViewV2"]["properties"]


def test_both_apis_keep_v1_and_add_only_get_for_v2():
    from pinet_core import api, control_api

    for app in (api.app, control_api.app):
        paths = app.openapi()["paths"]
        assert set(paths["/customer/v2/creations/{creation_id}/agent-preparation"]) == {"get"}
        assert set(paths["/customer/v2/creations/{creation_id}/agent-preparation-v2"]) == {"get"}
