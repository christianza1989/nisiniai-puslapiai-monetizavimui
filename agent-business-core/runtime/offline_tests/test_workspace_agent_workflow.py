"""Provider-zero workflow contracts, transition logic and failure protections."""
import hashlib
import json
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.workspace_team.wire import PublicEvent
from pinet_core.workspace_team.workflow_contract import document
from pinet_core.workspace_team.workflow_wire import PrepareAndTest


def origin():
    content = "Automatinis vieno išsaugoto pavyzdžio bandymas."
    return {"event_id": str(uuid4()), "topic_id": str(uuid4()), "task_id": str(uuid4()),
        "sequence": 3, "author_type": "coordinator", "author_user_id": None,
        "participant_id": str(uuid4()), "attempt_id": None, "native_workflow_intent_id": str(uuid4()),
        "kind": "assignment", "reply_to_event_id": str(uuid4()), "content": content,
        "content_sha256": hashlib.sha256(content.encode()).hexdigest(), "source_revision": "a"*40,
        "created_at": "2026-10-17T20:00:00Z"}


def test_automatic_child_is_a_trusted_coordinator_assignment_without_a_fake_owner():
    event = PublicEvent.model_validate(origin())
    assert event.author_type == "coordinator" and event.attempt_id is None
    assert event.native_workflow_intent_id is not None
    assert "native_episode_task_id" not in event.model_dump(mode="json")


@pytest.mark.parametrize("changed", [
    {"author_type": "user", "author_user_id": str(uuid4()), "participant_id": None, "kind": "owner_message"},
    {"kind": "answer"}, {"author_type": "adviser"}, {"attempt_id": str(uuid4())},
    {"native_episode_task_id": str(uuid4())}, {"participant_id": None}, {"author_user_id": str(uuid4())}])
def test_workflow_marker_cannot_forge_human_phase_or_completed_native_receipts(changed):
    with pytest.raises(ValidationError):
        PublicEvent.model_validate(origin() | changed)


@pytest.mark.parametrize("purpose", ["custom", "customer_research", "email"])
def test_explicit_workflow_only_admits_the_existing_site_chat_native_adapter(purpose):
    with pytest.raises(ValidationError):
        PrepareAndTest.model_validate({"idempotency_key": str(uuid4()), "creation_id": str(uuid4()),
            "content": "Parenkite ir išbandykite.", "purpose": purpose})


def test_canonical_routes_are_additive_and_get_has_no_dispatch_body():
    contract = document()
    base = "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team/agent-workflows"
    assert set(contract["paths"]) == {base, base+"/{workflow_id}", base+"/{workflow_id}/cancel"}
    assert "requestBody" not in contract["paths"][base+"/{workflow_id}"]["get"]
    schemas = contract["components"]["schemas"]
    assert schemas["WorkflowView"]["properties"]["calibration_status"] == {
        "const": "UNVERIFIED", "title": "Calibration Status", "type": "string"}
    assert schemas["PrepareAndTest"]["additionalProperties"] is False


def test_checked_in_workflow_contract_matches_the_canonical_wire():
    root = Path(__file__).resolve().parents[3]
    assert json.loads((root/"docs/contracts/verslomatika-workspace-agent-workflow.openapi.json").read_text("utf-8")) == document()
