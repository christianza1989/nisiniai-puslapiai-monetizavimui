"""Frozen synthetic provenance checks; no DB, provider, new corpus or criteria."""
import hashlib
import json
from copy import deepcopy
from types import SimpleNamespace

import pytest
from pydantic import ValidationError
from test_customer_quality import event, row, saved_task

from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest
from pinet_core.customer_agents import evaluator, lab, protection, quality
from pinet_core.customer_text.wire import Start


def bound():
    value = row()
    task = saved_task(value)
    messages = ["Synthetic original request"]
    task["script_sha256"] = digest(messages)
    snapshot = {k: v for k, v in task.items() if k not in {"episode_id", "script_sha256"}}
    proof = dict(version=protection.VERSION, manifest_sha256="a" * 64, corpus_sha256="b" * 64,
        case_id="privacy", split="holdout", script_sha256=digest(messages),
        message_sha256=[digest(m) for m in messages], snapshot_sha256=digest(snapshot),
        parent_hash=quality.parent(value), evaluator_sha256="c" * 64,
        execution_source_revision=snapshot["execution_source_revision"])
    value.payload["protected_case"] = proof
    original = event(2, protection.VERSION, protection.EVENT_KEY, {"proof": deepcopy(proof), "sha256": digest(proof)})
    return value, original, snapshot, messages


def test_proof_is_separate_from_historical_binding_episode_and_parent():
    value, original, _, _ = bound()
    before = quality.parent(value)
    assert protection.retained(value, [original])["split"] == "holdout"
    value.payload["protected_case"]["split"] = "train"
    assert quality.parent(value) == before
    assert "protected_case" not in lab.Snapshot.model_fields and "protected_case" not in lab.Episode.model_fields
    assert "protected_case" not in Start.model_fields


@pytest.mark.parametrize("change", ["removed", "split", "manifest", "script", "snapshot", "parent", "evaluator", "event", "late"])
def test_missing_or_changed_marker_never_reclassifies_original_case(change):
    value, original, _, _ = bound()
    if change == "removed":
        del value.payload["protected_case"]
    elif change == "event":
        original.payload["sha256"] = "0" * 64
    elif change == "late":
        original.sequence = 4
    else:
        field = {"split": "split", "manifest": "manifest_sha256", "script": "script_sha256",
            "snapshot": "snapshot_sha256", "parent": "parent_hash", "evaluator": "evaluator_sha256"}[change]
        value.payload["protected_case"][field] = "train" if change == "split" else "0" * 64
    client = event(3, "client_transcript", "client:wrong", {"text": "Synthetic original request"})
    with pytest.raises(ValueError):
        protection.retained(value, [original, client])


def test_unprotected_history_keeps_original_parent_and_is_not_reclassified():
    value = row()
    parent = quality.parent(value)
    assert protection.retained(value, []) is None
    assert quality.parent(value) == parent and "protected_case" not in value.payload


def fixture_manifest(tmp_path, monkeypatch):
    _, _, snapshot, messages = bound()
    cases = [{"case_id": "case" + str(i), "split": "train" if i < 3 else "holdout",
        "archetype": "synthetic" + str(i), "messages": messages if i == 3 else ["Synthetic " + str(i)]}
        for i in range(6)]
    value = dict(contract="private_customer_archetype_baseline.v1", source_revision=snapshot["execution_source_revision"],
        snapshot=snapshot, snapshot_sha256=digest(snapshot), evaluator_sha256="c" * 64, model_profile={"fixed": True},
        customer_model="gpt-6-luna", cases=cases, corpus_sha256=digest(cases), split={"train": 3, "holdout": 3})
    monkeypatch.setattr(protection, "ROOT", tmp_path)
    monkeypatch.setattr(protection.evaluation_contract, "fingerprint", lambda: "c" * 64)
    monkeypatch.setattr(evaluator, "profile", lambda: {"fixed": True})
    path = tmp_path / "manifest.private.json"
    path.write_text(json.dumps(value), encoding="utf-8")
    ref = dict(manifest_path=str(path), manifest_sha256=hashlib.sha256(path.read_bytes()).hexdigest(), case_id="case3")
    return path, value, ref, snapshot, messages


def test_existing_manifest_is_read_exactly_without_relabeling_or_model_input(tmp_path, monkeypatch):
    path, _, ref, snapshot, messages = fixture_manifest(tmp_path, monkeypatch)
    before = path.read_bytes()
    proof = protection.freeze(ref, snapshot, messages)
    assert proof["split"] == "holdout" and proof["script_sha256"] == digest(messages)
    assert "messages" not in proof and "snapshot" not in proof and "archetype" not in proof
    assert path.read_bytes() == before


@pytest.mark.parametrize("change", ["bytes", "script", "snapshot", "source", "evaluator", "model", "corpus", "split", "duplicate", "case"])
def test_frozen_manifest_conflicts_are_rejected_before_start(tmp_path, monkeypatch, change):
    path, manifest, ref, snapshot, messages = fixture_manifest(tmp_path, monkeypatch)
    if change == "script":
        messages = ["Different request"]
    elif change == "snapshot":
        snapshot = {**snapshot, "session_id": "00000000-0000-0000-0000-000000000001"}
    elif change == "case":
        ref["case_id"] = "absent"
    else:
        if change == "bytes":
            path.write_text(json.dumps(manifest) + " ", encoding="utf-8")
        else:
            if change == "source":
                manifest["source_revision"] = "0" * 40
            elif change == "evaluator":
                manifest["evaluator_sha256"] = "0" * 64
            elif change == "model":
                manifest["model_profile"] = {"changed": True}
            elif change == "corpus":
                manifest["corpus_sha256"] = "0" * 64
            elif change == "split":
                manifest["split"]["holdout"] = 0
            else:
                manifest["cases"][1]["case_id"] = manifest["cases"][0]["case_id"]
                manifest["corpus_sha256"] = digest(manifest["cases"])
            path.write_text(json.dumps(manifest), encoding="utf-8")
            ref["manifest_sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
    with pytest.raises(ControlError):
        protection.freeze(ref, snapshot, messages)


def test_private_manifest_boundary_and_no_late_split_argument(tmp_path, monkeypatch):
    path, _, ref, snapshot, messages = fixture_manifest(tmp_path, monkeypatch)
    monkeypatch.setattr(protection, "ROOT", tmp_path / "different")
    with pytest.raises(ControlError, match="private_protected_manifest_required"):
        protection.freeze(ref, snapshot, messages)
    with pytest.raises(ValidationError):
        protection.Reference(**ref, split="train")
    assert protection.ROOT != path.parent


def test_cross_split_duplicate_script_cannot_be_frozen_as_unseen(tmp_path, monkeypatch):
    path, manifest, ref, snapshot, messages = fixture_manifest(tmp_path, monkeypatch)
    manifest["cases"][0]["messages"] = messages
    manifest["corpus_sha256"] = digest(manifest["cases"])
    path.write_text(json.dumps(manifest), encoding="utf-8")
    ref["manifest_sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
    with pytest.raises(ControlError, match="protected_manifest_conflict"):
        protection.freeze(ref, snapshot, messages)


def test_explicit_spaced_digest_preserves_existing_frozen_corpus(tmp_path, monkeypatch):
    path, manifest, ref, snapshot, messages = fixture_manifest(tmp_path, monkeypatch)
    manifest["cases"][4]["archetype"] = "Synthetic français"
    manifest["corpus_digest_scheme"] = "json-sorted-utf8-spaced.v1"
    manifest["corpus_sha256"] = hashlib.sha256(json.dumps(
        manifest["cases"], sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    path.write_text(json.dumps(manifest), encoding="utf-8")
    before = path.read_bytes()
    ref["manifest_sha256"] = hashlib.sha256(before).hexdigest()
    proof = protection.freeze(ref, snapshot, messages)
    assert proof["corpus_sha256"] == manifest["corpus_sha256"] != digest(manifest["cases"])
    assert proof["split"] == "holdout" and path.read_bytes() == before


@pytest.mark.parametrize("scheme", ["unknown", "json-sorted-utf8-spaced.v1", None])
def test_declared_digest_scheme_never_accepts_wrong_or_unknown_hash(tmp_path, monkeypatch, scheme):
    path, manifest, ref, snapshot, messages = fixture_manifest(tmp_path, monkeypatch)
    manifest["corpus_digest_scheme"] = scheme
    if scheme is None:
        manifest["corpus_sha256"] = "0" * 64
    path.write_text(json.dumps(manifest), encoding="utf-8")
    ref["manifest_sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
    with pytest.raises(ControlError, match="protected_manifest_conflict"):
        protection.freeze(ref, snapshot, messages)


async def test_holdout_tuning_gate_does_not_depend_on_model_root_cause(monkeypatch):
    async def observe(*_):
        return {"split": "holdout"}
    monkeypatch.setattr(protection, "observe", observe)
    assert await protection.tuning_allowed(SimpleNamespace(), SimpleNamespace()) is False
