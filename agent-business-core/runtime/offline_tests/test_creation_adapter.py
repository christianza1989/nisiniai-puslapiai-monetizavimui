import json

import pytest

from pinet_core.creation.adapter import Trace, arguments, instructions
from pinet_core.creation.renderer import normalize, preview, screen_language
from pinet_core.tasks.codex import RunnerError


def test_actual_instruction_fingerprint_and_fixed_tool_policy():
    value, fingerprint = instructions()
    assert len(fingerprint) == 64 and 'language-quality.md' in value and 'business-validation.md' in value
    from pinet_core.creation import adapter
    typography = adapter.ROOT / 'SKILLS/niche-site-builder/references/typography-system.md'
    assert typography.read_bytes().decode('utf-8-sig') in value
    args = arguments('fixed.exe', 'fixed', 'schema', 'output', web=True)
    assert 'web_search="live"' in args and args[args.index('--model')+1] == 'gpt-6-luna'
    assert args[args.index('--sandbox')+1] == 'read-only' and '--ignore-rules' in args


@pytest.mark.parametrize('role,effort', [('creator', 'medium'), ('critic', 'low'), ('coordinator', 'low')])
def test_review_role_profile_retains_exact_process_policy(role, effort):
    baseline = arguments('fixed.exe', 'fixed', 'schema', 'output', web=False)
    args = arguments('fixed.exe', 'fixed', 'schema', 'output', web=False, role=role)
    setting = next(value for value in args if value.startswith('model_reasoning_effort='))
    assert setting == f'model_reasoning_effort="{effort}"'
    expected_verbosity = [] if role == 'creator' else ['-c', 'model_verbosity="medium"']
    if expected_verbosity:
        assert args[-2:] == expected_verbosity
    else:
        assert not any(value.startswith('model_verbosity=') for value in args)
    unchanged = args[:-2] if expected_verbosity else args
    unchanged[unchanged.index('--model')+1] = baseline[baseline.index('--model')+1]
    assert [value for value in unchanged if not value.startswith('model_reasoning_effort=')] == [
        value for value in baseline if not value.startswith('model_reasoning_effort=')]
    assert not any('max_output_tokens' in value for value in args)


def test_unknown_role_cannot_select_a_process_profile():
    with pytest.raises(RunnerError, match='review_invalid'):
        arguments('fixed.exe', 'fixed', 'schema', 'output', web=False, role='customer-selected')


@pytest.mark.parametrize('change', ['missing', 'empty', 'edited'])
async def test_typography_snapshot_change_stops_creator_before_dispatch(tmp_path, monkeypatch, change):
    import sys
    from pathlib import Path

    from pinet_core.creation import adapter

    root, workspace = tmp_path / 'core', tmp_path / 'output'
    workspace.mkdir()
    for relative in adapter.INSTRUCTION_FILES:
        target = root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((adapter.ROOT / relative).read_bytes())
    policy = root / 'SKILLS/niche-site-builder/references/typography-system.md'
    policy.write_text('Original canonical typography contract', encoding='utf-8')
    monkeypatch.setattr(adapter, 'ROOT', root)
    monkeypatch.setattr(adapter, 'available', lambda: (Path(sys.executable), workspace))
    initial, digest = adapter.instructions()
    if change == 'missing':
        policy.unlink()
    else:
        policy.write_text('  ' if change == 'empty' else 'Revised canonical typography contract', encoding='utf-8')
    async def dispatched(*args, **kwargs):
        pytest.fail('Instruction mismatch must stop before model dispatch')
    monkeypatch.setattr(adapter, 'execute', dispatched)
    async def authorized():
        return True
    expected = 'instructions_changed' if change == 'edited' else 'instructions_unavailable'
    with pytest.raises(RunnerError, match=expected):
        await adapter.run_role({'expected_instruction_hash': digest, 'permitted_web_actions': 0},
                               authorized, role='creator', seconds=30)
    assert 'Original canonical typography contract' in initial
    assert 'Revised canonical typography contract' not in initial
    assert list(workspace.iterdir()) == []


def test_structure_only_profile_is_smaller_exact_canonical_context_and_disables_repeat_research():
    from pinet_core.creation.adapter import REPAIR_INSTRUCTION_FILES, role_instruction_hash
    initial, _ = instructions()
    repair, digest = instructions(structure_repair=True)
    assert len(repair.encode()) < len(initial.encode()) * .4
    assert "No new market research or web actions" in repair
    assert "pillar_path=''" in repair
    assert all(path in repair for path in REPAIR_INSTRUCTION_FILES)
    assert digest == role_instruction_hash("creator", structure_repair=True)
    assert digest != role_instruction_hash("creator")


async def test_dispatched_creator_prompt_and_receipt_share_one_actual_instruction_snapshot(tmp_path, monkeypatch):
    import sys
    from pathlib import Path

    from test_creation_content_plan import planned
    from test_creation_review import draft as fixture

    from pinet_core.creation import adapter

    root, workspace = tmp_path / 'core', tmp_path / 'output'
    workspace.mkdir()
    for relative in adapter.INSTRUCTION_FILES:
        target = root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((adapter.ROOT / relative).read_bytes())
    typography = root / 'SKILLS/niche-site-builder/references/typography-system.md'
    typography.write_text('Original immutable typography snapshot', encoding='utf-8')
    monkeypatch.setattr(adapter, 'ROOT', root)
    monkeypatch.setattr(adapter, 'available', lambda: (Path(sys.executable), workspace))
    original_loader = adapter.instructions
    original_policy, original_hash = original_loader()
    loads = []

    def changed_after_read(**kwargs):
        snapshot = original_loader(**kwargs)
        loads.append(snapshot[1])
        typography.write_text('Changed typography after the completed snapshot read', encoding='utf-8')
        return snapshot

    monkeypatch.setattr(adapter, 'instructions', changed_after_read)

    async def execute(args, **kwargs):
        assert kwargs['prompt'].startswith(original_policy + '\n\nUNTRUSTED_CONTEXT_JSON\n')
        assert 'Changed typography after the completed snapshot read' not in kwargs['prompt']
        return planned(fixture.__wrapped__()), {'usage': {'input_tokens': 1, 'output_tokens': 1}}

    monkeypatch.setattr(adapter, 'execute', execute)

    async def authorized():
        return True

    _, receipt = await adapter.run_role({'expected_instruction_hash': original_hash, 'permitted_web_actions': 0},
                                       authorized, role='creator', seconds=30)
    assert receipt['instruction_hash'] == original_hash and loads == [original_hash]


async def test_language_patch_profile_uses_exact_schema_no_web_and_retains_raw_edits(tmp_path, monkeypatch):
    import sys
    from pathlib import Path

    from test_creation_language_patch import candidate as candidate_fixture
    from test_creation_language_patch import critic, response
    from test_creation_review import draft as draft_fixture

    from pinet_core.config import settings
    from pinet_core.creation import adapter, language_patch

    candidate = candidate_fixture.__wrapped__(draft_fixture.__wrapped__())
    bound = language_patch.context(candidate, critic(candidate))
    raw = response(bound)
    policy, digest = adapter.instructions(language_repair=True)
    assert len(policy.encode()) < 10000 and digest == language_patch.instructions()[1]
    assert digest != adapter.role_instruction_hash("creator")
    monkeypatch.setattr(adapter, "available", lambda: (Path(sys.executable), tmp_path))
    monkeypatch.setattr(settings(), "creation_web_search_enabled", True)
    calls = []
    async def execute(args, **kwargs):
        assert 'web_search="disabled"' in args
        assert json.loads((kwargs["cwd"] / "output.schema.json").read_text("utf-8")) == language_patch.output_schema(bound)
        assert len(kwargs["prompt"].encode()) < 20000
        calls.append(args)
        kwargs["output"].write_text(json.dumps(raw), encoding="utf-8")
        return raw, {"usage": {"input_tokens": 20, "output_tokens": 8}, "web_search_count": 0}
    monkeypatch.setattr(adapter, "execute", execute)
    async def authorized():
        return True
    context = {"language_repair": True, "language_patch_context": bound, "permitted_web_actions": 0,
               "expected_instruction_hash": digest}
    value, receipt = await adapter.run_role(context, authorized, role="creator", seconds=30)
    assert value == raw and receipt["instruction_hash"] == digest and len(calls) == 1
    with pytest.raises(RunnerError, match="review_invalid"):
        await adapter.run_role({**context, "permitted_web_actions": 1}, authorized, role="creator", seconds=30)
    with pytest.raises(RunnerError, match="review_invalid"):
        adapter.instructions(language_repair=True, structure_repair=True)
    assert len(calls) == 1


async def test_adapter_preserves_graph_failed_original_and_bounded_repair_context(tmp_path, monkeypatch):
    import sys
    from copy import deepcopy
    from pathlib import Path

    from test_creation_content_plan import planned
    from test_creation_review import draft as fixture

    from pinet_core.config import settings
    from pinet_core.creation import adapter
    # Invoke the registered fixture's value, with no fixture bypass in production.
    value = planned(fixture.__wrapped__())
    value["content_plan"][0]["pillar_path"] = value["content_plan"][0]["path"]
    original = deepcopy(value)
    monkeypatch.setattr(adapter, "available", lambda: (Path(sys.executable), tmp_path))
    monkeypatch.setattr(settings(), "creation_web_search_enabled", True)
    async def executed(args, **kwargs):
        kwargs["output"].write_text(json.dumps(value), encoding="utf-8")
        return value, {"usage": {"input_tokens": 17,"output_tokens":4},"web_search_count":2}
    monkeypatch.setattr(adapter, "execute", executed)
    async def authorized():
        return True
    with pytest.raises(RunnerError) as error:
        await adapter.run_role({"expected_instruction_hash":adapter.role_instruction_hash("creator"),
            "permitted_web_actions":2}, authorized, role="creator", seconds=30)
    assert error.value.code == "output_invalid" and value == original
    assert error.value.receipt["web_search_count"] == 2
    assert error.value.receipt["creator_repair_context"]["issues"][0]["field"].endswith("/pillar_path")
    folder = next(tmp_path.iterdir())
    assert json.loads((folder/"output.private.json").read_text("utf-8")) == original
    assert json.loads((folder/"failure.private.json").read_text("utf-8"))["code"] == "output_invalid"


def test_web_trace_is_bounded_and_other_tools_rejected():
    trace = Trace(True)
    for i in range(6):
        item = {'type': 'item.completed', 'item': {'type': 'web_search', 'id': str(i)}}
        trace.event(item)
        trace.event(item)
    assert len(trace.searches) == 6
    with pytest.raises(RunnerError) as error:
        trace.event({'type': 'item.started', 'item': {'type': 'web_search', 'id': '7'}})
    assert error.value.code == 'research_limit'
    for kind in ('command_execution', 'mcp_tool_call', 'file_change', 'image_generation'):
        with pytest.raises(RunnerError) as error:
            Trace(True).event({'type': 'item.started', 'item': {'type': kind}})
        assert error.value.code == 'tool_attempted'
    with pytest.raises(RunnerError) as error:
        Trace(False).parse(json.dumps({'type': 'item.completed', 'item': {'type': 'web_search', 'id': 'a'}}))
    assert error.value.code == 'tool_attempted'


def test_revision_trace_rejects_unnecessary_third_web_action():
    trace = Trace(True, limit=2)
    for i in range(2):
        trace.event({'item': {'type': 'web_search', 'id': str(i)}})
    with pytest.raises(RunnerError) as error:
        trace.event({'item': {'type': 'web_search', 'id': 'third'}})
    assert error.value.code == 'research_limit'


@pytest.mark.parametrize("web", [True, False])
def test_shared_business_and_native_guide_trace_classifies_cli_errors(web):
    trace = Trace(web)
    with pytest.raises(RunnerError, match="provider_error"):
        trace.event({"type": "item.completed", "item": {"type": "error", "message": "stream disconnected"}})
    with pytest.raises(RunnerError, match="provider_error"):
        trace.parse(json.dumps({"type": "error", "message": "Incomplete response returned, reason: max_output_tokens"}))
    with pytest.raises(RunnerError, match="model_unavailable"):
        trace.event({"type": "item.completed", "item": {"type": "error", "message": "Model not supported"}})
    assert trace.searches == set()


def test_missing_or_untyped_draft_rejected():
    with pytest.raises(RunnerError) as error:
        normalize({'html': '<script>alert(1)</script>', 'publicationApproved': True})
    assert error.value.code == 'output_invalid'


def test_preview_source_has_no_remote_resource_or_executable_sink():
    # The renderer has only escaped typed text + fixed server-owned enum/theme assets.
    import inspect
    source = inspect.getsource(preview)
    assert 'html.escape' in source and 'default-src' in source and 'form-action' in source
    assert '<script' not in source and '<iframe' not in source and '<form' not in source


@pytest.mark.parametrize('text', [
    'Patikrinau teiginius. Ennen julkistamista tarvitaan tosiasialliset yhteystiedot ja toimiva kyselyiden vastaanotto.',
    'Apskaičiuoti mokymų ettevalmistus- ja toteutuskustannukset sekä päättää hinta ennen ensimmäistä toteutusta.',
    'We reviewed every page and all metadata before preparing the final business plan.',
    'Kliento įrankių хэрэгцээ dar nepatikrintas.',
    'Pasirinktas pirmasis mūsų ял pasiūlymas.',
])
def test_obvious_foreign_prose_rejected_even_when_self_review_claims_success(text):
    with pytest.raises(RunnerError) as error:
        screen_language(['Peržiūrėjau visą galutinį tekstą lietuviškai.', text])
    assert error.value.code == 'language_quality_failed'


def test_language_screen_preserves_product_names_urls_and_does_not_certify_editorial_quality():
    result = screen_language([
        'OpenAI API padės parengti užklausos juodraštį. Galutinį tekstą reikia patikrinti pagal tikrus verslo faktus.',
        'Šaltinis https://example.com/foreign-training ir kontaktas info@example.com išlieka nepakitę.',
        'Komanda „学校“ nori patikrinti savo darbo eigą.',
        'Pasirinkti pasiūlymą.',
    ], names=['学校'])
    assert result['status'] == 'PASS' and result['editorial_acceptance'] == 'UNVERIFIED'
    assert result['segments'] > 0
