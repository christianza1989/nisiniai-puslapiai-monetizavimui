"""Inert source receipt/typed boundary tests; no public or model calls."""

import hashlib
import json
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from acquisition_evidence_fixtures import evidence_request
from pydantic import ValidationError
from test_acquisition_agent_roles import assessment, role_request

from pinet_core.acquisition import evidence_admission, evidence_schema, native_calibration
from pinet_core.acquisition.agent_role_contract import RoleRequest, parse_request
from pinet_core.acquisition.agent_role_handler import instruction, validate_output
from pinet_core.acquisition.agent_role_projection import business_context
from pinet_core.acquisition.evidence_contract import VERSION, EvidenceRequest
from pinet_core.tasks.codex import RunnerError


@pytest.fixture
def evidence(tmp_path, monkeypatch):
    monkeypatch.setattr(native_calibration, "ROOT", tmp_path)
    return evidence_request(tmp_path / "receipt", role_request("research"))


def test_recipientless_request_is_separate_from_unchanged_synthetic_contract(evidence):
    with pytest.raises(ValidationError):
        RoleRequest.model_validate(evidence)
    value = parse_request(evidence)
    assert isinstance(value, EvidenceRequest) and value.native is None
    assert not {"recipient", "mail", "calibration"} & value.model_dump().keys()
    assert evidence_admission.packet(value).execution_source_revision == "b" * 40
    evidence_admission.time_current(value, datetime.now(UTC))
    assert instruction(value)


@pytest.mark.parametrize(
    "field,value",
    [
        ("recipient", "real@example.org"),
        ("mail", None),
        ("calibration", None),
        ("contact_verified", True),
        ("provider_allowed", True),
        ("role", "writer"),
        ("role", "reply"),
    ],
)
def test_recipient_contact_and_escalation_fields_are_not_nullable_extensions(evidence, field, value):
    with pytest.raises(ValidationError):
        parse_request(evidence | {field: value})


@pytest.mark.parametrize(
    "change",
    [
        "bytes",
        "quote",
        "offset",
        "hash",
        "future",
        "stale",
        "unavailable",
        "snippet",
        "foreign",
        "malformed",
        "malformed-row",
    ],
)
def test_changed_or_unusable_primary_receipt_never_becomes_research_evidence(evidence, change):
    value = deepcopy(evidence)
    ref = value["prospect"]["evidence"][0]
    if change == "bytes":
        from pathlib import Path

        (Path(value["evidence"]["directory"]) / "evidence.private.json").write_bytes(b"{}")
    elif change == "quote":
        ref["text"] = "x" * len(ref["text"])
    elif change == "offset":
        ref["start"] += 1
        ref["end"] += 1
    elif change == "hash":
        ref["visible_text_sha256"] = "0" * 64
    elif change == "future":
        value["evidence"]["approved_at"] = (datetime.now(UTC) + timedelta(minutes=1)).isoformat()
    elif change == "stale":
        value["evidence"]["approved_at"] = (datetime.now(UTC) - timedelta(hours=2)).isoformat()
        value["evidence"]["expires_at"] = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
    else:
        from pathlib import Path

        path = Path(value["evidence"]["directory"]) / "evidence.private.json"
        packet = json.loads(path.read_bytes())
        if change == "unavailable":
            packet["sources"][0]["status"] = "unavailable"
        elif change == "snippet":
            packet["sources"] = []
        elif change == "malformed":
            packet["sources"][0]["visible_text"] = {"unexpected": "object"}
        elif change == "malformed-row":
            packet["search_rows"] = ["unexpected row"]
        else:
            packet["sources"][0]["site_id"] = "foreign"
        raw = json.dumps(packet).encode()
        path.write_bytes(raw)
        value["evidence"]["packet_sha256"] = hashlib.sha256(raw).hexdigest()
    parsed = EvidenceRequest.model_validate(value)
    with pytest.raises(RunnerError):
        evidence_admission.packet(parsed)
        evidence_admission.time_current(parsed, datetime.now(UTC))


def test_untrusted_text_and_requested_geography_are_projected_without_promoting_rights(evidence):
    value = parse_request(evidence)
    data = business_context(value, parents=[])
    assert data["candidate"]["verified_country"] is None
    assert data["candidate"]["requested_country"] == "DE"
    assert data["candidate"]["evidence"][0]["text"] == value.prospect.evidence[0].text
    assert "recipient" not in data and "prospect" not in data
    result = assessment(evidence_ids=["primary-one"])
    assert validate_output(value, result, {}).fit == "yes"
    for changed in (
        result | {"evidence_ids": ["invented"]},
        result | {"next_action": "draft", "body": "Send now"},
        result | {"offer_fact_ids": [value.campaign.facts[0].id]},
    ):
        with pytest.raises(RunnerError):
            validate_output(value, changed, {})


def test_old_retrieval_is_not_renewed_by_fresh_admission_or_excerpt_expiry(evidence):
    from pathlib import Path

    directory = Path(evidence["evidence"]["directory"])
    old = datetime.now(UTC) - timedelta(days=2)
    evidence["prospect"]["evidence"][0]["checked_at"] = old.isoformat()
    for key, file in (("plan", "plan.private.json"), ("packet", "evidence.private.json")):
        path = directory / file
        material = json.loads(path.read_bytes())
        if key == "plan":
            material.update(
                approved_at=(old - timedelta(minutes=5)).isoformat(),
                expires_at=(old + timedelta(minutes=5)).isoformat(),
            )
        else:
            material["sources"][0]["checked_at"] = old.isoformat()
        raw = json.dumps(material).encode()
        path.write_bytes(raw)
        evidence["evidence"][key + "_sha256"] = hashlib.sha256(raw).hexdigest()
    value = parse_request(evidence)
    evidence_admission.packet(value)  # Historical provenance can be exact.
    with pytest.raises(RunnerError, match="research_evidence_not_current"):
        evidence_admission.time_current(value, datetime.now(UTC))
    assert evidence_admission.deadline(value, datetime.now(UTC) + timedelta(days=1)) <= old + timedelta(
        days=1
    )


def test_requested_market_must_be_within_campaign_without_becoming_verified_geography(evidence):
    evidence["campaign"]["countries"] = ["PL"]
    with pytest.raises(ValidationError):
        parse_request(evidence)


@pytest.mark.parametrize("directory", ["relative/path", "C:/outside/packet", "//foreign-host/share/packet"])
def test_foreign_paths_are_refused_before_any_file_read(evidence, monkeypatch, directory):
    def never(*args, **kwargs):
        pytest.fail("Foreign paths must not reach filesystem observation")

    monkeypatch.setattr(evidence_admission, "sealed_private_json", never)
    evidence["evidence"]["directory"] = directory
    with pytest.raises(RunnerError, match="research_private_directory_required"):
        evidence_admission.packet(parse_request(evidence))


def test_actual_directory_reparse_or_symlink_is_not_a_receipt_custody_path(evidence, tmp_path):
    import os
    from pathlib import Path

    target = Path(evidence["evidence"]["directory"])
    link = tmp_path / "receipt-link"
    if os.name == "nt":
        import _winapi

        _winapi.CreateJunction(str(target), str(link))
    else:
        link.symlink_to(target, target_is_directory=True)
    evidence["evidence"]["directory"] = str(link)
    with pytest.raises(RunnerError, match="private_native_manifest_required"):
        evidence_admission.packet(parse_request(evidence))


def test_qualification_requires_research_parent_and_cannot_make_it_draft_eligible(evidence):
    parent = {"role": "research", "task_id": str(uuid4()), "run_id": str(uuid4()), "output_sha256": "a" * 64}
    evidence.update(
        role="qualification",
        authorization_id=evidence["team"]["qualification"]["authorization_id"],
        parents=[parent],
    )
    value = parse_request(evidence)
    output = {
        "fit": "yes",
        "intent": "possible",
        "eligible_for_draft": False,
        "evidence_ids": ["primary-one"],
        "reason": "Only a source-backed research finding.",
    }
    assert validate_output(value, output, {}).eligible_for_draft is False
    with pytest.raises(RunnerError):
        validate_output(
            value, output | {"eligible_for_draft": True}, {"parents": [{"output": {"fit": "yes"}}]}
        )


def test_sql_extension_is_additive_and_rejects_unknown_predecessor():
    from pinet_core.acquisition.agent_role_schema import input_current_sql

    old = input_current_sql()
    new = evidence_schema.extend(old)
    assert VERSION in new and "b.input->>'version' IS DISTINCT FROM j->>'version'" in new
    branch = f"IF j->>'version'='{VERSION}' THEN RETURN public.acquisition_evidence_role_input_current(j,aid);END IF;\n      "
    restored = (
        new.replace(branch, "")
        .replace("\n          OR b.input->>'version' IS DISTINCT FROM j->>'version'", "")
        .replace(evidence_schema.LEGACY_VERSION_GUARD, "")
    )
    assert restored.replace("CREATE OR REPLACE FUNCTION", "CREATE FUNCTION", 1) == old
    with pytest.raises(RuntimeError):
        evidence_schema.extend(new)
