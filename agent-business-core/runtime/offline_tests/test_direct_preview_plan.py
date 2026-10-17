"""Versioned incremental preview scope, separate from immutable script Episodes."""
import copy
import json
from importlib import import_module
from types import SimpleNamespace
from uuid import uuid4, uuid5

import pytest
from pydantic import ValidationError
from test_workspace_calibration_plan import data as script_data

from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest
from pinet_core.customer_agents import lab, preview, review
from pinet_core.customer_agents.session import CallIdentity
from pinet_core.workspace_team.direct_preview_plan import PreviewTurnPlan


def data():
    original = script_data()
    chat, task = uuid4(), uuid4()
    snapshot = lab.Snapshot.model_validate_json(json.dumps(original["snapshot"])).model_dump(mode="json")
    snapshot = {**snapshot, "preview_id": str(chat), "episode_id": str(chat),
        "script_sha256": preview.descriptor(snapshot, chat)}
    message = "Naujas sintetinės peržiūros klausimas."
    return {"scope": original["scope"], "snapshot": snapshot, "chat_id": str(chat), "task_id": str(task),
        "conversation_id": str(uuid4()), "message": message, "message_sha256": digest(message),
        "text_request_id": str(uuid5(task, "native-direct-text.v1")),
        "quality_request_id": str(uuid5(task, "native-direct-quality.v1"))}


def parsed(value=None):
    return PreviewTurnPlan.model_validate_json(json.dumps(value or data()))


def native_call(plan, kind="customer_text", number=1):
    frozen = plan.snapshot.model_dump(mode="json")
    request = plan.text_request_id if kind == "customer_text" else plan.quality_request_id
    return preview.DirectCallIdentity.model_validate_json(json.dumps({**{key: frozen[key] for key in (
        "creation_id", "agent_id", "config_revision_id", "config_revision", "config_sha256", "admission_id",
        "admission_fingerprint", "episode_id", "script_sha256")}, "preview_id": str(plan.chat_id),
        "preview_turn_id": str(plan.task_id), "kind": kind, "conversation_id": str(plan.conversation_id),
        "request_id": str(request), "call_key": "attempt:" + str(request) if kind == "customer_text"
            else "quality-attempt:" + str(uuid4()) + ":" + str(number), "number": number,
        "model": "gpt-6.1-sol", "source_revision": plan.scope.source_revision,
        "prompt_sha256": "1" * 64, "schema_sha256": "2" * 64,
        "request_input_sha256": digest(plan.message) if kind == "customer_text" else "3" * 64,
        "protected_case_sha256": None, "execution_profile_sha256": plan.snapshot.execution_profile.fingerprint(),
        "reasoning_effort": "high"}))


def test_incremental_native_preview_has_a_distinct_strict_binding_and_plan():
    native = import_module("pinet_core.customer_agents.preview")
    plans = import_module("pinet_core.workspace_team.direct_preview_plan")
    assert native.VERSION == "customer-agent-direct-preview.v1"
    assert plans.VERSION == "workspace-native-preview-turn.v1"
    assert "version" in native.PreviewSnapshot.model_fields
    assert "message" in plans.PreviewTurnPlan.model_fields


def test_descriptor_is_stable_across_turns_but_not_saved_configuration_or_creation():
    plan = parsed()
    assert plan.call_limit == 3 and plan.snapshot.episode_id == plan.chat_id
    raw = data()
    before = copy.deepcopy(raw)
    newer_task = uuid4()
    raw.update(task_id=str(newer_task), text_request_id=str(uuid5(newer_task, "native-direct-text.v1")),
        quality_request_id=str(uuid5(newer_task, "native-direct-quality.v1")), message="Kitas klausimas.", message_sha256=digest("Kitas klausimas."))
    next_plan = parsed(raw)
    assert next_plan.snapshot.script_sha256 == parsed(before).snapshot.script_sha256
    for field in ("config_sha256", "creation_id", "admission_fingerprint"):
        modified = copy.deepcopy(raw)
        modified["snapshot"][field] = str(uuid4()) if field.endswith("_id") else "f" * 64
        with pytest.raises(ValidationError):
            parsed(modified)


@pytest.mark.parametrize("field", ["business_id", "grant_id", "registration_id", "user_id", "creation_id"])
def test_saved_preview_cannot_drop_actual_business_scope_or_rebind_native_identity(field):
    raw = data()
    raw["scope"][field] = None if field in {"business_id", "grant_id"} else str(uuid4())
    if field == "grant_id":
        with pytest.raises(ValidationError):
            parsed(raw)
    else:
        with pytest.raises(ValidationError):
            parsed(raw)


@pytest.mark.parametrize("field,value", [("model", "gpt-6-luna"), ("effort", "medium"), ("call_limit", 4),
    ("text_request_id", str(uuid4())), ("quality_request_id", str(uuid4())), ("message_sha256", "f" * 64),
    ("message", " "), ("tools", ["shell"]), ("can_activate", True), ("messages", ["append old script"])])
def test_incremental_intent_has_exact_ids_message_profile_bound_and_no_activation(field, value):
    with pytest.raises(ValidationError):
        parsed(data() | {field: value})


def test_fresh_session_is_explicit_scope_authority_while_original_binding_stays_immutable():
    raw = data()
    original = raw["snapshot"]["session_id"]
    raw["scope"]["session_id"] = str(uuid4())
    plan = parsed(raw)
    assert str(plan.snapshot.session_id) == original and plan.scope.session_id != plan.snapshot.session_id
    with pytest.raises(ValidationError):
        lab.Episode.model_validate_json(plan.snapshot.model_dump_json())
    with pytest.raises(ValidationError):
        CallIdentity.model_validate_json(native_call(plan).model_dump_json())


def test_only_one_native_text_and_the_exact_quality_intent_match_a_preview_turn():
    plan = parsed()
    assert plan.call_matches(native_call(plan), "3" * 64)
    assert plan.call_matches(native_call(plan, "customer_quality"), "3" * 64)
    assert plan.call_matches(native_call(plan, "customer_quality", 2), "3" * 64)
    assert not plan.call_matches(native_call(plan, "customer_quality"), "4" * 64)
    assert not plan.call_matches(SimpleNamespace(**native_call(plan).model_dump()), "3" * 64)
    for field, value in (("conversation_id", uuid4()), ("preview_turn_id", uuid4()), ("preview_id", uuid4()),
            ("request_id", uuid4()), ("config_sha256", "f" * 64), ("execution_profile_sha256", "f" * 64)):
        assert not plan.call_matches(native_call(plan).model_copy(update={field: value}), "3" * 64)


def test_new_quality_request_parser_never_changes_v1_request_serialization():
    plan = parsed()
    request = review.SessionPreviewRequest(conversation_id=plan.conversation_id, request_id=plan.quality_request_id,
        episode=plan.snapshot, preview_turn_id=plan.task_id, text_request_id=plan.text_request_id,
        base_transcript_revision=0, base_transcript_sha256=digest([]))
    assert isinstance(review.parse_session_request(request.model_dump(mode="json")), review.SessionPreviewRequest)
    old = script_data()
    episode = lab.Episode.model_validate_json(json.dumps({**old["snapshot"], "episode_id": old["episode_id"],
        "script_sha256": digest(old["messages"])}))
    legacy = review.SessionScoredRequest(conversation_id=uuid4(), request_id=uuid4(), episode=episode)
    before = legacy.model_dump(mode="json")
    assert "version" not in before and "preview_turn_id" not in before
    assert review.parse_session_request(before).model_dump(mode="json") == before
    assert review.request_intent_sha256(legacy) == digest({key: value for key, value in before.items() if key != "conversation_id"})
    for field in ("preview_turn_id", "base_transcript_sha256", "text_request_id"):
        changed = request.model_copy(update={field: "f" * 64 if field.endswith("sha256") else uuid4()})
        assert review.request_intent_sha256(changed) != review.request_intent_sha256(request)


@pytest.mark.parametrize("mutation", ["extra_client", "failed_result", "wrong_base", "wrong_order"])
async def test_quality_requires_exact_prior_transcript_plus_this_successful_native_reply(mutation):
    plan = parsed()
    request = review.SessionPreviewRequest(conversation_id=plan.conversation_id, request_id=plan.quality_request_id,
        episode=plan.snapshot, preview_turn_id=plan.task_id, text_request_id=plan.text_request_id,
        base_transcript_revision=0, base_transcript_sha256=digest([]))
    client = SimpleNamespace(id=str(uuid4()), event_key="client:" + str(plan.text_request_id), sequence=1,
        kind="client_transcript", payload={"text": plan.message})
    result = SimpleNamespace(id=str(uuid4()), event_key="result:" + str(plan.text_request_id), sequence=2,
        kind="customer_text_result", payload={"status": "succeeded", "reply": "Sintetinė išvada."})
    rows = [client, result]
    class ReadOnly:
        async def scalars(self, statement):
            assert str(plan.conversation_id) in statement.compile().params.values()
            return rows
    assert (await preview.check_prefix(ReadOnly(), plan.conversation_id, request))[0] == 1
    if mutation == "extra_client":
        rows.append(SimpleNamespace(id=str(uuid4()), event_key="client:" + str(uuid4()), sequence=3,
            kind="client_transcript", payload={"text": "Kitas pranešimas."}))
    elif mutation == "failed_result":
        result.payload["status"] = "failed"
    elif mutation == "wrong_base":
        request = request.model_copy(update={"base_transcript_sha256": "f" * 64})
    else:
        result.sequence = 0
    with pytest.raises(ControlError, match="preview_transcript_changed"):
        await preview.check_prefix(ReadOnly(), plan.conversation_id, request)
