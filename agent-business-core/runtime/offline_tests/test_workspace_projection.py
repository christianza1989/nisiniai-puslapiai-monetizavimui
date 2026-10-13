"""Workspace consumers must distinguish role receipts, reservations and plan approval."""
import json
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pinet_core.business_discovery import routes
from pinet_core.business_discovery.contract import contract
from pinet_core.business_discovery.projection import attempt_state


@pytest.mark.parametrize(
    ("job_status", "receipt", "expected"),
    [
        ("running", {"sequence": 1, "role": "creator", "outcome": "succeeded"}, "succeeded"),
        ("failed", {"sequence": 1, "role": "creator", "outcome": "succeeded"}, "succeeded"),
        ("failed", {"sequence": 1, "role": "creator", "outcome": "failed"}, "failed"),
        ("running", None, "reserved"),
        ("failed", None, "interrupted"),
        ("cancelled", None, "interrupted"),
        ("succeeded", None, "interrupted"),
        ("running", {"sequence": 1, "role": "critic", "outcome": "succeeded"}, "reserved"),
        ("running", {"sequence": 2, "role": "creator", "outcome": "succeeded"}, "reserved"),
        ("failed", {"sequence": True, "role": "creator", "outcome": "succeeded"}, "interrupted"),
        ("failed", {"sequence": 1, "role": "creator", "outcome": "unknown"}, "interrupted"),
    ],
)
async def test_execution_uses_exact_saved_role_outcome_without_leaking_receipt(
    monkeypatch, job_status, receipt, expected
):
    did, jid, aid = str(uuid4()), str(uuid4()), str(uuid4())
    now = datetime.now(UTC)
    private = {"raw_output": "PRIVATE OUTPUT", "trace_path": "PRIVATE PATH", "usage": {"tokens": 12}}
    role_receipt = {**private, **receipt} if receipt else None
    job = SimpleNamespace(
        id=jid, sequence=1, status=job_status, base_revision=0, failure_code=None,
        source_revision="a" * 40, instruction_hash="b" * 64,
        finished_at=None if job_status == "running" else now,
        usage={"roles": [role_receipt] if role_receipt else [], "raw_trace": "PRIVATE TRACE"},
    )
    attempt = SimpleNamespace(
        id=aid, job_id=jid, sequence=1, role="creator", round_number=1,
        model="gpt-6-luna", source_revision="a" * 40,
        instruction_hash="b" * 64, created_at=now,
    )

    class ReadTransaction:
        def __init__(self):
            self.pages = iter([[job], [attempt]])

        async def scalars(self, statement):
            return next(self.pages)

    async def own(tx, session, discovery_id):
        assert discovery_id == did
        return SimpleNamespace(id=did)

    monkeypatch.setattr(routes.service, "owned", own)
    request = SimpleNamespace(state=SimpleNamespace(control_request_id=str(uuid4())))
    result = await routes.execution(did, request, context=(ReadTransaction(), object()))
    projected = result["data"]["attempts"][0]
    assert projected.get("state") == expected
    assert projected["attempt_id"] == aid and projected["job_id"] == jid
    assert result["data"]["jobs"][0]["status"] == job_status
    assert result["data"]["cost_status"] == "UNVERIFIED"
    assert result["data"]["channel_activation"] == "not_performed"
    assert "PRIVATE" not in str(result)


@pytest.mark.parametrize("receipts", [
    [{"sequence": 1, "role": "creator", "outcome": "succeeded"}] * 2,
    [{"sequence": 1, "role": ["creator"], "outcome": "succeeded"}],
    [{"sequence": 1, "role": "creator", "outcome": {"state": "succeeded"}}],
    [{"sequence": "1", "role": "creator", "outcome": "succeeded"}],
    [{"sequence": 1, "role": "creator", "outcome": True}],
    [None], None, "invalid", {"sequence": 1},
])
@pytest.mark.parametrize("status,expected", [("running", "reserved"), ("failed", "interrupted")])
def test_corrupt_or_duplicate_role_receipts_do_not_claim_success(receipts, status, expected):
    job = SimpleNamespace(status=status, usage={"roles": receipts})
    assert attempt_state(job, SimpleNamespace(sequence=1, role="creator")) == expected


def test_workspace_consumer_contract_is_generated_and_strict():
    canonical = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-business-discovery.openapi.json"
    value = contract()
    assert json.loads(canonical.read_text(encoding="utf-8")) == value
    attempt = value["components"]["schemas"]["AttemptView"]
    assert attempt["additionalProperties"] is False
    assert "state" in attempt["required"]
    assert attempt["properties"]["state"]["enum"] == ["reserved", "succeeded", "failed", "interrupted"]
