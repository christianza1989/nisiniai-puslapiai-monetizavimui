"""Pure typed boundary/dispatcher/schema checks; not real-model or UI evidence."""

import asyncio
import json
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.acquisition.ledger import LedgerError
from pinet_core.acquisition.task_interfaces import TaskEnvelope
from pinet_core.acquisition.tasks import CaptureHandler
from pinet_core.config import Settings


def test_default_off_with_no_mandatory_ceiling():
    cfg = Settings(_env_file=None)
    assert cfg.acquisition_tasks_enabled is False and cfg.acquisition_tasks_daily_limit == 0
    assert Settings(_env_file=None, acquisition_tasks_daily_limit=1000).acquisition_tasks_daily_limit == 1000


def envelope():
    return {
        "contract_version": "acquisition-tasks.v1",
        "environment": "test",
        "source_revision": "a" * 40,
        "observed_at": "2026-10-12T00:00:00Z",
        "request_id": "request",
        "data": {
            "task_id": str(uuid4()),
            "thread_id": str(uuid4()),
            "business_id": str(uuid4()),
            "sequence": 1,
            "kind": "acquisition.reviewed_capture",
            "status": "queued",
            "message": "Synthetic capture",
            "created_at": "2026-10-12T00:00:00Z",
            "updated_at": "2026-10-12T00:00:00Z",
            "result": None,
            "failure_code": None,
        },
    }


def test_typed_wire_rejects_legacy_kind_and_extra_private_data():
    body = envelope()
    TaskEnvelope.model_validate_json(json.dumps(body))
    body["data"]["kind"] = "chat.consult"
    with pytest.raises(ValidationError):
        TaskEnvelope.model_validate_json(json.dumps(body))
    body = envelope()
    body["data"]["input"] = {"recipient": "synthetic-private@example.test"}
    with pytest.raises(ValidationError):
        TaskEnvelope.model_validate_json(json.dumps(body))


def test_capture_kind_never_invokes_consultation_adapter():
    called = False

    async def forbidden(*args):
        nonlocal called
        called = True
        raise AssertionError("Provider not authorized")

    async def allowed():
        return True

    result, usage = asyncio.run(CaptureHandler().run({"input_sha256": "a" * 64}, allowed, forbidden))
    assert result == {"input_sha256": "a" * 64} and usage == {"model_calls": 0} and not called


def test_capture_kind_denies_failed_heartbeat_before_effect():
    async def denied():
        return False

    with pytest.raises(LedgerError):
        asyncio.run(CaptureHandler().run({"input_sha256": "a" * 64}, denied))
