import hashlib

import pytest

from pinet_core.creation import adapter, prompt_projection
from pinet_core.creation import execution_profiles as profiles


def test_default_and_structural_repair_policy_are_byte_exact():
    assert adapter.creator_instructions(profiles.DEFAULT) == adapter.instructions()
    assert adapter.creator_instructions(profiles.SOL_HIGH, structure_repair=True) == adapter.instructions(structure_repair=True)
    assert adapter.creator_instructions(profiles.SOL_HIGH, language_repair=True) == adapter.instructions(language_repair=True)


def test_high_initial_role_has_complete_applicable_refs_and_full_snapshot_pin():
    full, old = adapter.instructions()
    value, pin = adapter.creator_instructions(profiles.SOL_HIGH)
    assert len(value.encode()) < len(full.encode()) * .65
    assert prompt_projection.DIRECTIVE in value and pin != old
    for file in prompt_projection.FILES:
        assert file + "\n" + (adapter.ROOT / file).read_text("utf-8-sig") in value
    assert adapter.role_instruction_hash("creator", execution_profile=profiles.SOL_HIGH) == (
        adapter.pipeline_instruction_hash(pin, "creator", execution_profile=profiles.SOL_HIGH))


def test_change_to_omitted_full_reference_still_invalidates_high_instruction_pin():
    files = list(prompt_projection.FILES) + ["SKILLS/operator-only.md"]
    prefix = "same private-draft policy"
    material = prefix + "".join("\n\n" + file + "\ncomplete " + file for file in files)
    first = prompt_projection.project(material, hashlib.sha256(material.encode()).hexdigest(), files)
    altered = material.replace("complete SKILLS/operator-only.md", "changed operator implementation")
    second = prompt_projection.project(altered, hashlib.sha256(altered.encode()).hexdigest(), files)
    assert first[0] == second[0] and first[1] != second[1]


def test_projection_does_not_accept_missing_loaded_source():
    with pytest.raises(ValueError):
        prompt_projection.project("no declared canonical material", "a" * 64, list(prompt_projection.FILES))


def test_paused_mode_keeps_exact_server_owned_footer_and_skips_language_reference(monkeypatch):
    from pinet_core.config import settings
    monkeypatch.setattr(settings(), "creation_language_review_enabled", False)
    monkeypatch.setattr(settings(), "control_mode", "local")
    monkeypatch.setattr(settings(), "environment", "local")
    value, _ = adapter.creator_instructions(profiles.SOL_HIGH)
    assert value.endswith(adapter.language_mode.PAUSED_POLICY)
    assert value.count(adapter.language_mode.PAUSED_POLICY) == 1
    assert adapter.language_patch.LANGUAGE_REFERENCE not in value
    assert adapter.creator_instructions(profiles.DEFAULT) == adapter.instructions()


def test_selected_quality_reference_cannot_silently_disappear():
    files = [file for file in prompt_projection.FILES if not file.endswith("quality-review.md")]
    material = "policy" + "".join("\n\n"+file+"\nfull source" for file in files)
    with pytest.raises(ValueError):
        prompt_projection.project(material, "a"*64, files)
