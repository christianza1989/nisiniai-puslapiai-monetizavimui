from types import SimpleNamespace

import pytest
from sqlalchemy import select
from test_policy import configure

from pinet_core import budget, jobs, text_provider
from pinet_core.config import settings
from pinet_core.contracts import Analysis
from pinet_core.db import db
from pinet_core.models import CostReservation
from pinet_core.service import business


async def test_invalid_model_output_still_records_paid_usage_without_external_call(client, monkeypatch):
    item = await business("traktoriupadangos")
    monkeypatch.setattr(settings(), "global_daily_budget_microusd", 1000000)
    monkeypatch.setattr(settings(), "analysis_cost_ceiling_microusd", 100000)
    assert (await configure(client, enabled=True, daily_budget_microusd=1000000)).status_code == 200
    assert await budget.allow_analysis(item.id, "model:explicit-fixture:1")

    class FakeAio:
        def __init__(self):
            self.models = self

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def generate_content(self, **kwargs):
            config = kwargs["config"]
            assert config.response_schema is None
            assert config.response_json_schema["additionalProperties"] is False
            refs = config.response_json_schema["properties"]["evidence_event_ids"]
            assert refs["items"]["enum"] == ["client-fixture"]
            assert "const" not in refs["items"]
            return SimpleNamespace(text="invalid JSON", usage_metadata=SimpleNamespace(prompt_token_count=1000,
                candidates_token_count=1000, thoughts_token_count=0, total_token_count=2000))
    monkeypatch.setattr(text_provider.genai, "Client", lambda **kwargs: SimpleNamespace(aio=FakeAio()))
    with pytest.raises(ValueError):
        await jobs.model_output(Analysis, "synthetic test only", {"business_id": item.id,
            "evidence": [{"id": "client-fixture", "speaker": "client"}]}, "model:explicit-fixture:1")
    async with db.transaction(item.id, settings().environment) as tx:
        row = await tx.scalar(select(CostReservation).where(CostReservation.action_key == "model:explicit-fixture:1"))
        assert row.observed_microusd == 4500
