"""Versioned direct-chat DTOs, no API, database, provider or worker startup."""
import copy
import hashlib
import json
from importlib import import_module
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.workspace_team.wire import Send


def sample():
    chat_id, portfolio, topic, creation, participant, task = [str(uuid4()) for _ in range(6)]
    recipient = {"kind": "consultant", "participant_id": participant, "role": "adviser",
        "capability_id": "workspace.business_adviser.v1", "configuration_sha256": "a" * 64}
    anchor = {"kind": "creation", "selection_id": creation}
    chat = {"chat_id": chat_id, "portfolio_id": portfolio, "parent_topic_id": topic, "anchor": anchor,
        "execution_scope": {"kind": "workspace", "portfolio_id": portfolio, "parent_topic_id": topic, "anchor": anchor},
        "recipient": recipient, "mode": "consultant", "native_state": None, "native_conversation_id": None,
        "can_send": True, "blockers": [], "turn_count": 1, "turn_limit": 20,
        "created_at": "2026-10-16T00:00:00+03:00", "created_source_revision": "b" * 40, "tools": [], "external_actions": False}
    text = "Tikras sintetinis, įrankių nevykdantis atsakymas."
    event = {"event_id": str(uuid4()), "chat_id": chat_id, "task_id": task, "sequence": 2,
        "author": {"kind": "consultant", "participant_id": participant, "role": "adviser", "attempt_id": str(uuid4())},
        "reply_to_event_id": None, "content": text, "content_sha256": hashlib.sha256(text.encode()).hexdigest(),
        "source_revision": "b" * 40, "created_at": "2026-10-16T00:00:01+03:00"}
    turn = {"task_id": task, "chat_id": chat_id, "mode": "consultant", "sequence": 1, "idempotency_key": str(uuid4()),
        "status": "succeeded", "can_cancel": False, "failure_code": None, "call_limit": 1,
        "usage": {"reserved_calls": 1, "settled_calls": 1, "usage_complete": True,
            "input_tokens": 100, "output_tokens": 20, "cost_status": "UNVERIFIED"}, "preview": None,
        "source_revision": "b" * 40, "created_at": "2026-10-16T00:00:00+03:00", "updated_at": "2026-10-16T00:00:01+03:00"}
    return {"chat": chat, "events": [event], "turns": [turn], "cutoff_sequence": 2, "next_cursor": None}


def wire():
    return import_module("pinet_core.workspace_team.direct_wire")


def test_legacy_group_send_does_not_silently_treat_an_author_id_as_recipient():
    with pytest.raises(ValidationError):
        Send.model_validate({"idempotency_key": str(uuid4()), "content": "Privatus klausimas.",
            "participant_id": str(uuid4())})


def test_direct_contract_has_independent_exact_chat_recipient_and_preview_modes():
    contract = import_module("pinet_core.workspace_team.direct_contract").document()
    assert contract["info"]["version"] == "workspace-direct.v1"
    base = "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/direct"
    assert set(contract["paths"]) == {base + suffix for suffix in (
        "/recipients", "/chats", "/chats/{chat_id}", "/chats/{chat_id}/events",
        "/chats/{chat_id}/turns", "/chats/{chat_id}/turns/{task_id}/cancel")}
    schemas = contract["components"]["schemas"]
    assert schemas["DirectConsultant"]["properties"]["kind"]["const"] == "consultant"
    assert schemas["DirectSavedAgent"]["properties"]["kind"]["const"] == "saved_agent"
    assert schemas["DirectSend"]["additionalProperties"] is False
    assert "recipient" not in schemas["DirectSend"]["properties"]
    assert schemas["DirectCreate"]["properties"]["recipient"]["discriminator"]["propertyName"] == "kind"


def test_wire_only_document_has_resolved_refs_and_stable_export_without_runtime_imports():
    document = import_module("pinet_core.workspace_team.direct_contract").document()
    schemas = document["components"]["schemas"]

    def walk(value):
        if isinstance(value, dict):
            if "$ref" in value:
                assert value["$ref"].startswith("#/components/schemas/")
                assert value["$ref"].split("/")[-1] in schemas
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(document)
    assert json.loads(json.dumps(document, ensure_ascii=False)) == document
    assert document == import_module("pinet_core.workspace_team.direct_contract").document()
    assert set(document["paths"][next(path for path in document["paths"] if path.endswith("/chats"))]) == {"get", "post"}


def test_private_creation_consultant_has_workspace_scope_without_a_fake_business_or_grant():
    value = wire().DirectHistory.model_validate(sample()).model_dump(mode="json")
    assert value["chat"]["execution_scope"]["kind"] == "workspace"
    assert set(value["chat"]["execution_scope"]).isdisjoint({"business_id", "grant_id"})
    assert value["turns"][0]["call_limit"] == 1 and value["turns"][0]["usage"]["reserved_calls"] == 1
    assert value["chat"]["tools"] == [] and not value["chat"]["external_actions"]


def test_discovery_is_an_exact_owned_workspace_anchor_not_a_native_business_downgrade():
    value = sample()
    value["chat"]["anchor"]["kind"] = "discovery"
    assert wire().DirectHistory.model_validate(value).chat.execution_scope.anchor.kind == "discovery"
    value["chat"]["execution_scope"] = copy.deepcopy(value["chat"]["execution_scope"])
    value["chat"]["execution_scope"]["anchor"]["selection_id"] = str(uuid4())
    with pytest.raises(ValidationError):
        wire().DirectHistory.model_validate(value)


def test_cancel_capability_is_explicit_server_projection_and_cannot_claim_terminal_effect():
    turn = sample()["turns"][0]
    assert wire().DirectTurn.model_validate(turn).can_cancel is False
    turn["can_cancel"] = True
    with pytest.raises(ValidationError):
        wire().DirectTurn.model_validate(turn)
    turn["status"] = "running"
    assert wire().DirectTurn.model_validate(turn).can_cancel is True


@pytest.mark.parametrize("field", ["recipient", "chat_id", "mode", "source_revision", "model", "tools", "business_id", "execution_scope"])
def test_message_cannot_change_the_server_held_target_scope_or_execution(field):
    with pytest.raises(ValidationError):
        wire().DirectSend.model_validate({"idempotency_key": str(uuid4()), "content": "Klausimas.", field: "forged"})


@pytest.mark.parametrize("change", ["role", "capability", "mode", "scope", "portfolio", "parent", "author", "event_chat", "turn_chat", "content_hash", "calls", "full"])
def test_forged_history_scope_author_or_accounting_is_not_a_valid_direct_projection(change):
    value = sample()
    if change == "role":
        value["chat"]["recipient"]["role"] = "coordinator"
    elif change == "capability":
        value["chat"]["recipient"]["capability_id"] = "foreign.capability"
    elif change == "mode":
        value["chat"]["mode"] = "agent_preview"
    elif change == "scope":
        value["chat"]["execution_scope"]["business_id"] = str(uuid4())
    elif change == "portfolio":
        value["chat"]["execution_scope"]["portfolio_id"] = str(uuid4())
    elif change == "parent":
        value["chat"]["execution_scope"]["parent_topic_id"] = str(uuid4())
    elif change == "author":
        value["events"][0]["author"]["participant_id"] = str(uuid4())
    elif change == "event_chat":
        value["events"][0]["chat_id"] = str(uuid4())
    elif change == "turn_chat":
        value["turns"][0]["chat_id"] = str(uuid4())
    elif change == "content_hash":
        value["events"][0]["content"] += " Pakeista."
    elif change == "calls":
        value["turns"][0]["usage"]["reserved_calls"] = 2
    elif change == "full":
        value["chat"]["turn_count"] = 20
    with pytest.raises(ValidationError):
        wire().DirectHistory.model_validate(value)


def test_saved_agent_preview_is_explicit_and_cannot_downgrade_to_workspace_scope_or_fake_activation():
    value = sample()["chat"]
    recipient = {"kind": "saved_agent", "creation_id": value["anchor"]["selection_id"], "agent_id": str(uuid4()),
        "revision_id": str(uuid4()), "revision": 1, "configuration_sha256": "c" * 64}
    native = {"configuration_state": "draft", "calibration_status": "UNVERIFIED", "module_admission": "not_admitted",
        "channel_activation": "not_performed", "preview_admitted": False}
    value.update(recipient=recipient, mode="agent_preview", native_state=native, can_send=False, blockers=["preview_not_admitted"])
    with pytest.raises(ValidationError):
        wire().DirectChat.model_validate(value)
    value["execution_scope"] = {"kind": "business", "portfolio_id": value["portfolio_id"],
        "parent_topic_id": value["parent_topic_id"], "business_id": str(uuid4()), "grant_id": str(uuid4())}
    assert wire().DirectChat.model_validate(value).native_state.module_admission == "not_admitted"
    for field, forged in (("module_admission", "admitted"), ("channel_activation", "performed"), ("calibration_status", "PASS")):
        changed = copy.deepcopy(value)
        changed["native_state"][field] = forged
        with pytest.raises(ValidationError):
            wire().DirectChat.model_validate(changed)
    with pytest.raises(ValidationError):
        wire().DirectCreate.model_validate({"idempotency_key": str(uuid4()), "mode": "consultant", "recipient": recipient})


def test_current_quality_needs_artifact_but_later_transcript_does_not_rewrite_old_success():
    evidence = {"conversation_id": str(uuid4()), "configuration_sha256": "a" * 64, "transcript_revision": 1,
        "quality_state": "succeeded", "quality_current": True, "quality_artifact_id": None,
        "quality_artifact_sha256": None, "module_admission": "not_admitted", "activation": "not_performed"}
    with pytest.raises(ValidationError):
        wire().DirectPreviewEvidence.model_validate(evidence)
    evidence.update(quality_artifact_id=str(uuid4()), quality_artifact_sha256="d" * 64)
    turn = sample()["turns"][0]
    turn.update(mode="agent_preview", call_limit=3, preview=evidence)
    assert wire().DirectTurn.model_validate(turn).preview.quality_current
    evidence["quality_current"] = False
    assert wire().DirectTurn.model_validate(turn).status == "succeeded"
    evidence["quality_state"] = "failed"
    with pytest.raises(ValidationError):
        wire().DirectTurn.model_validate(turn)


def test_recipient_list_and_chat_list_cannot_duplicate_or_cross_parent_scope():
    history = sample()
    chat = history["chat"]
    contact = {"recipient": chat["recipient"], "name": "Verslo patarėjas", "purpose": "Konsultuoja be įrankių.",
        "mode": "consultant", "can_create_chat": True, "blockers": [], "native_state": None,
        "execution_scope": chat["execution_scope"], "tools": [], "external_actions": False}
    contacts = {"portfolio_id": chat["portfolio_id"], "parent_topic_id": chat["parent_topic_id"], "anchor": chat["anchor"],
        "items": [contact], "has_more": False, "next_cursor": None}
    assert len(wire().DirectRecipients.model_validate(contacts).items) == 1
    contacts["items"].append(copy.deepcopy(contact))
    with pytest.raises(ValidationError):
        wire().DirectRecipients.model_validate(contacts)
    chats = {"portfolio_id": str(uuid4()), "parent_topic_id": chat["parent_topic_id"], "items": [chat], "next_cursor": None}
    with pytest.raises(ValidationError):
        wire().DirectChats.model_validate(chats)
