"""Strict local wire/schema/usage boundaries; no provider or database."""
import asyncio
import json
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core import text_tools
from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.customer_profile.instructions import NEED_FIELDS
from pinet_core.customer_text import adapter, contract, service
from pinet_core.customer_text.wire import Start, Turn
from pinet_core.profiles import PROFILES
from pinet_core.tasks.codex_transport import RunnerError


@pytest.mark.parametrize("change", [{"consent": 1}, {"consent": "true"}, {"consent": False},
    {"model": "other"}, {"prompt": "override"}, {"notice_version": "unknown"}])
def test_start_requires_exact_explicit_local_consent(change):
    with pytest.raises(ValidationError):
        Start.model_validate({"request_id": str(uuid4()), "admission_id": str(uuid4()),
            "notice_version": "customer-text.local.v1", "consent": True, **change})


@pytest.mark.parametrize("change", [{"base_need_revision": True}, {"base_need_revision": "1"},
    {"message": "   "}, {"message": "bad\x00text"}, {"business_id": str(uuid4())}])
def test_turn_rejects_untrusted_or_empty_material(change):
    with pytest.raises(ValidationError):
        Turn.model_validate({"request_id": str(uuid4()), "base_need_revision": 0,
            "message": "ordinary synthetic question", **change})


def test_schema_binds_actual_evidence_revision_and_server_fields():
    model = adapter.schema("client-event", 3)
    good = {"reply": "Synthetic response", "calls": [{"name": "need.patch", "arguments": {
        "base_revision": 3, "evidence_event_id": "client-event", "fields": [{"field": "goal", "value": "test"}]}}]}
    parsed = model.model_validate(good)
    assert text_tools.core_arguments(parsed.calls[0])["fields"] == {"goal": "test"}
    for field in ("tyre_marking", "email", "unknown"):
        bad = {"reply": "Synthetic", "calls": [{"name": "need.patch", "arguments": {
            "base_revision": 3, "evidence_event_id": "client-event", "fields": [{"field": field, "value": "x"}]}}]}
        with pytest.raises(ValidationError):
            model.model_validate(bad)
    with pytest.raises(ValidationError):
        model.model_validate({**good, "calls": [{"name": "ui.open_contact_form", "arguments": {}}]})
    assert set(NEED_FIELDS) == {"goal", "requirements", "deadline", "budget", "location"}


def test_legacy_schema_factory_retains_each_static_profile_fields_and_tools():
    for site, profile in PROFILES.items():
        schema = text_tools.turn_schema(site, "e", 2).model_json_schema()
        assert set(schema["$defs"]["NeedField"]["properties"]["field"]["enum"]) == profile.need_fields
        assert {"NeedCall", "KnowledgeCall", "ContactCall", "MemoryCall"} <= set(schema["$defs"])


def test_usage_is_known_integer_tokens_without_guessed_price():
    assert service.usage_receipt(None) == {"known": False, "tokens": None, "cost_usd": None}
    assert service.usage_receipt({"input_tokens": 0, "output_tokens": 21, "other": 2,
        "wrong_tokens": True, "negative_tokens": -1}) == {
            "known": True, "tokens": {"input_tokens": 0, "output_tokens": 21}, "cost_usd": None}
    assert service.usage_receipt("invalid") == service.usage_receipt(None)


def test_duplicate_need_fields_are_terminal_invalid_with_observed_usage():
    model = adapter.schema("e", 0)
    value = {"reply": "Synthetic", "calls": [{"name": "need.patch", "arguments": {
        "base_revision": 0, "evidence_event_id": "e", "fields": [
            {"field": "goal", "value": "a"}, {"field": "goal", "value": "b"}]}}]}
    assert model.model_validate(value)
    with pytest.raises(RunnerError) as failed:
        adapter.normalize(value, model, {"input_tokens": 29})
    assert failed.value.code == "output_invalid" and failed.value.receipt == {"input_tokens": 29}


async def test_real_owned_child_cancellation_keeps_observed_completed_usage(tmp_path, monkeypatch):
    """Synthetic Python child uses the actual bounded transport, zero provider calls."""
    monkeypatch.setattr(settings(), "chat_workspace", str(tmp_path))
    monkeypatch.setattr(adapter, "source_current", lambda: True)
    monkeypatch.setattr(adapter, "runner_ready", lambda: True)
    complete = asyncio.Event()
    original = adapter.check_trace_event

    def observed(event):
        original(event)
        if event.get("type") == "turn.completed":
            complete.set()

    monkeypatch.setattr(adapter, "check_trace_event", observed)
    event = json.dumps({"type": "turn.completed", "usage": {"input_tokens": 29, "output_tokens": 2}})
    child = f"import time; print({event!r}, flush=True); time.sleep(30)"
    monkeypatch.setattr(adapter, "arguments", lambda *args: [sys.executable, "-c", child])

    async def authorized():
        return True

    task = asyncio.create_task(adapter.run({}, "e", 0, authorized))
    await asyncio.wait_for(complete.wait(), 5)
    task.cancel()
    with pytest.raises(adapter.RequestInterrupted) as cancelled:
        await asyncio.wait_for(task, 10)
    assert cancelled.value.receipt == {"input_tokens": 29, "output_tokens": 2}


def test_canonical_text_contract_exactly_matches_actual_definitions():
    root = Path(__file__).resolve().parents[3]
    expected = json.loads((root / "docs/contracts/verslomatika-customer-text.openapi.json").read_text(encoding="utf-8"))
    assert expected == contract.document()
    assert len(expected["paths"]) == 5
    for methods in expected["paths"].values():
        for operation in methods.values():
            assert operation["security"] == [{"CoreSession": []}]
            assert "422" not in operation["responses"]


def test_new_text_flags_are_default_off_and_do_not_depend_on_owner_queue(monkeypatch):
    cfg = settings()
    assert type(cfg).model_fields["customer_text_enabled"].default is False
    assert type(cfg).model_fields["customer_text_runner_enabled"].default is False
    for key, value in {"control_mode": "local", "environment": "local", "customer_enabled": True,
            "chat_enabled": False, "chat_runner_enabled": False, "voice_enabled": False, "smtp_enabled": False,
            "customer_text_enabled": True, "customer_text_runner_enabled": True}.items():
        monkeypatch.setattr(cfg, key, value)
    service.guard()
    for key in ("customer_text_enabled", "customer_text_runner_enabled"):
        monkeypatch.setattr(cfg, key, False)
        with pytest.raises(ControlError):
            service.guard()
        monkeypatch.setattr(cfg, key, True)


def test_local_need_guidance_preserves_proposed_preferences_and_exact_original_material():
    context = {"client_message": "Synthetic client preference100EUR nextweek", "need": {}, "knowledge": {"sources": []}}
    typed, prompt, schema = adapter.material(context, "client-evidence", 7)
    assert "do not leave them only in the reply" in prompt
    assert "eligible proposed needs, never confirmed business facts" in prompt
    assert "do not invent a calendar date, unknown field" in prompt
    assert "If the latest message supplies no new explicit need information" in prompt
    assert prompt.endswith(json.dumps(context, ensure_ascii=False, sort_keys=True))
    assert schema == json.dumps(typed.model_json_schema())
    assert typed.model_validate({"reply": "Synthetic", "calls": []})
