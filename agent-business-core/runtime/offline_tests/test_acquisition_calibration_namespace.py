"""One admitted synthetic namespace; immutable corpus and ordinary identities."""
from copy import deepcopy
from uuid import uuid4

import pytest
from pydantic import ValidationError
from test_acquisition_native_chain import inputs

from pinet_core.acquisition.agent_role_calibration import isolated_runtime_scope
from pinet_core.acquisition.agent_role_contract import RoleCalibration
from pinet_core.acquisition.contracts import Campaign, Prospect
from pinet_core.acquisition.dialogue_lab import LabCase


def reference():
    return {"manifest_path": "private-known-not-read.json", "manifest_sha256": "a"*64, "case_id": "known-one"}


def test_optional_namespace_is_explicit_and_legacy_serialization_stays_identical():
    assert RoleCalibration.model_validate(reference()).model_dump(mode="json") == reference()
    namespace = str(uuid4())
    assert RoleCalibration.model_validate(reference() | {"recipient_namespace": namespace}).model_dump(mode="json")["recipient_namespace"] == namespace
    with pytest.raises(ValidationError):
        RoleCalibration.model_validate(reference() | {"recipient_namespace": "random-domain.example"})


def test_runtime_only_identity_projection_preserves_original_corpus_and_need():
    data, _ = inputs()
    campaign = Campaign.model_validate(data["campaign"])
    case = LabCase(id="known-ns", split="train", prospect=Prospect.model_validate(data["prospect"]),
        recipient=data["recipient"], persona="A known customer corrects one quantity.",
        expected_initial="draft_ready", expected_classifications=["question"])
    frozen = {"campaign": campaign.model_dump(mode="json"), "cases": [case.model_dump(mode="json")],
              "corpus_sha256": "a"*64, "evaluator_hash": "b"*64}
    original = deepcopy(frozen)
    namespace = uuid4()
    scoped, scoped_case = isolated_runtime_scope(frozen, case, namespace)
    assert scoped["campaign"]["campaign_id"] != campaign.campaign_id and scoped_case.recipient != case.recipient
    assert scoped_case.recipient.endswith(".test")
    assert {k:v for k,v in scoped["campaign"].items() if k != "campaign_id"} == {
        k:v for k,v in original["campaign"].items() if k != "campaign_id"}
    assert scoped_case.model_dump(exclude={"recipient"}) == case.model_dump(exclude={"recipient"})
    assert frozen == original and scoped["cases"] == original["cases"]
    assert isolated_runtime_scope(frozen, case, namespace) == (scoped, scoped_case)
    assert isolated_runtime_scope(frozen, case, uuid4())[1].recipient != scoped_case.recipient
    assert isolated_runtime_scope(frozen, case, None) == (frozen, case)
