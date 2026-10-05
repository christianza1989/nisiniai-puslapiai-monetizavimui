"""Local semantic promotion after actual incumbent/candidate evaluation, never static PASS alone.

The calibrator proposes text; this controller owns eligibility, versioning and rollback.
Live/audio adoption remains off until provider and independent evaluation are available.
"""
import json
import os
from pathlib import Path

from . import agent_instructions, calibration
from .security import digest

ROOT = Path(__file__).resolve().parents[2] / 'artifacts/instruction-releases'
PINNED = {}


def environment_root(environment):
    # Keep Windows version files below MAX_PATH in this workspace. A 128-bit
    # namespace digest remains independent of business identity and PII.
    return ROOT if environment == 'local' else ROOT.parent / 'instruction-envs' / digest(environment)[:32]


def learning_root():
    from .config import settings
    cfg = settings()
    namespace = cfg.learning_namespace or cfg.environment
    if namespace not in {'local', cfg.environment}:
        raise ValueError('learning_namespace_not_authorized')
    return environment_root(namespace)


def selected(site_id):
    from .config import settings
    from .learning_controller import environment_allowed
    if site_id in PINNED:
        return PINNED[site_id]
    cfg = settings()
    if cfg.environment == 'local' or (cfg.learning_enabled and environment_allowed(cfg.environment)):
        return assembled_local(site_id, learning_root())
    return agent_instructions.compose(site_id, 'conversation')


def pin(site_id, value):
    base = agent_instructions.compose(site_id, 'conversation')
    if value['site_id'] != site_id or value['base_hash'] != base.hash:
        raise ValueError('pinned_release_site_or_base_conflict')
    if not value['prompt'].startswith(base.prompt) or digest(value['prompt']) != value['hash']:
        raise ValueError('pinned_release_hash_conflict')
    PINNED[site_id] = agent_instructions.InstructionRelease(value['prompt'], value['hash'], base.sources)


def compare(incumbent, candidate, instruction, scope):
    reasons = []
    before = {row['id']: row for row in incumbent['clients']}
    after = {row['id']: row for row in candidate['clients']}
    if before.keys() != after.keys() or len(before) < 6:
        reasons.append('same_six_case_corpus_required')
    heldout = [key for key in before if before[key]['split'] == 'holdout']
    if len(heldout) < 3 or any(after.get(key, {}).get('split') != before[key]['split'] for key in before):
        reasons.append('heldout_partition_required')
    if (scope not in calibration.CONTRACT['scopes'] or not 10 <= len(instruction) <= 1000 or
            calibration.FORBIDDEN.search(instruction) or '```' in instruction or '\x00' in instruction):
        reasons.append('restricted_patch')
    for report in [incumbent, candidate]:
        if report.get('assistant_engine') != 'codex_cli_local_default' or not report.get('synthetic_core_scope'):
            reasons.append('local_evaluation_provenance_required')
    passes_before = sum(bool(row.get('checks')) and all(row['checks'].values()) for row in before.values())
    passes_after = sum(bool(row.get('checks')) and all(row['checks'].values()) for row in after.values())
    if passes_after != len(after):
        reasons.append('candidate_must_pass_every_case')
    if passes_after <= passes_before:
        reasons.append('no_demonstrated_improvement')
    return {'state': 'rejected' if reasons else 'local_eligible', 'reasons': reasons,
        'incumbent_pass': passes_before, 'candidate_pass': passes_after, 'heldout_cases': len(heldout),
        'instruction_hash': digest(instruction), 'production_eligible': False,
        'audio_evaluation': 'UNVERIFIED', 'human_score_calibration': 'UNVERIFIED'}


def activate_local(site_id, instruction, scope, comparison, parent_hash, root=None):
    base = agent_instructions.compose(site_id, 'conversation')
    if comparison['state'] != 'local_eligible' or comparison['instruction_hash'] != digest(instruction):
        raise ValueError('protected_evaluation_required')
    current = assembled_local(site_id, root)
    if current.hash != parent_hash or scope not in calibration.CONTRACT['scopes']:
        raise ValueError('instruction_parent_conflict')
    directory = (root or ROOT) / site_id
    directory.mkdir(parents=True, exist_ok=True)
    active_path = directory / 'active.json'
    previous = json.loads(active_path.read_text(encoding='utf-8')) if active_path.exists() else None
    instructions = (previous.get('instructions', [previous['instruction']]) if previous and previous.get('active') else [])
    if len(instructions) >= 8 or instruction in instructions:
        raise ValueError('bounded_unique_instruction_versions_required')
    instructions = instructions + [instruction]
    release = {'site_id': site_id, 'scope': scope, 'parent_hash': parent_hash, 'base_hash': base.hash,
        'instructions': instructions, 'instruction': instruction,
        'release_hash': digest(base.prompt + '\n\n' + '\n\n'.join(instructions)),
        'hash': digest(instruction), 'evaluation': comparison, 'active': True, 'local_only': True,
        'previous': previous, 'production_activated': False}
    # Atomic pointer replacement; no model can rewrite core instructions or policy files.
    temp = directory / 'pending.json'
    temp.write_text(json.dumps(release, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(temp, active_path)
    return release


def assembled_local(site_id, root=None):
    base = agent_instructions.compose(site_id, 'conversation')
    path = (root or ROOT) / site_id / 'active.json'
    if not path.is_file():
        return base
    value = json.loads(path.read_text(encoding='utf-8'))
    if not value.get('active') or value.get('base_hash', value['parent_hash']) != base.hash:
        return base
    if (not value.get('local_only') or value['hash'] != digest(value['instruction']) or
            value['evaluation']['state'] != 'local_eligible' or calibration.FORBIDDEN.search(value['instruction'])):
        raise ValueError('invalid_local_instruction_release')
    instructions = value.get('instructions', [value['instruction']])
    if not 1 <= len(instructions) <= 8 or any(not 10 <= len(x) <= 1000 or calibration.FORBIDDEN.search(x) for x in instructions):
        raise ValueError('invalid_local_instruction_stack')
    prompt = base.prompt + '\n\n' + '\n\n'.join(instructions)
    if value.get('release_hash', digest(prompt)) != digest(prompt):
        raise ValueError('invalid_local_release_hash')
    return agent_instructions.InstructionRelease(prompt, digest(prompt),
        base.sources + ((f'adaptive/{site_id}/{value["hash"]}', value['hash']),))


def rollback_local(site_id, root=None):
    if site_id not in agent_instructions.SITES:
        raise ValueError('instruction_profile_unavailable')
    path = (root or ROOT) / site_id / 'active.json'
    value = json.loads(path.read_text(encoding='utf-8'))
    previous = value.get('previous') or {**value, 'active': False}
    temp = path.with_suffix('.pending')
    temp.write_text(json.dumps(previous, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(temp, path)
