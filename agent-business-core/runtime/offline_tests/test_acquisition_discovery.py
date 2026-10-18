"""Finite discovery to canonical public evidence, not inferred contact rights."""

import json
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.acquisition.discovery import DiscoveryPlan, discover


def plan():
    now = datetime.now(UTC)
    return {
        "site_id": "sample-business",
        "campaign_id": "market-de",
        "run_id": str(uuid4()),
        "execution_source_revision": "a" * 40,
        "treg_organization": "sample-team",
        "approved_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=1)).isoformat(),
        "queries": [
            {"id": "lodging", "text": "holiday accommodation operator", "country": "DE", "language": "de"}
        ],
        "excluded_hosts": ["directory.example.com"],
        "maximum_query_cost_micro": 1000,
        "maximum_primary_reads": 2,
    }


@pytest.mark.asyncio
async def test_local_exclusions_and_original_source_receipts_do_not_imply_contactability(tmp_path):
    calls = []

    async def search(query, identity, ceiling):
        calls.append((query, identity, ceiling))
        return {
            "status": 200,
            "call_id": "known-search",
            "cost_micro": 500,
            "results": [
                {"url": u, "title": "Accommodation", "snippet": "A search snippet is not verified geography"}
                for u in (
                    "https://directory.example.com/one",
                    "https://lodging.example.com/",
                    "https://lodging.example.com/contact",
                    "https://another.example.com/",
                )
            ],
        }

    async def reader(site, sources, max_calls):
        assert site == "sample-business" and max_calls == 2 and len(sources) == 2
        assert all(s["read_allowed"] is True for s in sources)
        return [
            {
                "status": "retrieved",
                "source_id": s["id"],
                "url": s["url"],
                "visible_text": "Source explicitly describes an accommodation business.",
            }
            for s in sources
        ]

    result = await discover(plan(), tmp_path / "batch", search, reader=reader)
    assert result["search_calls"] == 1 and result["primary_reads"] == 2 and result["cost_micro"] == 500
    assert result["qualified_prospects"] == result["contactable_prospects"] == result["crm_imported"] == 0
    assert result["external_sent"] is False
    assert len(calls) == 1
    evidence = json.loads((tmp_path / "batch/evidence.private.json").read_bytes())
    assert evidence["verified_country"] is None and evidence["contactable_prospects"] == []
    with pytest.raises(FileExistsError):
        await discover(plan(), tmp_path / "batch", search, reader=reader)
    assert len(calls) == 1


@pytest.mark.parametrize("amount", [None, True, 1001])
@pytest.mark.asyncio
async def test_unknown_or_excess_charge_stops_and_retains_attempt_before_next_query(tmp_path, amount):
    value = plan()
    value["queries"] *= 2
    value["queries"][1] = {**value["queries"][1], "id": "second", "text": "other operators"}
    calls = []

    async def search(*args):
        calls.append(args)
        return {"status": 200, "call_id": "known", "cost_micro": amount, "results": []}

    with pytest.raises(ValueError, match="discovery_charge_unknown_or_above_ceiling"):
        await discover(value, tmp_path / "batch", search)
    assert len(calls) == 1 and (tmp_path / "batch/lodging.intent.private.json").is_file()
    stopped = json.loads((tmp_path / "batch/stopped.safe.json").read_bytes())
    assert stopped["state"] == "STOPPED_NO_RETRY" and stopped["completed_calls"] == 1
    assert stopped["known_cost_micro"] == (1001 if amount == 1001 else 0)


@pytest.mark.parametrize("mutation", ["expired", "duplicate", "traversal", "too_many"])
@pytest.mark.asyncio
async def test_invalid_admission_makes_no_directory_or_call(tmp_path, mutation):
    value = plan()
    if mutation == "expired":
        value["approved_at"] = (datetime.now(UTC) - timedelta(hours=2)).isoformat()
        value["expires_at"] = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
    elif mutation == "duplicate":
        value["queries"] *= 2
    elif mutation == "traversal":
        value["queries"][0]["id"] = "../foreign"
    else:
        value["maximum_primary_reads"] = 21

    async def search(*args):
        raise AssertionError("must not call")

    with pytest.raises((ValidationError, ValueError)):
        await discover(value, tmp_path / "batch", search)
    assert not (tmp_path / "batch").exists()


def test_plan_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        DiscoveryPlan.model_validate(plan() | {"send_allowed": True})
