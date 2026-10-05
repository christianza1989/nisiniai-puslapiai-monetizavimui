import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('learning_observation',
    Path(__file__).resolve().parents[1] / 'scripts/learning_observation.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_detects_instruction_edit_and_new_adaptive_pointer_without_mutating_files(tmp_path):
    core = tmp_path / 'src/pinet_core/instructions/core/common.md'
    core.parent.mkdir(parents=True)
    core.write_text('A', encoding='utf-8')
    before = module.snapshot(tmp_path)
    core.write_text('B', encoding='utf-8')
    adaptive = tmp_path / 'artifacts/instruction-releases/akmenas/active.json'
    adaptive.parent.mkdir(parents=True)
    adaptive.write_text('{"active":true}', encoding='utf-8')
    after = module.snapshot(tmp_path)
    assert module.changes(before, after) == ['artifacts/instruction-releases/akmenas/active.json',
        'src/pinet_core/instructions/core/common.md']
    assert core.read_text(encoding='utf-8') == 'B'
    assert module.snapshot(tmp_path) == after


def test_candidate_is_observed_without_treating_static_pass_as_activation():
    row = {'quality': {'outcome':'needs_review','issues':['Missed contact ACK'],'root_cause':'communication'},
        'calibration_artifacts': [
            {'kind':'candidate:c1','payload':{'activated':False,'state':'awaiting_semantic_evaluation'}},
            {'kind':'static_eval:c1','payload':{'status':'PASS','promotion_eligible':False}}]}
    result = module.artifacts(row)
    assert len(result['candidates']) == 1
    assert not result['candidates'][0]['payload']['activated']
    assert not result['static_evaluations'][0]['payload']['promotion_eligible']


def test_short_isolated_namespace_versions_are_observed(tmp_path):
    version = tmp_path / 'artifacts/instruction-envs/isolated/akmenas/versions/patch.md'
    before = module.snapshot(tmp_path)
    version.parent.mkdir(parents=True)
    version.write_text('Learned instruction', encoding='utf-8')
    assert module.changes(before, module.snapshot(tmp_path)) == [str(version.relative_to(tmp_path)).replace('\\', '/')]
