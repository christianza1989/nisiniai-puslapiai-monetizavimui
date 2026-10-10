import pytest

from pinet_core import jobs
from pinet_core.contracts import Analysis
from pinet_core.evidence_output import bound_schema
from pinet_core.followup_projection import verified_result


def input_data():
    return {"business_id": "explicit-fixture", "test": False, "knowledge_available": True,
        "knowledge": {"deployment_id": "current-release", "knowledge_revision": 1,
            "canonical_host": "traktoriupadangos.lt", "pages": []},
        "evidence": [{"id": "client", "speaker": "client", "text": "Ieškau padangų."}]}


def draft(body="Sveiki. Patikslinkite traktoriaus modelį ir padangos matmenis."):
    return Analysis(summary="Padangų poreikis", requested_next_step="Patikslinti matmenis",
        missing_information=["matmenys"], evidence_event_ids=["client"], subject="Jūsų padangų poreikis", body=body)


@pytest.mark.parametrize("approved,body,eligible", [
    (True, "Sveiki. Patikslinkite traktoriaus modelį ir padangos matmenis.", True),
    (False, "Jūsų užsakymas patvirtintas ir bus pristatytas rytoj.", False),
    (True, "Sveiki. Pirkite konkurento parduotuvėje https://foreign.example/tyre", False),
])
async def test_flash_draft_needs_review_and_source_link_validation(monkeypatch, approved, body, eligible):
    data = input_data()

    async def allow(*_):
        return True

    async def review(schema, instruction, review_data, key):
        assert key == "analysis:fixture:followup-review"
        assert review_data["proposed_email"]["body"] == body
        return bound_schema(schema, data)(approved=approved,
            unsupported_claims=[] if approved else ["invented delivery"], evidence_event_ids=["client"])

    monkeypatch.setattr(jobs.budget, "allow_analysis", allow)
    monkeypatch.setattr(jobs, "model_output", review)
    result = await jobs.review_followup(draft(body), data, "analysis:fixture")
    assert bool(verified_result(data, result)) is eligible


async def test_no_review_budget_keeps_draft_out_of_delivery(monkeypatch):
    async def deny(*_):
        return False

    async def forbidden(*_):
        raise AssertionError("No reviewer may open without reserved budget")

    monkeypatch.setattr(jobs.budget, "allow_analysis", deny)
    monkeypatch.setattr(jobs, "model_output", forbidden)
    data = input_data()
    result = await jobs.review_followup(draft(), data, "analysis:fixture")
    assert not result["followup_review"]["approved"] and verified_result(data, result) is None
