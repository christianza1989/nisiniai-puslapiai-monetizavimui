"""Strict public/private DTO, safe fingerprints and additive migration behavior; no DB/provider."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.creation.service import digest
from pinet_core.creation_registration import service
from pinet_core.creation_registration.wire import Provision, RegistrationView, Revoke
from pinet_core.models import utcnow


def request():
    return {"creation_id": str(uuid4()), "accepted_revision": 1, "candidate_sha256": "a" * 64,
        "accepted_source_revision": "b" * 40, "authorizing_session_id": str(uuid4())}


@pytest.mark.parametrize("changes", [{"accepted_revision": True}, {"accepted_revision": "1"},
    {"accepted_revision": 0}, {"accepted_revision": 21}, {"candidate_sha256": "A" * 64},
    {"accepted_source_revision": "b" * 64}, {"creation_id": "../elsewhere"},
    {"authorizing_session_id": "expired-looking-token"}, {"canonical_host": "owned.example"},
    {"business_id": str(uuid4())}, {"operator": "fabricated"}])
def test_provision_rejects_untrusted_identity_or_authority_fields(changes):
    with pytest.raises(ValidationError):
        Provision.model_validate({**request(), **changes})


def test_private_provision_and_revoke_are_distinct_exact_requests():
    value = request()
    assert Provision.model_validate(value).model_dump(mode="json") == value
    revoke = {"registration_id": str(uuid4()), "candidate_sha256": "c" * 64}
    assert Revoke.model_validate(revoke).model_dump(mode="json") == revoke
    with pytest.raises(ValidationError):
        Revoke.model_validate({**revoke, "enabled": True})


def view(state="current", pending=False):
    now = utcnow()
    identity = str(uuid4())
    return {"creation_id": identity, "current_revision": 1, "observed_at": now,
        "state": state, "registration": {"registration_id": str(uuid4()), "business_id": str(uuid4()),
            "site_id": service.site_id(identity), "canonical_host": "private.example.test", "accepted_revision": 1,
            "candidate_sha256": "a" * 64, "accepted_source_revision": "b" * 40, "registered_at": now,
            "revoked_at": now if state == "revoked" else None},
        "revision_pending": pending, "binding_current": state == "current" and not pending}


@pytest.mark.parametrize("state", ["current", "revoked", "grant_revoked", "stale", "missing"])
def test_observed_binding_is_never_source_profile_or_channel_admission(state):
    value = view(state)
    if state == "stale":
        value["current_revision"] = 2
    if state == "missing":
        value["registration"] = None
    result = RegistrationView.model_validate(value).model_dump(mode="json")
    assert not result["public_source_admitted"] and not result["profile_admitted"]
    assert result["channel_activation"] == "not_performed" and result["hostname_authority"] == "UNVERIFIED"
    assert result["full_f1_status"] == result["launch_status"] == "UNVERIFIED"


@pytest.mark.parametrize("changes", [{"public_source_admitted": True}, {"profile_admitted": True},
    {"hostname_authority": "PASS"}, {"binding_current": False}, {"channel_activation": "enabled"},
    {"registration": None}, {"state": "stale"}])
def test_wire_rejects_incoherent_readiness_or_fabricated_activation(changes):
    with pytest.raises(ValidationError):
        RegistrationView.model_validate({**view(), **changes})


def test_pending_exact_binding_cannot_pass_current_binding_gate():
    value = view(pending=True)
    assert not RegistrationView.model_validate(value).binding_current
    with pytest.raises(ValidationError):
        RegistrationView.model_validate({**value, "binding_current": True})


def test_server_site_id_and_proof_fingerprint_do_not_depend_on_replay_session():
    identity = str(uuid4())
    creation = SimpleNamespace(id=identity, user_id="owner", organization_id="organization",
        portfolio_id="portfolio", environment_id="test-synthetic")
    proof = {key: key for key in service.PROOF_KEYS}
    proof["site_id"] = service.site_id(identity)
    value = service.material(creation, proof, "business", "grant")
    row = SimpleNamespace(**value, authorizing_session_id="historical-session", created_at=utcnow(), revoked_at=None)
    assert service.stored_material(row) == value
    assert digest(value) == digest(service.stored_material(row))
    original = digest(value)
    for key in value:
        assert digest({**value, key: "other"}) != original
    row.authorizing_session_id = "fresh-current-session"
    assert digest(service.stored_material(row)) == original


def migration():
    path = Path(__file__).resolve().parents[1] / "migrations/versions/0016_creation_registration.py"
    spec = importlib.util.spec_from_file_location("registration_migration_fixture", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_additive_migration_has_select_only_rls_and_immutable_proof_without_source_or_quota_writes(monkeypatch):
    module = migration()
    statements = []
    monkeypatch.setattr(module.op, "execute", statements.append)
    module.upgrade()
    sql = "\n".join(statements)
    assert module.down_revision == "0015_content_work"
    assert "ENABLE ROW LEVEL SECURITY" in sql and "FORCE ROW LEVEL SECURITY" in sql
    assert "GRANT SELECT ON control_creation_registrations TO pinet_runtime" in sql
    assert "GRANT INSERT" not in sql and "SECURITY DEFINER" not in sql
    assert "Immutable registration" in sql and "OLD.revoked_at IS NOT NULL" in sql
    assert "accepted_source_revision" in sql and "authorizing_session_id,user_id,environment_id" in sql
    assert not any(statement.lstrip().startswith(("UPDATE ", "INSERT INTO")) for statement in statements)
    assert "ix_content_revision_binding" not in sql
    statements.clear()
    module.downgrade()
    rollback = "\n".join(statements)
    assert "DROP TABLE control_creation_registrations" in rollback
    assert "DROP TABLE businesses" not in rollback and "DELETE" not in rollback
    assert "DROP CONSTRAINT uq_registration" in rollback
