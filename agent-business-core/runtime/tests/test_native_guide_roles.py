"""Native roles use the existing fixed no-tools transport and exact profile hashes."""
import json
from copy import deepcopy
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.config import settings
from pinet_core.content_work import adapter, review
from pinet_core.content_work.wire import AttemptView
from pinet_core.tasks.codex import DISABLED
from pinet_core.tasks.codex_transport import RunnerError


@pytest.fixture
def role_context(monkeypatch):
    monkeypatch.setattr(settings(), "creation_language_review_enabled", False)
    prepared = {"instructionHash": "a" * 64, "instructions": "Rengti privatų native V2 gidą.",
                "outputSchema": {"type": "object"}, "pageData": {"planningBrief": {}}, "siteData": {}}
    output = {"title": "Kaip palyginti vieną užduotį", "description":
              "Užrašykite tos pačios užduoties rezultatą ir visą žmonių darbo laiką.",
              "intent": "Padėti užrašyti vieno išgalvoto bandymo rezultatą.",
              "body": [{"type": "paragraph", "text": "Lyginamas bendras aktyvus žmonių darbas."}],
              "factChecks": []}
    receipts = review.observations(output)
    report = {"schema_version": "creation.critic.v1", "role": "critic",
              "draft_sha256": review.shared.canonical_sha256(output), "stage": "content", "round_number": 1,
              "verdict": "accept_draft", "summary": "Privatus juodraštis priimtas, faktinės patikros neatliktos.",
              "findings": [], "checks": [{"kind": r["kind"], "status": r["status"],
                  "evidence_refs": [r["id"]], "summary": r["summary"]} for r in receipts]}
    return prepared, output, receipts, report


@pytest.mark.parametrize("role", ["creator", "critic", "coordinator"])
@pytest.mark.parametrize("failed", [False, True])
async def test_actual_argv_and_success_or_failure_receipt_match_fixed_role(role_context, monkeypatch, tmp_path, role, failed):
    prepared, output, receipts, report = role_context
    monkeypatch.setattr(adapter, "available", lambda: (tmp_path / "codex.exe", tmp_path))
    model = "gpt-6-luna" if role == "creator" else "gpt-6.1-sol"
    context = {"prepared": prepared, "expected_model": model,
               "expected_instruction_hash": adapter.instruction_hash(role, prepared)}
    if role != "creator":
        context["review"] = review.context(output, 1, receipts, prepared, report if role == "coordinator" else None)
    calls = []
    async def transport(argv, **kwargs):
        calls.append(argv)
        assert argv[argv.index("--model") + 1] == model
        assert 'web_search="disabled"' in argv
        assert '--ignore-user-config' in argv and '--strict-config' in argv
        assert argv[argv.index('--sandbox') + 1] == 'read-only'
        assert all(any(argv[i:i+2] == ['--disable', feature] for i in range(len(argv)-1)) for feature in DISABLED)
        assert await kwargs['still_authorized']()
        catalogue = any(value.startswith('model_catalog_json=') for value in argv)
        assert catalogue == (role != "creator")
        if failed:
            raise RunnerError("provider_error", {"usage": {"input_tokens": 7, "output_tokens": 2}})
        return {"transport": "synthetic"}, {"usage": {"input_tokens": 7, "output_tokens": 2}}
    monkeypatch.setattr(adapter, "execute", transport)
    async def authorized():
        return True
    if failed:
        with pytest.raises(RunnerError, match="provider_error"):
            await adapter.run_role(context, authorized, role=role, seconds=10)
        evidence = json.loads(next(tmp_path.glob('guide-*/failure.private.json')).read_bytes())
        assert evidence['model'] == model
        assert evidence['instruction_hash'] == context['expected_instruction_hash']
        assert evidence['receipt']['usage'] == {'input_tokens': 7, 'output_tokens': 2}
    else:
        value, receipt = await adapter.run_role(context, authorized, role=role, seconds=10)
        assert value == {"transport": "synthetic"} and receipt['model'] == model
        assert receipt['instruction_hash'] == context['expected_instruction_hash']
    assert len(calls) == 1


@pytest.mark.parametrize("role", ["creator", "critic", "coordinator"])
async def test_changed_profile_stops_before_dispatch(role_context, monkeypatch, tmp_path, role):
    prepared = role_context[0]
    old_hash, old_execution = adapter.instruction_hash(role, prepared), adapter.execution_hash()
    original = adapter.role_profile
    monkeypatch.setattr(adapter, 'role_profile', lambda r: {**original(r), 'reasoning_effort': 'changed'})
    assert adapter.instruction_hash(role, prepared) != old_hash and adapter.execution_hash() != old_execution
    monkeypatch.setattr(adapter, 'available', lambda: (tmp_path / 'codex.exe', tmp_path))
    async def forbidden(*args, **kwargs):
        pytest.fail('Changed profile must not dispatch')
    monkeypatch.setattr(adapter, 'execute', forbidden)
    with pytest.raises(RunnerError, match='instructions_changed'):
        await adapter.run_role({'prepared': prepared, 'expected_instruction_hash': old_hash,
                               'expected_model': adapter.role_model(role)}, forbidden, role=role, seconds=10)
    assert not list(tmp_path.iterdir())


def test_profile_changes_do_not_mutate_prepared_native_context(role_context):
    prepared = role_context[0]
    before = deepcopy(prepared)
    assert adapter.role_model('creator') == 'gpt-6-luna'
    assert {adapter.role_model(role) for role in ('critic', 'coordinator')} == {'gpt-6.1-sol'}
    assert len({adapter.instruction_hash(role, prepared) for role in ('creator', 'critic', 'coordinator')}) == 3
    assert prepared == before


@pytest.mark.parametrize("role,model,valid", [
    ("creator", "gpt-6-luna", True),
    ("creator", "gpt-6.1-sol", False),
    ("critic", "gpt-6-luna", True),
    ("coordinator", "gpt-6-luna", True),
    ("critic", "gpt-6.1-sol", True),
    ("coordinator", "gpt-6.1-sol", True),
    ("critic", "invented-model", False),
])
def test_attempt_wire_accepts_historical_models_and_rejects_invalid_roles(role, model, valid):
    value = {"attempt_id": uuid4(), "sequence": 1, "role": role, "round_number": 1,
             "stage": "content", "source_revision": "a" * 40, "instruction_sha256": "b" * 64,
             "model": model, "created_at": datetime.now(UTC)}
    if valid:
        assert AttemptView.model_validate(value).model == model
    else:
        with pytest.raises(ValidationError):
            AttemptView.model_validate(value)


def test_attempt_schema_expresses_fixed_creator_and_historical_reviewers():
    schema = AttemptView.model_json_schema()
    assert schema["properties"]["model"]["enum"] == ["gpt-6-luna", "gpt-6.1-sol"]
    assert schema["allOf"] == [{
        "if": {"properties": {"role": {"const": "creator"}}},
        "then": {"properties": {"model": {"const": "gpt-6-luna"}}},
    }]
