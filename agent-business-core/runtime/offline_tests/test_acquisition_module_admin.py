from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.acquisition import module_admin as admin
from pinet_core.config import settings
from pinet_core.control.routes import ControlError


def request():
    return {"registration_id": str(uuid4()), "authorizing_session_id": str(uuid4()),
        "execution_source_revision": "a" * 40, "adapter_id": "synthetic-native",
        "permissions": ["acquisition.capture", "acquisition.read"], "duration_seconds": 60}


@pytest.mark.parametrize("change", [{"permissions": ["mail.send"]}, {"duration_seconds": True},
    {"duration_seconds": 0}, {"duration_seconds": 3601}, {"expected_fingerprint": "guess"},
    {"business_id": str(uuid4())}, {"enabled": True}, {"provider": "anything"}])
def test_operator_wire_cannot_supply_tenant_execution_or_unbounded_approval(change):
    with pytest.raises(ValidationError):
        admin.Approve.model_validate(request() | change)


@pytest.mark.asyncio
async def test_exact_execution_source_rejects_dirty_changed_and_wrong_config(monkeypatch):
    value = admin.Approve.model_validate(request())
    monkeypatch.setattr(settings(), "control_source_revision", "a" * 40)
    monkeypatch.setattr(admin, "git_source_observation", lambda root: SimpleNamespace(head="a" * 40, porcelain=""))
    await admin.execution_current(value)
    for head, dirty in [("a" * 40, " M source.py"), ("b" * 40, "")]:
        monkeypatch.setattr(admin, "git_source_observation", lambda root: SimpleNamespace(head=head, porcelain=dirty))
        with pytest.raises(ControlError):
            await admin.execution_current(value)
    monkeypatch.setattr(admin, "git_source_observation", lambda root: SimpleNamespace(head="a" * 40, porcelain=""))
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    with pytest.raises(ControlError):
        await admin.execution_current(value)


@pytest.mark.asyncio
async def test_receipt_refuses_existing_path_before_any_database(monkeypatch, tmp_path):
    import acquisition_module_admin as cli
    target = tmp_path / "retained.json"
    target.write_text("retained uncertain operation")
    monkeypatch.setattr(cli, "create_async_engine", lambda *a, **k: pytest.fail("DB must not open"))
    with pytest.raises(ValueError, match="new_private_module_receipt_required"):
        await cli.execute("approve", request(), target)
    assert target.read_text() == "retained uncertain operation"


@pytest.mark.asyncio
async def test_duplicate_permission_refused_before_authority(monkeypatch):
    value = request() | {"permissions": ["acquisition.capture", "acquisition.capture"]}
    async def unavailable(*args):
        pytest.fail("No authority or DB access needed for malformed input")
    monkeypatch.setattr(admin, "authority", unavailable)
    with pytest.raises(ValueError, match="duplicate_module_permission"):
        await admin.operate(None, "approve", value)
