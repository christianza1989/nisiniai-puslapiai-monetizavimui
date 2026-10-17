"""Real restricted PostgreSQL; synthetic owner/source fixture, no models or transport."""
import json
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_registration import accepted, creation, provision, registration, session_id  # noqa: F401
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.acquisition import module_admin as admin
from pinet_core.acquisition.module_models import ModuleBinding
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant
from pinet_core.control.routes import ControlError
from pinet_core.creation_registration.models import Registration
from pinet_core.db import db


@pytest.fixture
async def module_pilot(registration, monkeypatch):  # noqa: F811 - maintained imported fixture
    c = registration
    source_request, _, auth, _ = await accepted(c)
    registered = await provision(c, source_request)
    cfg = settings()
    monkeypatch.setattr(cfg, "smtp_enabled", False)
    monkeypatch.setattr(cfg, "voice_enabled", False)
    monkeypatch.setattr(admin, "git_source_observation", lambda root: SimpleNamespace(
        head=cfg.control_source_revision, porcelain=""))
    value = {"registration_id": registered["registration_id"],
        "authorizing_session_id": source_request["authorizing_session_id"],
        "execution_source_revision": cfg.control_source_revision,
        "adapter_id": "synthetic-native", "permissions": ["acquisition.capture", "acquisition.read"],
        "duration_seconds": 60}
    try:
        yield c, registered, value, auth
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(delete(ModuleBinding).where(ModuleBinding.business_id == registered["business_id"],
                ModuleBinding.environment_id == c["environment"]))


async def operation(c, action, request):
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        return await admin.operate(tx, action, request)


async def retained(c, business):
    async with AsyncSession(c["admin"]) as tx:
        return admin.snapshot(await tx.get(ModuleBinding, (business, c["environment"])))


async def test_exact_owner_approval_cas_renew_stop_and_private_receipt(module_pilot, tmp_path):
    import acquisition_module_admin as cli
    c, registered, value, _ = module_pilot
    output = tmp_path / "approval.json"
    first = await cli.execute("approve", value, output)
    before = await retained(c, registered["business_id"])
    assert first["configuration_only"] is True and first["model_dispatch_performed"] is False
    assert first["channel_activation"] == "not_performed" and before["enabled"] is True
    assert (await operation(c, "inspect", {k: value[k] for k in (
        "registration_id", "authorizing_session_id", "execution_source_revision")}))["after"] == before
    assert json.loads((tmp_path / "approval.json.status.json").read_text())["status"] == "committed"
    with pytest.raises(ControlError) as error:
        await operation(c, "approve", value)
    assert error.value.code == "acquisition_module_changed"
    assert await retained(c, registered["business_id"]) == before
    renewed = await operation(c, "approve", value | {"expected_fingerprint": first["fingerprint"]})
    assert renewed["before"] == before and renewed["after"]["expires_at"] > before["expires_at"]
    stop = {k: value[k] for k in ("registration_id", "authorizing_session_id", "execution_source_revision")}
    stopped = await operation(c, "stop", stop | {"expected_fingerprint": renewed["fingerprint"]})
    assert stopped["after"]["enabled"] is False
    assert stopped["after"]["expires_at"] == renewed["after"]["expires_at"]


async def test_runtime_role_cannot_approve_its_own_module(module_pilot):
    _, registered, value, _ = module_pilot
    async with db.registry() as tx:
        with pytest.raises(ValueError, match="Explicit local administrative connection required"):
            await admin.operate(tx, "approve", value)
    async with db.registry() as tx:
        assert await tx.scalar(select(ModuleBinding).where(ModuleBinding.business_id == registered["business_id"])) is None


async def test_foreign_verified_session_cannot_approve(module_pilot):
    c, registered, value, _ = module_pilot
    _, foreign_auth, _ = await verified(c)
    foreign_id = await session_id(c, foreign_auth)
    with pytest.raises(ValueError, match="current_creation_owner_required"):
        await operation(c, "approve", value | {"authorizing_session_id": foreign_id})
    assert await retained(c, registered["business_id"]) is None


@pytest.mark.parametrize("revocation", ["grant", "registration"])
async def test_revoked_authority_does_not_add_module(module_pilot, revocation):
    c, registered, value, _ = module_pilot
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if revocation == "grant":
            await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == registered["business_id"],
                BusinessGrant.environment_id == c["environment"]).values(enabled=False))
        else:
            from pinet_core.models import utcnow
            await tx.execute(update(Registration).where(Registration.id == registered["registration_id"]).values(revoked_at=utcnow()))
    with pytest.raises((ControlError, ValueError)):
        await operation(c, "approve", value)
    assert await retained(c, registered["business_id"]) is None


async def test_source_change_after_pending_insert_rolls_back(module_pilot, monkeypatch):
    c, registered, value, _ = module_pilot
    calls = 0
    def observed(root):
        nonlocal calls
        calls += 1
        return SimpleNamespace(head=value["execution_source_revision"] if calls == 1 else "f" * 40, porcelain="")
    monkeypatch.setattr(admin, "git_source_observation", observed)
    with pytest.raises(ControlError) as error:
        await operation(c, "approve", value)
    assert error.value.code == "acquisition_execution_source_changed"
    assert calls >= 2 and await retained(c, registered["business_id"]) is None


async def test_existing_adapter_cannot_be_silently_rebound(module_pilot):
    c, registered, value, _ = module_pilot
    first = await operation(c, "approve", value)
    with pytest.raises(ControlError) as error:
        await operation(c, "approve", value | {"adapter_id": "other-native", "expected_fingerprint": first["fingerprint"]})
    assert error.value.code == "acquisition_adapter_change_requires_migration"
    assert await retained(c, registered["business_id"]) == first["after"]


@pytest.mark.parametrize("revocation", ["grant", "registration", "native"])
async def test_owner_can_stop_when_upstream_admission_is_unavailable(module_pilot, monkeypatch, revocation):
    c, registered, value, _ = module_pilot
    first = await operation(c, "approve", value)
    if revocation == "native":
        async def unavailable(*args):
            raise ControlError(503, "private_intake_missing")
        monkeypatch.setattr(admin.registrations, "accepted_proof", unavailable)
    else:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            if revocation == "grant":
                await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == registered["business_id"],
                    BusinessGrant.environment_id == c["environment"]).values(enabled=False))
            else:
                from pinet_core.models import utcnow
                await tx.execute(update(Registration).where(Registration.id == registered["registration_id"]).values(revoked_at=utcnow()))
    with pytest.raises((ControlError, ValueError)):
        await operation(c, "approve", value | {"expected_fingerprint": first["fingerprint"]})
    authority = {key: value[key] for key in ("registration_id", "authorizing_session_id", "execution_source_revision")}
    assert (await operation(c, "inspect", authority))["after"] == first["after"]
    monkeypatch.setattr(settings(), "smtp_enabled", True)
    stopped = await operation(c, "stop", authority | {"expected_fingerprint": first["fingerprint"]})
    assert stopped["after"] == first["after"] | {"enabled": False}


@pytest.mark.parametrize("failure", ["prepared", "committed"])
async def test_receipt_write_failure_distinguishes_rollback_from_committed_state(module_pilot, monkeypatch, tmp_path, failure):
    import acquisition_module_admin as cli
    c, registered, value, _ = module_pilot
    original = cli.write_receipt
    def write(handle, status, result=None):
        if status == failure:
            raise OSError("synthetic receipt failure")
        return original(handle, status, result)
    monkeypatch.setattr(cli, "write_receipt", write)
    output = tmp_path / "uncertain.json"
    exception = cli.CommittedReceiptUnavailable if failure == "committed" else OSError
    with pytest.raises(exception):
        await cli.execute("approve", value, output)
    stored = await retained(c, registered["business_id"])
    assert (stored is not None) is (failure == "committed")
    if stored:
        assert stored["enabled"] is True
        assert json.loads(output.read_text())["status"] == "prepared"
    with pytest.raises(ValueError, match="new_private_module_receipt_required"):
        await cli.execute("approve", value, output)


async def test_containment_during_ordinary_revision_does_not_require_idle_creation(module_pilot):
    c, registered, value, auth = module_pilot
    first = await operation(c, "approve", value)
    async with AsyncSession(c["admin"]) as tx:
        registry = await tx.get(Registration, registered["registration_id"])
        creation_id = registry.creation_id
    response = await c["client"].post(f"/customer/v2/creations/{creation_id}/revisions", headers=auth,
        json={"base_revision": 1, "message": "Patikslinkite pasiūlymo ribas.", "idempotency_key": str(uuid4())})
    assert response.status_code == 202, response.text
    with pytest.raises(ValueError, match="creation_revision_pending"):
        await operation(c, "approve", value | {"expected_fingerprint": first["fingerprint"]})
    authority = {key: value[key] for key in ("registration_id", "authorizing_session_id", "execution_source_revision")}
    assert (await operation(c, "inspect", authority))["after"] == first["after"]
    stopped = await operation(c, "stop", authority | {"expected_fingerprint": first["fingerprint"]})
    assert stopped["after"] == first["after"] | {"enabled": False}
