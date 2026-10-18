"""Accepted proof's single fresh intake pass; fake SQL/material, no DB/Node/provider."""
import copy
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pinet_core.control.routes import ControlError
from pinet_core.creation import accepted_material, private_preview, studio
from pinet_core.creation.service import digest
from pinet_core.creation_registration import service


@pytest.fixture
def observation(monkeypatch):
    identity, job_id = str(uuid4()), str(uuid4())
    payload = {"content_plan": [], "synthetic": "isolated protocol fixture"}
    creation = SimpleNamespace(id=identity, current_revision=1, active_job_id=None, updated_at=datetime.now(UTC))
    revision = SimpleNamespace(id=str(uuid4()), sequence=1, job_id=job_id, payload=payload,
        material_hash=digest(payload), source_revision="b"*40)
    job = SimpleNamespace(id=job_id)
    proof = {"revision_id": revision.id, "accepted_revision": 1, "candidate_sha256": revision.material_hash,
        "accepted_source_revision": revision.source_revision, "coordinator_event_id": str(uuid4()), "coordinator_sha256": "c"*64}
    page_id = "page-"+"1"*24
    native_host = private_preview.private_host(identity)
    intake = {"version": "customer-content-intake.v1", "state": "private-draft-imported", "creationId": identity,
        "acceptedRevision": 1, "sourceHash": revision.material_hash, "siteId": service.site_id(identity),
        "canonicalHost": native_host, "fullF1": "UNVERIFIED", "launch": "UNVERIFIED", "deployment": "not-performed",
        "requestHash": "d"*64, "importerHash": "e"*64, "siteFileHash": "f"*64,
        "pageMappings": [{"pageId": page_id, "path": "/"}], "workflow": {"pages": [{"pageId": page_id,
            "title": "Isolated synthetic fixture", "revisionHash": "a"*64, "state": "blocked", "hasApprovedRevision": False,
            "reviewCurrent": False, "blockers": []}]}, "importedAt": datetime.now(UTC).isoformat(),
        "contentPlanState": "not-provided", "planIssues": []}
    state = SimpleNamespace(creation=creation, revision=revision, job=job, proof=proof, native_host=native_host,
        intake=intake, material_calls=0, selected_calls=0, hook=None, failure=None)
    class Transaction:
        async def scalar(self, query):
            assert "control_creation_revisions" in str(query)
            if state.hook:
                hook, state.hook = state.hook, None
                hook()
            return state.revision
        async def get(self, model, identity):
            assert model.__name__ == "Job" and identity == state.revision.job_id
            return state.job
    state.tx = Transaction()
    async def material(tx, parent):
        assert tx is state.tx and parent is creation
        state.material_calls += 1
        return state.revision, state.job, copy.deepcopy(state.proof)
    async def selected(tx, parent, revision, job):
        assert tx is state.tx and parent is creation
        state.selected_calls += 1
        if state.failure:
            raise state.failure
        # Model the private selector's existing current capture/material check.
        await material(tx, parent)
        if revision.id != state.revision.id or revision.sequence != parent.current_revision or job.id != state.job.id:
            return None, None
        return state.native_host, copy.deepcopy(state.intake)
    monkeypatch.setattr(accepted_material, "accepted_material", material)
    monkeypatch.setattr(private_preview, "selected_intake", selected)
    return state


async def test_one_accepted_proof_uses_one_selected_intake_and_keeps_exact_proof_bytes(observation):
    f = observation
    result = await service.accepted_proof(f.tx, f.creation)
    expected = {**f.proof, "site_id": service.site_id(f.creation.id), "canonical_host": f.native_host,
        "intake_sha256": digest(f.intake), "intake_request_sha256": f.intake["requestHash"],
        "intake_importer_sha256": f.intake["importerHash"], "intake_site_file_sha256": f.intake["siteFileHash"]}
    assert result == expected and digest(result) == digest(expected)
    assert f.selected_calls == 1, "The same proof cannot recapture the selected native intake twice"
    assert f.material_calls == 2, "Keep initial material and the selector's own fresh check, remove only the duplicate"


async def test_standalone_projection_stays_fresh_and_keeps_its_public_shape(observation):
    f = observation
    first = await studio.projection(f.tx, f.creation)
    assert f.selected_calls == 1 and first["state"] == "private_draft_imported"
    assert not any(key in first for key in ("intake", "native_host", "proof", "requestHash"))
    f.intake["workflow"]["pages"][0]["title"] = "Changed isolated fixture"
    second = await studio.projection(f.tx, f.creation)
    assert f.selected_calls == 2 and second["pages"][0]["title"] != first["pages"][0]["title"]


async def test_next_accepted_proof_does_not_reuse_a_previous_intake_result(observation):
    f = observation
    first = await service.accepted_proof(f.tx, f.creation)
    f.intake["requestHash"] = "2"*64
    second = await service.accepted_proof(f.tx, f.creation)
    assert first["intake_request_sha256"] != second["intake_request_sha256"]
    assert f.selected_calls == 2 and f.material_calls == 4


@pytest.mark.parametrize("field,value", [("version", "forged"), ("state", "published"), ("creationId", str(uuid4())),
    ("acceptedRevision", 2), ("sourceHash", "0"*64), ("canonicalHost", "foreign.example"),
    ("fullF1", "PASS"), ("launch", "PASS"), ("deployment", "performed")])
async def test_existing_projection_native_source_and_status_checks_keep_typed_refusal(observation, field, value):
    f = observation
    f.hook = lambda: f.intake.update({field: value})
    with pytest.raises(ControlError) as error:
        await service.accepted_proof(f.tx, f.creation)
    assert (error.value.status, error.value.code) == (503, "invalid_content_source")


@pytest.mark.parametrize("change", ["payload", "page_map", "page_hash", "page_state"])
async def test_mutation_after_material_before_intake_validation_cannot_escape_digest_or_workflow_checks(observation, change):
    f = observation
    def mutate():
        if change == "payload":
            f.revision.payload["synthetic"] = "Changed after material check"
        elif change == "page_map":
            f.intake["pageMappings"] = []
        elif change == "page_hash":
            f.intake["workflow"]["pages"][0]["revisionHash"] = "invalid"
        else:
            f.intake["workflow"]["pages"][0]["state"] = "ready"
    f.hook = mutate
    with pytest.raises(ControlError) as error:
        await service.accepted_proof(f.tx, f.creation)
    assert (error.value.status, error.value.code) == (503, "invalid_content_source")


@pytest.mark.parametrize("field", ["requestHash", "importerHash", "siteFileHash", "siteId"])
async def test_accepted_native_identity_and_manifest_checks_remain(observation, field):
    f = observation
    f.hook = lambda: f.intake.update({field: "forged"})
    with pytest.raises(ControlError) as error:
        await service.accepted_proof(f.tx, f.creation)
    assert (error.value.status, error.value.code) == (503, "invalid_registration_source")


@pytest.mark.parametrize("state", [None, "failed"])
async def test_missing_and_failed_native_intake_remain_private_intake_missing(observation, state):
    f = observation
    f.intake = None if state is None else {"state": "failed", "code": "synthetic_failure"}
    with pytest.raises(ControlError) as error:
        await service.accepted_proof(f.tx, f.creation)
    assert (error.value.status, error.value.code) == (409, "private_intake_missing")


@pytest.mark.parametrize("status,code", [(401, "unauthenticated"), (404, "not_found"),
    (409, "private_intake_anchor_stale"), (503, "source_unavailable")])
async def test_fresh_selector_upstream_owner_session_source_failures_are_not_reclassified(observation, status, code):
    f = observation
    f.failure = ControlError(status, code)
    with pytest.raises(ControlError) as error:
        await service.accepted_proof(f.tx, f.creation)
    assert error.value is f.failure


@pytest.mark.parametrize("change", ["revision", "revision_id", "source", "material", "job"])
async def test_material_observation_cannot_silently_rebase_across_the_await(observation, change):
    f = observation
    def mutate():
        if change == "revision":
            f.creation.current_revision = 2
            f.revision = copy.deepcopy(f.revision)
            f.revision.sequence, f.revision.id = 2, str(uuid4())
            f.proof.update(accepted_revision=2, revision_id=f.revision.id)
            f.intake["acceptedRevision"] = 2
        elif change == "revision_id":
            f.revision = copy.deepcopy(f.revision)
            f.revision.id = str(uuid4())
            f.proof["revision_id"] = f.revision.id
        elif change == "source":
            f.revision = copy.deepcopy(f.revision)
            f.revision.source_revision = "3"*40
            f.proof["accepted_source_revision"] = f.revision.source_revision
        elif change == "material":
            f.revision = copy.deepcopy(f.revision)
            f.revision.payload["synthetic"] = "A different accepted candidate"
            f.revision.material_hash = digest(f.revision.payload)
            f.proof["candidate_sha256"] = f.revision.material_hash
            f.intake["sourceHash"] = f.revision.material_hash
        else:
            f.job = SimpleNamespace(id=str(uuid4()))
            f.revision = copy.deepcopy(f.revision)
            f.revision.job_id = f.job.id
    f.hook = mutate
    with pytest.raises(ControlError) as error:
        await service.accepted_proof(f.tx, f.creation)
    assert (error.value.status, error.value.code) == (503, "invalid_registration_source")
