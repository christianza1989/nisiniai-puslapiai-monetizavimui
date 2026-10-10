"""Exact native source observations, independent scope and no invented readiness; no provider."""
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core import knowledge_index
from pinet_core.agent_preparation.service import checks_for, inspect_knowledge, profile_observation
from pinet_core.agent_preparation.wire import (
    AgentPreparationView,
    Check,
    IntakeObservation,
    Mapping,
    RuntimeObservation,
    TeamReviewObservation,
)
from pinet_core.config import settings
from pinet_core.models import utcnow


def native_state():
    now = utcnow()
    business = SimpleNamespace(site_id="synthetic", canonical_host="agent.example")
    metadata = {"site_id": business.site_id, "canonical_host": business.canonical_host,
        "contact_email": "operator@agent.example", "operator": "Synthetic fixture",
        "deployment_id": "synthetic-only", "generated_at": now.isoformat()}
    pages = [{"id": "p1", "title": "Synthetic page", "url": "https://agent.example/guide/",
        "revision_hash": "a" * 64, "projection_hash": "b" * 64, "text": "Synthetic trusted test projection."}]
    payload = {"knowledge": {**metadata, "schema_version": 2, "pages": pages}, "revoked": [],
        "hash": knowledge_index.content_hash({k: v for k, v in metadata.items() if k != "generated_at"}, pages),
        "index_receipt": {"status": "complete", "schema_version": 2, "revision": 1, "page_count": 1,
            "content_hash": knowledge_index.content_hash(metadata, pages)}}
    return SimpleNamespace(revision=1, refreshed_at=now, payload=payload), business, now


def unmapped_runtime():
    return RuntimeObservation(scope="unmapped", profile_registered=False, role_instruction_hashes={},
        knowledge_state="not_observed", knowledge_revision=None, knowledge_sha256=None, knowledge_refreshed_at=None,
        knowledge_active_page_count=0, source_admitted=None, learning_admitted=None, policy_enabled=None,
        policy_paused=None, followup_enabled=None, smtp_enabled=False, voice_configured=False)


def view():
    now = utcnow()
    creation = SimpleNamespace(status="failed", active_job_id=None)
    mapping = Mapping(state="missing", candidate=None)
    runtime = unmapped_runtime()
    intake = IntakeObservation(state="not_imported", import_job_id=None, observed_at=None, page_count=0,
        approved_page_count=0, failure_code=None)
    review = TeamReviewObservation(state="no_revision", accepted_candidate_sha256=None)
    checks = checks_for(creation=creation, revision=None, team_review=review, intake=intake,
        mapping=mapping, runtime=runtime, now=now)
    return AgentPreparationView(creation_id=uuid4(), accepted_revision=None, candidate_sha256=None,
        accepted_source_revision=None, canonical_host="agent.example", observed_at=now, team_review=review, mapping=mapping,
        intake=intake, runtime=runtime, checks=checks, blocker_keys=[c.key for c in checks if c.status != "PASS"])


def test_native_current_hash_and_candidate_scope_never_expose_contact_or_business_prose():
    state, business, now = native_state()
    result = inspect_knowledge(state, business, now)
    assert result["knowledge_state"] == "v2_current" and result["knowledge_active_page_count"] == 1
    assert result["knowledge_sha256"] == state.payload["hash"]
    assert "operator" not in result and "contact_email" not in result and "pages" not in result
    assert state.payload["knowledge"]["pages"][0]["text"] == "Synthetic trusted test projection."


@pytest.mark.parametrize("damage", ["text", "url", "host", "hash", "receipt_hash", "receipt_count", "receipt_revision"])
def test_damaged_native_source_is_invalid_instead_of_empty_or_ready(damage):
    state, business, now = native_state()
    before = deepcopy(state.payload)
    if damage in {"text", "url"}:
        state.payload["knowledge"]["pages"][0][damage] = "https://foreign.example/" if damage == "url" else "changed"
    elif damage == "host":
        state.payload["knowledge"]["canonical_host"] = "foreign.example"
    elif damage == "hash":
        state.payload["hash"] = "c" * 64
    elif damage == "receipt_hash":
        state.payload["index_receipt"]["content_hash"] = "d" * 64
    elif damage == "receipt_count":
        state.payload["index_receipt"]["page_count"] = 2
    else:
        state.payload["index_receipt"]["revision"] = 2
    modified = deepcopy(state.payload)
    result = inspect_knowledge(state, business, now)
    assert result["knowledge_state"] == "invalid" and result["knowledge_sha256"] is None
    assert state.payload == modified and modified != before


def test_native_expiry_revocation_and_v1_are_distinct_observations():
    state, business, now = native_state()
    assert inspect_knowledge(state, business, now + timedelta(seconds=settings().knowledge_ttl_seconds + 1))["knowledge_state"] == "v2_expired"
    state.payload["revoked"] = ["a" * 64]
    state.revision = 2  # Existing shared revoke increments revision without rewriting original receipt.
    result = inspect_knowledge(state, business, now)
    assert result["knowledge_state"] == "v2_revoked" and result["knowledge_active_page_count"] == 0
    state.payload["knowledge"].pop("schema_version")
    assert inspect_knowledge(state, business, now)["knowledge_state"] == "v1"


def test_existing_profile_requires_exact_id_host_and_real_four_role_fragments():
    assert profile_observation(None) == (False, {})
    assert profile_observation(SimpleNamespace(site_id="traktoriupadangos", canonical_host="foreign.example")) == (False, {})
    exists, hashes = profile_observation(SimpleNamespace(site_id="traktoriupadangos", canonical_host="traktoriupadangos.lt"))
    assert exists and set(hashes) == {"conversation", "sales", "supplier", "quality"}
    assert all(len(value) == 64 for value in hashes.values())


def test_no_accepted_revision_is_a_complete_truthful_blocked_dto():
    value = view()
    assert len(value.checks) == 14 and len(value.blocker_keys) == 14
    assert not value.can_activate and value.mapping.confirmed_business_id is None
    assert value.runtime.business_contacts == "not_verified_for_creation" and value.calibration == "UNVERIFIED"
    gates = {c.key: c for c in value.checks}
    assert gates["creation_business_binding"].scope == gates["v2_session"].scope == "source_code"
    assert gates["email_reply"].scope == "not_observed" and gates["email_reply"].observed_at is None


@pytest.mark.parametrize("state,status,phrase", [
    ("not_imported", "FAIL", "neimportuotas"),
    ("intake_failed", "FAIL", "nepavyko"),
    ("private_draft_imported", "PASS", "istorinis"),
])
def test_intake_summary_cannot_claim_import_when_source_is_missing_or_failed(state, status, phrase):
    value = view()
    observed = state != "not_imported"
    intake = IntakeObservation(state=state, import_job_id=uuid4() if observed else None,
        observed_at=value.observed_at if observed else None, page_count=3 if state == "private_draft_imported" else 0,
        approved_page_count=0, failure_code="studio_unavailable" if state == "intake_failed" else None)
    checks = checks_for(creation=SimpleNamespace(status="failed", active_job_id=None), revision=None,
        team_review=value.team_review, intake=intake, mapping=value.mapping, runtime=value.runtime, now=value.observed_at)
    check = next(c for c in checks if c.key == "private_intake")
    assert check.status == status and phrase in check.summary
    assert ("Matomas" in check.summary) == (state == "private_draft_imported")


@pytest.mark.parametrize("damage", ["can_activate", "calibration", "blocker_keys", "duplicate_check", "candidate_hash"])
def test_wire_rejects_false_acceptance_missing_gates_and_inconsistent_revision(damage):
    value = view().model_dump(mode="json")
    if damage == "can_activate":
        value[damage] = True
    elif damage == "calibration":
        value[damage] = "PASS"
    elif damage == "blocker_keys":
        value[damage] = []
    elif damage == "candidate_hash":
        value["candidate_sha256"] = "a" * 64
    else:
        value["checks"][-1] = value["checks"][0]
    with pytest.raises(ValidationError):
        AgentPreparationView.model_validate(value)


def test_unobserved_pass_is_rejected():
    with pytest.raises(ValidationError):
        Check(key="calibration", status="PASS", scope="not_observed", code="invented_pass",
            summary="Synthetic invented acceptance.", observed_at=None)


def test_wire_rejects_unmatched_team_acceptance_on_legacy_revision():
    value = view().model_dump(mode="json")
    value.update(accepted_revision=1, candidate_sha256="a" * 64, accepted_source_revision="b" * 40)
    value["team_review"].update(state="accepted", accepted_candidate_sha256="c" * 64)
    with pytest.raises(ValidationError):
        AgentPreparationView.model_validate(value)
    value["team_review"].update(state="unreviewed", accepted_candidate_sha256=None)
    assert AgentPreparationView.model_validate(value).team_review.state == "unreviewed"


@pytest.mark.parametrize("damage", ["source_identity", "legacy_acceptance", "runtime_scope"])
def test_wire_requires_source_team_acceptance_and_owned_observation_scope(damage):
    value = view().model_dump(mode="json")
    if damage == "source_identity":
        value.update(accepted_revision=1, candidate_sha256="a" * 64, accepted_source_revision=None)
        value["team_review"].update(state="unreviewed")
    elif damage == "legacy_acceptance":
        value["checks"][0]["status"] = "PASS"
        value["blocker_keys"].remove("accepted_revision")
    else:
        value["runtime"]["scope"] = "owned_registration_candidate"
    with pytest.raises(ValidationError):
        AgentPreparationView.model_validate(value)


def test_full_and_control_api_expose_only_read_method_for_preparation():
    from pinet_core import api, control_api

    path = "/customer/v2/creations/{creation_id}/agent-preparation"
    for app in (api.app, control_api.app):
        assert set(app.openapi()["paths"][path]) == {"get"}
