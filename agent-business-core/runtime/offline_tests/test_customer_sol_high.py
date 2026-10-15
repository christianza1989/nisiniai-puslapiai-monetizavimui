"""Canonical High profile binding, inert transport; legacy execution stays exact."""
import asyncio
import hashlib
import importlib
import json
import sys
from contextlib import asynccontextmanager
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from test_customer_agent_session import text_case  # noqa: F401 - inert authority fixture
from test_customer_quality import row, saved_task
from test_customer_typed_checks import bound_case, observations
from test_customer_typed_checks import result as typed_result

from pinet_core.config import settings
from pinet_core.contracts import Quality
from pinet_core.control.routes import ControlError
from pinet_core.creation import execution_profiles as profiles
from pinet_core.creation.service import digest
from pinet_core.customer_agents import evaluator, lab, quality, typed_checks
from pinet_core.customer_agents.session import SessionPrincipal
from pinet_core.customer_text import adapter, execution
from pinet_core.customer_text import service as chat
from pinet_core.tasks.codex_transport import RunnerError


@pytest.fixture
def high(monkeypatch, tmp_path):
    cfg = settings()
    for key, value in {"control_mode": "local", "environment": "test-session",
            "creation_execution_profile": profiles.SOL_HIGH, "control_source_revision": "a" * 40,
            "customer_text_runner_enabled": True, "chat_model": adapter.MODEL,
            "chat_codex_executable": sys.executable,
            "chat_codex_sha256": hashlib.sha256(Path(sys.executable).read_bytes()).hexdigest(),
            "chat_workspace": str(tmp_path), "chat_runner_seconds": 30}.items():
        monkeypatch.setattr(cfg, key, value)
    monkeypatch.setattr(adapter, "source_current", lambda: True)
    return execution.capture_high()


def test_server_pin_captures_both_canonical_high_roles(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "control_mode", "local")
    monkeypatch.setattr(cfg, "environment", "test-customer-high")
    monkeypatch.setattr(cfg, "creation_execution_profile", profiles.SOL_HIGH)
    execution = importlib.import_module("pinet_core.customer_text.execution")
    pin = execution.capture_high()
    assert pin.name == profiles.SOL_HIGH
    assert pin.text.model == pin.quality.model == "gpt-6.1-sol"
    assert pin.text.reasoning_effort == pin.quality.reasoning_effort == "high"


def high_row(pin):
    value = row()
    task = saved_task(value)
    task["execution_profile"] = pin.model_dump(mode="json")
    value.payload["customer_text_binding"].update(execution_profile=pin.model_dump(mode="json"), model=pin.text.model)
    return value


def test_legacy_snapshot_nested_binding_and_hash_do_not_change_when_runtime_high(high, monkeypatch):
    value = row()
    task = saved_task(value)
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)
    before = lab.Episode.model_validate(task).model_dump(mode="json")
    binding = quality.Binding.model_validate(value.payload["customer_text_binding"]).model_dump(mode="json")
    parent = quality.parent(value)
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    assert lab.Episode.model_validate(task).model_dump(mode="json") == before
    assert "execution_profile" not in before
    assert quality.Binding.model_validate(value.payload["customer_text_binding"]).model_dump(mode="json") == binding
    assert "execution_profile" not in binding and "execution_profile" not in binding["task_calibration"]
    assert quality.parent(value) == parent


def test_high_history_is_data_under_default_runtime_but_cannot_execute(high, monkeypatch):
    value = high_row(high)
    frozen = deepcopy(quality.retained(value).model_dump(mode="json"))
    parent = quality.parent(value)
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)
    assert quality.retained(value).model_dump(mode="json") == frozen and quality.parent(value) == parent
    with pytest.raises(RunnerError):
        execution.current(high)
    with pytest.raises(ControlError, match="conversation_task_not_current"):
        chat._bearer("inert-private").text_authority("inert", calibration=frozen["task_calibration"])


@pytest.mark.parametrize("change", ["missing_top", "missing_nested", "model", "catalogue"])
def test_high_history_refuses_mixed_or_forged_profile_binding(high, change):
    value = high_row(high)
    bound = value.payload["customer_text_binding"]
    if change == "missing_top":
        del bound["execution_profile"]
    elif change == "missing_nested":
        del bound["task_calibration"]["execution_profile"]
    elif change == "model":
        bound["model"] = adapter.MODEL
    else:
        bound["execution_profile"]["text"]["model_catalogue_sha256"] = "9" * 64
    with pytest.raises(ValueError):
        quality.retained(value)


@pytest.mark.parametrize("kind", ["customer_text", "customer_quality"])
@pytest.mark.parametrize("outcome", ["success", "error", "cancel"])
async def test_actual_high_argv_and_captured_metadata_survive_runtime_loss(high, monkeypatch, kind, outcome):
    calls, event = [], str(uuid4())

    async def authorized():
        return True

    async def execute(argv, **options):
        assert await options["still_authorized"]()
        calls.append(argv)
        assert argv[argv.index("--model") + 1] == "gpt-6.1-sol"
        assert 'model_reasoning_effort="high"' in argv and 'web_search="disabled"' in argv
        monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)
        if outcome == "cancel":
            options["on_event"]({"type": "turn.completed", "usage": {"input_tokens": 9}})
            raise asyncio.CancelledError()
        if outcome == "error":
            raise RunnerError("provider_error", {"input_tokens": 7})
        return ({"reply": "Inert High reply", "calls": []} if kind == "customer_text" else {
            "outcome": "helpful", "issues": [], "evidence_event_ids": [event], "improvement_hint": "",
            "root_cause": "unknown", "suggested_scope": None}), {"input_tokens": 5}

    monkeypatch.setattr(adapter if kind == "customer_text" else evaluator, "execute", execute)
    call = (adapter.run_high(high, {}, event, 0, authorized) if kind == "customer_text" else
            evaluator.run_high(high, Quality, "Inert independent assessment", "{}", authorized))
    if outcome == "success":
        _, usage = await call
    else:
        with pytest.raises(adapter.RequestInterrupted if outcome == "cancel" else RunnerError) as raised:
            await call
        usage = raised.value.receipt
    assert len(calls) == 1 and usage["input_tokens"] == {"success": 5, "error": 7, "cancel": 9}[outcome]
    bound = high_row(high).payload["customer_text_binding"]
    assert execution.verified(usage, bound, kind)
    captured = execution.observation(usage)
    assert captured["model"] == "gpt-6.1-sol" and captured["reasoning_effort"] == "high"
    assert captured["argv_sha256"] == hashlib.sha256(json.dumps([str(a) for a in calls[0]], ensure_ascii=False).encode()).hexdigest()
    assert "_execution" not in chat.usage_receipt(usage) and chat.usage_receipt(usage)["known"]


async def test_high_first_native_reservation_uses_derived_profile_and_effort(high, text_case):  # noqa: F811 - imported fixture
    f = text_case
    f.bound.update(execution_profile=high.model_dump(mode="json"), model=high.text.model)
    f.bound["task_calibration"]["execution_profile"] = high.model_dump(mode="json")
    f.principal = SessionPrincipal(f.principal.scope, f.fence, execution_profile=high)
    await chat._prepare(f.principal, f.creation, f.row.id, f.value, calibration={})
    identity = f.fence.calls[0][1]
    assert identity.execution_profile_sha256 == high.fingerprint() and identity.reasoning_effort == "high"
    assert identity.model == high.text.model and len(f.fence.calls) == 1


async def test_high_profile_drift_before_first_reservation_consumes_no_permit(high, text_case, monkeypatch):  # noqa: F811 - imported fixture
    f = text_case
    f.bound.update(execution_profile=high.model_dump(mode="json"), model=high.text.model)
    f.bound["task_calibration"]["execution_profile"] = high.model_dump(mode="json")
    f.principal = SessionPrincipal(f.principal.scope, f.fence, execution_profile=high)
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)
    with pytest.raises(RunnerError):
        await chat._prepare(f.principal, f.creation, f.row.id, f.value, calibration={})
    assert not f.fence.calls and "provider_attempt" not in f.log


async def test_profile_runner_refusal_is_a_false_authority_check(high, monkeypatch):
    class Principal:
        @asynccontextmanager
        async def text_authority(self, *_, **__):
            raise RunnerError("instructions_changed")
            yield  # pragma: no cover - async context-manager protocol

    dispatch = SimpleNamespace(creation_id=str(uuid4()), binding={"task_calibration": {}})
    assert await chat._authorized(Principal(), dispatch) is False


def test_attributed_defect_keeps_independent_helpfulness_failed_without_changing_other_criteria():
    binding = bound_case([{"after_step": 1, "mode": "fields", "matches": {"budget": ["100"]}},
        {"after_step": 2, "mode": "fields", "matches": {"budget": ["50"]}}])
    value = {**typed_result(), "outcome": "needs_review", "issues": ["Synthetic clarification omitted"],
        "root_cause": "communication", "model_assessment": {"root_cause": "knowledge"}}
    report = typed_checks.evaluate(binding, observations(), value)
    assert report["state"] == "FAIL" and not report["checks"]["independent_review_helpful"]
    assert all(value for key, value in report["checks"].items() if key != "independent_review_helpful")


@pytest.mark.parametrize("changed", ["model", "effort"])
async def test_wrong_actual_argv_never_executes_and_retains_captured_failure_metadata(high, monkeypatch, changed):
    original = execution.canonical.arguments
    calls = []

    def arguments(*args, **options):
        value = original(*args, **options)
        if changed == "model":
            value[value.index("--model") + 1] = adapter.MODEL
        else:
            value[value.index('model_reasoning_effort="high"')] = 'model_reasoning_effort="medium"'
        return value

    async def execute(*_, **__):
        calls.append("forbidden")

    async def authorized():
        return True

    monkeypatch.setattr(execution.canonical, "arguments", arguments)
    monkeypatch.setattr(adapter, "execute", execute)
    with pytest.raises(RunnerError, match="instructions_changed") as error:
        await adapter.run_high(high, {}, str(uuid4()), 0, authorized)
    capture = execution.observation(error.value.receipt)
    assert not calls and capture and len(capture["argv_sha256"]) == 64
    assert not execution.verified(error.value.receipt, high_row(high).payload["customer_text_binding"], "customer_text")


def test_high_parent_separates_profile_identity_without_rewriting_legacy(high):
    old = row()
    saved_task(old)
    parent, original = quality.parent(old), deepcopy(old.payload)
    newer = deepcopy(old)
    task = newer.payload["customer_text_binding"]["task_calibration"]
    task["execution_profile"] = high.model_dump(mode="json")
    newer.payload["customer_text_binding"].update(execution_profile=high.model_dump(mode="json"), model=high.text.model)
    assert quality.parent(newer) != parent and old.payload == original
    assert len(digest(newer.payload)) == 64


async def test_separate_preflight_uses_same_snapshot_body_without_task_fence(high, monkeypatch):
    task = saved_task(row())
    session = SimpleNamespace(id=task["session_id"], user_id=task["user_id"], revoked_at=None,
        expires_at=datetime.now(UTC) + timedelta(hours=1))
    creation = SimpleNamespace(id=task["creation_id"])
    registry = SimpleNamespace(id=task["registration_id"], fingerprint=task["registration_fingerprint"])
    agent = SimpleNamespace(id=task["agent_id"], purpose="site_chat", current_revision=task["config_revision"])
    config = SimpleNamespace(id=task["config_revision_id"], revision=task["config_revision"])
    admission = SimpleNamespace(id=task["admission_id"], fingerprint=task["admission_fingerprint"])
    observed = []

    class Transaction:
        async def get(self, *_):
            return admission

    tx = Transaction()

    @asynccontextmanager
    async def authority(*args, **options):
        observed.append(options)
        yield tx, session, creation, registry, agent

    async def current_config(*_):
        return config

    async def profile(*_, **__):
        return {"profile_current": True, "admission": {"admission_id": admission.id}}

    async def check(*_, **__):
        return None

    monkeypatch.setattr(lab, "guard", lambda: None)
    monkeypatch.setattr(lab.agents, "authority", authority)
    monkeypatch.setattr(lab.agents, "transaction_authority", authority)
    monkeypatch.setattr(lab.agents, "current_config", current_config)
    monkeypatch.setattr(lab.agents, "config_view", lambda *_: {"sha256": task["config_sha256"], "specification": task["specification"]})
    monkeypatch.setattr(lab.agents, "check_binding", check)
    monkeypatch.setattr(lab.profiles, "projection", profile)
    args = (creation.id, agent.id, task["config_revision"])
    original = await lab.snapshot("inert-private", *args)
    preflight = await lab.snapshot_in_transaction(tx, session, *args)
    captured = await lab.snapshot_in_transaction(tx, session, *args, execution_profile=high)
    assert preflight == original and "execution_profile" not in original
    assert captured == {**original, "execution_profile": high.model_dump(mode="json")}
    assert observed[-1] == {"writing": True, "lock": True}
