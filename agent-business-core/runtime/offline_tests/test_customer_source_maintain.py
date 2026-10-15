"""Private maintenance input rejects authority/activation additions; no database."""
import importlib
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import ValidationError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
try:
    cli = importlib.import_module("customer_source_maintain")
finally:
    sys.path.pop(0)


def value():
    return dict(creation_id=str(uuid4()), accepted_revision=1, candidate_sha256="a" * 64,
        accepted_source_revision="b" * 40, authorizing_session_id=str(uuid4()), public_core="synthetic",
        public_source_revision="c" * 40, sandbox="synthetic", package_sha256="d" * 64, admit_source=False,
        execution_source_revision="e" * 40, profile_admission_id=str(uuid4()), profile_fingerprint="f" * 64,
        expected_refreshed_at="2026-10-11T12:00:00+00:00", request_key=str(uuid4()))


@pytest.mark.parametrize("field", ["business_id", "user_id", "organization_id", "enabled", "can_activate",
    "voice_enabled", "smtp_enabled", "ttl_seconds", "skip_review", "provider", "prompt", "knowledge_ref"])
def test_unknown_authority_and_execution_fields_rejected(field):
    with pytest.raises(ValidationError):
        cli.Request.model_validate({**value(), field: "synthetic"})


@pytest.mark.parametrize("field,invalid", [("expected_refreshed_at", "2026-10-11T12:00:00"),
    ("profile_fingerprint", "bad"), ("execution_source_revision", "bad"), ("request_key", "bad")])
def test_exact_aware_identity_fields_required(field, invalid):
    with pytest.raises(ValidationError):
        cli.Request.model_validate({**value(), field: invalid})


def test_exact_private_request_is_data_only():
    parsed = cli.Request.model_validate(value())
    assert parsed.admit_source is False and parsed.expected_refreshed_at.tzinfo is not None


async def test_unwritable_receipt_parent_never_enters_database_or_projection(tmp_path, monkeypatch):
    monkeypatch.setattr(cli, "create_async_engine", lambda *_: pytest.fail("No database before receipt reservation"))
    with pytest.raises(FileNotFoundError):
        await cli.execute(value(), tmp_path / "missing/receipt.json")


async def test_engine_disposal_failure_after_commit_is_explicit_not_a_failed_transaction(tmp_path, monkeypatch):
    class Engine:
        async def dispose(self):
            raise OSError("Synthetic disposal failure after committed marker")
    class Tx:
        def begin(self):
            return self
        async def __aenter__(self):
            return self
        async def __aexit__(self, *_):
            return False
    async def prepared(*_, **__):
        return {"replayed": False, "provider_calls": 0}
    async def verified(*_, **__):
        return None
    monkeypatch.setattr(cli, "create_async_engine", lambda *_: Engine())
    monkeypatch.setattr(cli, "AsyncSession", lambda *_, **__: Tx())
    monkeypatch.setattr(cli, "maintain", prepared)
    monkeypatch.setattr(cli, "verify", verified)
    with pytest.raises(cli.CommittedReceiptUnavailable):
        await cli.execute(value(), tmp_path / "receipt.json")
    import json
    assert json.loads((tmp_path / "receipt.json").read_text())["status"] == "prepared"
    assert json.loads((tmp_path / "receipt.json.status.json").read_text())["status"] == "committed"
