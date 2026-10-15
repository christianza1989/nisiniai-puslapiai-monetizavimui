"""Boundary regressions for trusted roles, bounded output, identifiers and source-fixed CLI."""
import hashlib
import json
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.workspace_team.adapter import Plan, arguments, public_text
from pinet_core.workspace_team.contract import document
from pinet_core.workspace_team.policy import participant_id, roster_hash, roster_items
from pinet_core.workspace_team.wire import Cancel, PublicEvent, Send


def test_team_send_does_not_accept_sender_model_tools_or_silent_old_note_dispatch():
    good = {"idempotency_key": str(uuid4()), "content": "Savininko klausimas.", "reply_to_event_id": None}
    Send.model_validate_json(json.dumps(good))
    for key, value in {"sender_id": str(uuid4()), "model": "other", "tools": ["shell"], "old_message_id": str(uuid4())}.items():
        with pytest.raises(ValidationError):
            Send.model_validate_json(json.dumps(good | {key: value}))
    Send.model_validate_json(json.dumps(good | {"content": "x"*2500}))
    for content in (" ", "x"*2501, "bad\x00text", "\ud800"):
        with pytest.raises(ValidationError):
            Send.model_validate_json(json.dumps(good | {"content": content}))
    Cancel.model_validate({})
    with pytest.raises(ValidationError):
        Cancel.model_validate({"sender_id": "coordinator"})


def test_member_identity_survives_names_but_never_crosses_topic_owner_or_grant():
    row = SimpleNamespace(**{key: str(uuid4()) for key in ("id", "user_id", "organization_id", "portfolio_id", "business_id", "grant_id")}, environment_id="test-team")
    expected = participant_id(row, "coordinator")
    row.title = "Pervadinta tema"
    assert participant_id(row, "coordinator") == expected
    assert participant_id(row, "adviser") != expected
    for key in ("id", "user_id", "grant_id"):
        old = getattr(row, key)
        setattr(row, key, str(uuid4()))
        assert participant_id(row, "coordinator") != expected
        setattr(row, key, old)
    available = roster_items(row, admitted=True)
    blocked = roster_items(row, admitted=False)
    assert roster_hash(available) == roster_hash(blocked)
    assert all(not member["tools"] and member["external_actions"] is False for member in available)


def test_schema_valid_largest_assignment_cannot_overflow_public_event():
    plan = Plan(answer="A"*6500, limitations=["L"*250]*5, decision="delegate", assignment="D"*1000)
    text = public_text({"answer": "Pavedimas verslo patarėjui:\n"+plan.assignment, "limitations": plan.limitations})
    assert len(text) < 8000 and "D"*1000 in text and text.count("L"*250) == 5
    assert len(public_text(plan.model_dump())) < 8000
    with pytest.raises(ValidationError):
        Plan(answer="A", limitations=[], decision="delegate", assignment=None)
    with pytest.raises(ValidationError):
        Plan(answer="A", limitations=[], decision="answer", assignment="D")


def test_public_author_has_exact_identity_attempt_and_content_digest():
    value = dict(event_id=str(uuid4()), topic_id=str(uuid4()), task_id=str(uuid4()), sequence=1,
        author_type="coordinator", author_user_id=None, participant_id=str(uuid4()), attempt_id=str(uuid4()),
        kind="answer", reply_to_event_id=None, content="Išvada.", content_sha256=hashlib.sha256("Išvada.".encode()).hexdigest(),
        source_revision="a"*40, created_at="2026-10-13T20:00:00Z")
    PublicEvent.model_validate_json(json.dumps(value))
    for patch in ({"attempt_id": None}, {"author_user_id": str(uuid4())}, {"participant_id": None}, {"content": "Changed"}, {"author_type": "user"}):
        with pytest.raises(ValidationError):
            PublicEvent.model_validate_json(json.dumps(value | patch))


def test_cli_preserves_bounded_transport_and_exact_authorized_model_without_tools():
    args = arguments("owned.exe", "private-dir", "schema.json", "answer.json")
    assert args[args.index("--model")+1] == "gpt-6.1-sol"
    assert 'model_reasoning_effort="high"' in args
    assert "--ignore-user-config" in args and "--ephemeral" in args
    assert 'model_providers.pinet-bounded-openai.request_max_retries=0' in args
    assert 'model_providers.pinet-bounded-openai.stream_max_retries=0' in args
    assert "shell_tool" in args and "multi_agent" in args and "apps" in args
    assert set(document()["paths"]) == {
        "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team"+suffix
        for suffix in ("/roster", "/events", "/turns", "/turns/{task_id}/cancel")}
