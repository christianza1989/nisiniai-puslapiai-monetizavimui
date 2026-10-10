"""Execution identity must match the real selected model, including failed reviews."""
import json
from datetime import UTC
from pathlib import Path

import pytest
from pydantic import ValidationError

from pinet_core.creation import adapter
from pinet_core.creation.team_wire import AttemptView
from pinet_core.tasks.codex_transport import RunnerError


@pytest.mark.parametrize("role,model", [("creator", "gpt-6-luna"), ("critic", "gpt-6-luna"),
                                       ("coordinator", "gpt-6-luna")])
def test_fixed_model_is_selected_by_server_role(role, model):
    args = adapter.arguments("fixed", "workspace", "schema", "output", web=False, role=role)
    assert adapter.role_model(role) == args[args.index("--model") + 1] == model


def test_execution_profile_is_part_of_claimed_snapshot(monkeypatch):
    before = adapter.team_instruction_hash()
    original = adapter.role_profile
    monkeypatch.setattr(adapter, "role_profile", lambda role: {**original(role), "model": "changed"})
    assert adapter.team_instruction_hash() != before


def test_fixed_catalogue_preserves_both_original_models_and_actual_review_arguments():
    from pinet_core.tasks.codex import arguments as consultation_arguments
    path = adapter.review_model_catalogue()
    data = json.loads(path.read_bytes())
    assert [item['slug'] for item in data['models']] == ['gpt-6-luna', 'gpt-6.1-sol']
    assert all(item['support_verbosity'] is True for item in data['models'])
    assert adapter.role_profile('critic')['model_catalogue_sha256'] == adapter.REVIEW_MODEL_CATALOGUE_SHA256
    for role in ('critic', 'coordinator'):
        args = adapter.arguments('fixed', 'workspace', 'schema', 'output', web=False, role=role)
        assert [arg for arg in args if arg.startswith('model_catalog_json=')] == [
            'model_catalog_json=' + json.dumps(str(path))]
    assert adapter.arguments('fixed', 'workspace', 'schema', 'output', web=False) == consultation_arguments(
        'fixed', 'workspace', 'schema', 'output')


@pytest.mark.parametrize('missing', [False, True])
def test_catalogue_not_present_or_modified_blocks_team_snapshot_and_review_arguments(tmp_path, monkeypatch, missing):
    path = tmp_path / 'catalogue.json'
    if not missing:
        path.write_bytes(adapter.REVIEW_MODEL_CATALOGUE.read_bytes() + b' ')
    monkeypatch.setattr(adapter, 'REVIEW_MODEL_CATALOGUE', path)
    for call in (adapter.team_instruction_hash,
                 lambda: adapter.arguments('fixed', 'workspace', 'schema', 'output', web=False, role='critic')):
        with pytest.raises(RunnerError, match='runner_unavailable'):
            call()
    # The native GUIDE imports default arguments; a review catalogue is not its dependency.
    assert not any(arg.startswith('model_catalog_json=') for arg in adapter.arguments(
        'fixed', 'workspace', 'schema', 'output', web=False))


def test_changed_exact_catalogue_hash_changes_claimed_snapshot(tmp_path, monkeypatch):
    import hashlib
    before = adapter.team_instruction_hash()
    raw = adapter.REVIEW_MODEL_CATALOGUE.read_bytes() + b'\n'
    path = tmp_path / 'review.json'
    path.write_bytes(raw)
    monkeypatch.setattr(adapter, 'REVIEW_MODEL_CATALOGUE', path)
    monkeypatch.setattr(adapter, 'REVIEW_MODEL_CATALOGUE_SHA256', hashlib.sha256(raw).hexdigest())
    assert adapter.team_instruction_hash() != before


@pytest.mark.parametrize("role", ["critic", "coordinator"])
@pytest.mark.parametrize("failed", [False, True])
async def test_success_and_failed_private_evidence_match_actual_cli_model(tmp_path, monkeypatch, role, failed):
    import sys

    from test_creation_review import draft

    monkeypatch.setattr(adapter, "available", lambda: (Path(sys.executable), tmp_path))
    context = {"draft": draft.__wrapped__(), "stage": "private_draft", "round_number": 1, "receipts": []}
    if role == "coordinator":
        from test_creation_review import report
        context["critic"] = report(context["draft"])

    async def execute(args, **kwargs):
        assert args[args.index("--model") + 1] == "gpt-6-luna"
        if failed:
            raise RunnerError("provider_error")
        if role == "critic":
            from test_creation_compact_review import compact
            return compact(context["draft"]), {"usage": {"input_tokens": 3, "output_tokens": 1}}
        return {}, {"usage": {"input_tokens": 3, "output_tokens": 1}}

    monkeypatch.setattr(adapter, "execute", execute)
    async def authorized():
        return True
    if failed:
        with pytest.raises(RunnerError, match="provider_error"):
            await adapter.run_role(context, authorized, role=role, seconds=30)
        evidence = json.loads(next(tmp_path.glob("business-*/failure.private.json")).read_bytes())
        assert evidence["model"] == "gpt-6-luna"
    else:
        _, receipt = await adapter.run_role(context, authorized, role=role, seconds=30)
        assert receipt["model"] == "gpt-6-luna"


def test_additive_wire_reads_history_but_rejects_sol_creator():
    from datetime import datetime
    from uuid import uuid4

    value = dict(attempt_id=uuid4(), job_id=uuid4(), sequence=1, role="critic", round_number=1,
        stage="private_draft", state="failed", source_revision="a" * 40, instruction_hash="b" * 64,
        model="gpt-6-luna", created_at=datetime.now(UTC))
    assert AttemptView.model_validate(value).model == "gpt-6-luna"
    assert AttemptView.model_validate({**value, "model": "gpt-6.1-sol"}).model == "gpt-6.1-sol"
    with pytest.raises(ValidationError):
        AttemptView.model_validate({**value, "role": "creator", "model": "gpt-6.1-sol"})
    with pytest.raises(ValidationError):
        AttemptView.model_validate({**value, "model": "customer-selected"})
