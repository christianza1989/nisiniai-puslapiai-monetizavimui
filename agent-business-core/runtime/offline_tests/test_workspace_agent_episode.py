"""Explicit owner request limits and truthful native test projection."""
import hashlib
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.workspace_team.episode_contract import document
from pinet_core.workspace_team.episode_wire import EpisodeView, TestAgent
from pinet_core.workspace_team.wire import PublicEvent


def request():
    return {"idempotency_key": str(uuid4()), "creation_id": str(uuid4()), "agent_id": str(uuid4()),
        "expected_revision": 1, "content": "Išbandykite šio agento pavyzdį."}


def test_explicit_owner_scenario_uses_existing_normalization_and_bounded_steps():
    value = TestAgent.model_validate(request())
    assert value.messages is None
    value = TestAgent.model_validate({**request(), "messages": ["  Aptarkime poreikį.  "]})
    assert value.messages == ["Aptarkime poreikį."]
    for messages in ([], ["x"]*9, [" "], ["x\x00"], ["x"*4001]):
        with pytest.raises(ValidationError):
            TestAgent.model_validate({**request(), "messages": messages})


def test_exported_contract_reuses_native_team_receipt_and_denies_private_inputs():
    result = document()
    assert list(result["paths"]) == [
        "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team/agent-tests"]
    schema = result["components"]["schemas"]
    assert schema["TestAgent"]["additionalProperties"] is False
    assert "native_episode" in schema["Turn"]["properties"]
    assert "native_episode_task_id" in schema["PublicEvent"]["properties"]


@pytest.mark.parametrize("field", ["bearer", "session_id", "enabled", "model", "reasoning_effort",
    "source_revision", "protected_case", "typed_expectations", "max_calls", "tools", "calibrated"])
def test_request_cannot_select_authority_model_private_paths_or_grades(field):
    with pytest.raises(ValidationError):
        TestAgent.model_validate({**request(), field: True})


def view():
    return {"creation_id": str(uuid4()), "agent_id": str(uuid4()), "config_revision": 1, "config_sha256": "a"*64,
        "max_calls": 3, "reserved_calls": 2, "settled_calls": 1, "usage_complete": False,
        "scenario": "saved_example", "model": "gpt-6.1-sol", "reasoning_effort": "high",
        "execution_profile_sha256": "b"*64}


def test_test_completion_never_becomes_calibration_or_activation():
    result = EpisodeView.model_validate(view())
    assert result.calibration_status == "UNVERIFIED" and result.module_admission == "not_admitted"
    for change in ({"reserved_calls": 4}, {"settled_calls": 3}, {"usage_complete": True},
            {"activation": "performed"}, {"calibration_status": "PASS"}, {"reasoning_effort": "medium"},
            {"quality_job_id": str(uuid4())}):
        with pytest.raises(ValidationError):
            EpisodeView.model_validate(view() | change)


def event():
    return {"event_id": str(uuid4()), "topic_id": str(uuid4()), "task_id": str(uuid4()), "sequence": 1,
        "author_type": "coordinator", "author_user_id": None, "participant_id": str(uuid4()),
        "attempt_id": str(uuid4()), "kind": "answer", "reply_to_event_id": None,
        "content": "Bandymo rezultatas išsaugotas.",
        "content_sha256": hashlib.sha256("Bandymo rezultatas išsaugotas.".encode()).hexdigest(),
        "source_revision": "a"*40, "created_at": datetime.now(UTC).isoformat()}


def test_legacy_event_bytes_have_no_new_null_native_provenance_field():
    value = event()
    projected = PublicEvent.model_validate(value).model_dump(mode="json")
    assert "native_episode_task_id" not in projected
    assert projected.keys() == value.keys()


def test_native_answer_requires_exact_self_task_and_no_fabricated_role_attempt():
    value = event()
    native = {**value, "attempt_id": None, "native_episode_task_id": value["task_id"]}
    assert PublicEvent.model_validate(native).native_episode_task_id is not None
    for change in ({"native_episode_task_id": str(uuid4())}, {"attempt_id": str(uuid4())},
            {"author_type": "adviser"}, {"kind": "assignment"}):
        with pytest.raises(ValidationError):
            PublicEvent.model_validate(native | change)
