"""Known inert contract scenarios; never fresh protected corpus authorship."""
import hashlib
import json
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.acquisition import native_calibration
from pinet_core.acquisition.contracts import Assessment, Campaign, Prospect, Review
from pinet_core.acquisition.dialogue_lab import GRADE_INSTRUCTION
from pinet_core.acquisition.engine import fingerprint, prepare
from pinet_core.acquisition.headless import HeadlessRoles
from pinet_core.acquisition.model_contract import NativePair, PrepareModel, next_role
from pinet_core.config import settings
from pinet_core.tasks.codex import RunnerError


def inputs():
    pair = NativePair(research_authorization_id=uuid4(), research_fingerprint="a"*64,
        email_authorization_id=uuid4(), email_fingerprint="b"*64).model_dump(mode="json")
    campaign = {"site_id": "synthetic-native", "campaign_id": "native-case", "mode": "draft_only", "enabled": True,
        "segments": ["lodging"], "countries": ["NL"], "expires_at": "2031-01-01T00:00:00Z",
        "facts": [{"id": "pilot", "text": "Synthetic requirements clarification only.", "source": "synthetic-owner",
            "expires_at": "2031-01-01T00:00:00Z"}]}
    prospect = {"site_id": "synthetic-native", "organization_key": "synthetic-lodging", "name": "Synthetic lodging",
        "role": "buyer", "segment": "lodging", "country": "NL", "evidence": [{"id": "listing",
            "url": "https://lodging.example.test", "fact": "Synthetic lodging enquiry", "use_allowed": True,
            "checked_at": "2026-01-01T00:00:00Z", "expires_at": "2031-01-01T00:00:00Z"}]}
    value = {"request_id": str(uuid4()), "authorization_id": pair["research_authorization_id"],
        "recipient": "owner@example.test", "campaign": campaign, "prospect": prospect}
    return value, pair


def test_legacy_omitted_fields_and_phase_sequences():
    value, _ = inputs()
    old = PrepareModel.model_validate(value).model_dump(mode="json")
    assert set(old) == {"request_id", "authorization_id", "recipient", "campaign", "prospect"}
    assert next_role([], "researcher") and not next_role([], "writer")
    assert next_role([], "writer", "email") and not next_role([], "researcher", "email")
    assert next_role([], "reply_coordinator", "reply")
    for stage, first in (("research", "researcher"), ("email", "writer"), ("reply", "reply_coordinator")):
        assert next_role([{"role": first, "state": "succeeded"}], "reviewer", stage)
        for state in ("reserved", "failed"):
            assert not next_role([{"role": first, "state": state}], "reviewer", stage)
        assert not next_role([{"role": first, "state": "succeeded"}, {"role": "reviewer", "state": "succeeded"}], first, stage)


@pytest.mark.parametrize("change", ["missing-native", "wrong-primary", "draft-research", "missing-handoff", "same-agents"])
def test_invalid_typed_phase_rejected(change):
    value, pair = inputs()
    value.update(stage="research", native=pair)
    value["campaign"]["mode"] = "research_only"
    if change == "missing-native":
        value.pop("native")
    elif change == "wrong-primary":
        value["authorization_id"] = pair["email_authorization_id"]
    elif change == "draft-research":
        value["campaign"]["mode"] = "draft_only"
    elif change == "missing-handoff":
        value.update(stage="email", authorization_id=pair["email_authorization_id"])
        value["campaign"]["mode"] = "draft_only"
    else:
        pair["email_authorization_id"] = pair["research_authorization_id"]
    with pytest.raises(ValidationError):
        PrepareModel.model_validate(value)


async def test_qualified_writer_uses_existing_engine_without_research_call():
    raw, _ = inputs()
    qualification = Assessment(fit="yes", intent="possible", evidence_ids=["listing"], offer_fact_ids=["pilot"],
        next_action="research", subject="", body="", reasons="Synthetic qualification")
    calls = []
    class Role:
        def __init__(self, role):
            self.role = role
        async def ask(self, schema, instruction, data):
            calls.append(self.role)
            assert "private_persona" not in data and "expected_classifications" not in data
            if self.role == "researcher":
                raise AssertionError("Research must consume its existing native receipt")
            if schema is Review:
                return Review(factual=True, relevant=True, one_clear_next_step=True,
                    no_unverified_promises=True, no_source_instructions=True, reason="Synthetic exact review")
            assert data["qualification"] == qualification.model_dump(mode="json")
            return qualification.model_copy(update={"next_action": "draft", "subject": "Requirements",
                "body": "Would you like to clarify your requirements?"})
    result = await prepare(Campaign.model_validate(raw["campaign"]), Prospect.model_validate(raw["prospect"]),
        HeadlessRoles({key: Role(key) for key in ("researcher", "writer", "reviewer")}, qualification=qualification),
        datetime(2026, 10, 18, tzinfo=UTC))
    assert result["state"] == "draft_ready" and calls == ["writer", "reviewer"]


def known_manifest(tmp_path, monkeypatch):
    raw, pair = inputs()
    cases = [{"id": "known-"+str(n), "split": "train" if n < 3 else "holdout", "archetype": "known-inert",
        "prospect": raw["prospect"], "recipient": raw["recipient"], "persona": "Known synthetic unit scenario "+str(n),
        "expected_classifications": ["question"], "expected_initial": "draft_ready"} for n in range(6)]
    value = {"version": "acquisition-native-calibration.v1", "source_revision": "a"*40, "native": pair,
        "bindings": {"research": {}, "email": {}}, "campaign": raw["campaign"], "cases": cases,
        "corpus_sha256": fingerprint(cases), "evaluator_hash": fingerprint(GRADE_INSTRUCTION)}
    source = tmp_path/"known-source.json"
    source.write_text(json.dumps({"synthetic": True, "now": "2026-10-18T00:00:00Z",
        "campaign": raw["campaign"], "cases": cases}), encoding="utf-8")
    value["protected_source"] = {"path": str(source), "sha256": hashlib.sha256(source.read_bytes()).hexdigest()}
    path = tmp_path/"known-inert.json"
    path.write_text(json.dumps(value), encoding="utf-8")
    monkeypatch.setattr(native_calibration, "ROOT", tmp_path)
    return value, path


@pytest.mark.parametrize("change", ["none", "raw-seal", "split", "renamed-duplicate", "evaluator"])
def test_known_manifest_seals_and_split(tmp_path, monkeypatch, change):
    value, path = known_manifest(tmp_path, monkeypatch)
    original = hashlib.sha256(path.read_bytes()).hexdigest()
    if change == "split":
        value["cases"][3]["split"] = "train"
    elif change == "renamed-duplicate":
        value["cases"][4]["persona"] = value["cases"][3]["persona"]
    elif change == "evaluator":
        value["evaluator_hash"] = "0"*64
    elif change == "raw-seal":
        path.write_text(path.read_text()+" ", encoding="utf-8")
    if change in {"split", "renamed-duplicate", "evaluator"}:
        value["corpus_sha256"] = fingerprint(value["cases"])
        path.write_text(json.dumps(value), encoding="utf-8")
    ref = {"manifest_path": str(path), "manifest_sha256": original if change == "raw-seal" else hashlib.sha256(path.read_bytes()).hexdigest(),
        "case_id": "known-0"}
    if change == "none":
        manifest, selected = native_calibration.manifest(ref)
        assert manifest["corpus_sha256"] == value["corpus_sha256"] and selected.id == "known-0"
    else:
        with pytest.raises(RunnerError):
            native_calibration.manifest(ref)


def test_native_feature_default_off(monkeypatch):
    from pinet_core.acquisition.native_chain import guard
    monkeypatch.setattr(settings(), "acquisition_native_chain_enabled", False)
    with pytest.raises(RunnerError, match="acquisition_native_chain_disabled"):
        guard()


@pytest.mark.parametrize("change", ["exact-native", "foreign-site", "external-recipient"])
def test_native_manifest_keeps_real_site_binding_and_test_only_data(tmp_path, monkeypatch, change):
    from pinet_core.acquisition.dialogue_lab import LabCase, validate_synthetic
    value, path = known_manifest(tmp_path, monkeypatch)
    identity = "creation-"+str(uuid4())
    value["campaign"]["site_id"] = identity
    for case in value["cases"]:
        case["prospect"]["site_id"] = identity
    if change == "foreign-site":
        value["cases"][0]["prospect"] = {**value["cases"][0]["prospect"], "site_id": "foreign-creation"}
    elif change == "external-recipient":
        value["cases"][0]["recipient"] = "owner@example.com"
    value["corpus_sha256"] = fingerprint(value["cases"])
    path.write_text(json.dumps(value), encoding="utf-8")
    ref = {"manifest_path": str(path), "manifest_sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "case_id": "known-0"}
    if change == "exact-native":
        source = tmp_path/"known-source.json"
        source.write_text(json.dumps({"synthetic": True, "now": "2026-10-18T00:00:00Z",
            "campaign": value["campaign"], "cases": value["cases"]}), encoding="utf-8")
        value["protected_source"] = {"path": str(source), "sha256": hashlib.sha256(source.read_bytes()).hexdigest()}
        path.write_text(json.dumps(value), encoding="utf-8")
        ref["manifest_sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
        with pytest.raises(ValueError, match="synthetic_site_required"):
            validate_synthetic(Campaign.model_validate(value["campaign"]), LabCase.model_validate(value["cases"][0]))
        frozen, selected = native_calibration.manifest(ref)
        assert frozen["campaign"]["site_id"] == selected.prospect.site_id == identity
    else:
        with pytest.raises((RunnerError, ValueError)):
            native_calibration.manifest(ref)


@pytest.mark.parametrize("change", ["runtime-campaign-id", "campaign-fact", "protected-raw", "outside-source"])
def test_new_runtime_manifest_preserves_original_protected_source(tmp_path, monkeypatch, change):
    value, path = known_manifest(tmp_path, monkeypatch)
    raw_hash = value["protected_source"]["sha256"]
    if change == "runtime-campaign-id":
        value["campaign"]["campaign_id"] = "explicit-new-experiment"
    elif change == "campaign-fact":
        value["campaign"]["facts"][0]["text"] = "Changed experimental fact"
    elif change == "protected-raw":
        source = tmp_path/"known-source.json"
        source.write_text(source.read_text()+" ", encoding="utf-8")
    else:
        value["protected_source"]["path"] = str(tmp_path.parent/"unowned-source.json")
    path.write_text(json.dumps(value), encoding="utf-8")
    ref = {"manifest_path": str(path), "manifest_sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "case_id": "known-0"}
    if change == "runtime-campaign-id":
        frozen, _ = native_calibration.manifest(ref)
        assert frozen["protected_source"]["sha256"] == raw_hash
        assert frozen["campaign"]["campaign_id"] == "explicit-new-experiment"
    else:
        with pytest.raises(RunnerError):
            native_calibration.manifest(ref)


def test_invalid_protected_payload_never_enters_error_diagnostic(tmp_path, monkeypatch):
    import traceback
    value, path = known_manifest(tmp_path, monkeypatch)
    marker = "known-private-label-must-not-print"
    value["cases"][0]["persona"] = {"invalid_typed_persona": marker}
    value["corpus_sha256"] = fingerprint(value["cases"])
    source = tmp_path/"known-source.json"
    source.write_text(json.dumps({"synthetic": True, "now": "2026-10-18T00:00:00Z",
        "campaign": value["campaign"], "cases": value["cases"]}), encoding="utf-8")
    value["protected_source"]["sha256"] = hashlib.sha256(source.read_bytes()).hexdigest()
    path.write_text(json.dumps(value), encoding="utf-8")
    ref = {"manifest_path": str(path), "manifest_sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "case_id": "known-0"}
    with pytest.raises(RunnerError) as failure:
        native_calibration.manifest(ref)
    assert failure.value.code == "native_manifest_invalid"
    assert marker not in "".join(traceback.format_exception(failure.value))
