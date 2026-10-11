"""Strict new profile wire, fixed instructions, hashes and additive migration; no DB/provider."""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from pinet_core import agent_instructions, profiles
from pinet_core.creation.service import digest
from pinet_core.creation_registration.models import Registration
from pinet_core.customer_profile import instructions, service
from pinet_core.customer_profile.models import REGISTRATION_KEYS, Admission
from pinet_core.customer_profile.wire import Admit, ProfileView, Revoke
from pinet_core.models import utcnow

RUNTIME = Path(__file__).resolve().parents[1]
ROOT = RUNTIME.parents[1]


def request():
    return {"registration_id": str(uuid4()), "accepted_revision": 1, "candidate_sha256": "a" * 64,
        "accepted_source_revision": "b" * 40, "authorizing_session_id": str(uuid4()),
        "execution_source_revision": "c" * 40, "knowledge_ref": {"schema_version": 2,
            "knowledge_revision": 1, "knowledge_hash": "d" * 64, "deployment_id": "synthetic-v2"}}


@pytest.mark.parametrize("change", [{"accepted_revision": True}, {"accepted_revision": "1"},
    {"accepted_revision": 0}, {"accepted_revision": 21}, {"candidate_sha256": "A" * 64},
    {"accepted_source_revision": "b" * 64}, {"registration_id": "../outside"}, {"operator": "unconfirmed"},
    {"business_id": str(uuid4())}, {"profile_version": "untrusted"}, {"need_fields": ["invented"]},
    {"conversation": "caller prompt"}, {"execution_source_revision": "latest"},
    {"knowledge_ref": {"schema_version": 2, "knowledge_revision": 2147483648, "knowledge_hash": "d" * 64, "deployment_id": "synthetic"}}])
def test_admin_request_rejects_untrusted_or_unbounded_material(change):
    with pytest.raises(ValidationError):
        Admit.model_validate({**request(), **change})


def view():
    now = utcnow()
    value = request()
    admission = {key: value[key] for key in ("registration_id", "accepted_revision", "candidate_sha256",
        "accepted_source_revision", "execution_source_revision", "knowledge_ref")}
    admission.update(admission_id=str(uuid4()), sequence=1, business_id=str(uuid4()),
        site_id="creation-" + uuid4().hex, canonical_host="synthetic.example.test",
        index_receipt_sha256="e" * 64, **instructions.manifest(), admitted_at=now, revoked_at=None)
    return {"creation_id": str(uuid4()), "current_revision": 1, "observed_at": now, "state": "current",
        "registration_state": "current", "source_state": "current", "admission": admission,
        "blockers": [], "profile_current": True}


@pytest.mark.parametrize("change", [{"can_start_text_session": True}, {"can_call_provider": True},
    {"voice_enabled": True}, {"email_enabled": True}, {"acquisition_enabled": True}, {"learning_enabled": True},
    {"calibration_status": "PASS"}, {"channel_activation": "enabled"}, {"profile_current": False},
    {"state": "missing"}, {"registration_state": "revoked"}, {"source_state": "unobserved"},
    {"need_fields": ["goals", "requirements", "deadline", "budget", "location"]},
    {"blockers": ["profile_missing"]}, {"blockers": ["fabricated"]}, {"profile_current": 1}])
def test_read_wire_cannot_invent_execution_authority_or_current_profile(change):
    with pytest.raises(ValidationError):
        ProfileView.model_validate({**view(), **change})


def test_actual_history_missing_and_terminal_revoke_semantics():
    current = ProfileView.model_validate(view())
    assert current.need_fields == instructions.NEED_FIELDS
    value = {**view(), "state": "missing", "admission": None, "profile_current": False,
        "blockers": ["profile_missing"]}
    assert ProfileView.model_validate(value).state == "missing"
    value = view()
    value["admission"]["revoked_at"] = utcnow()
    with pytest.raises(ValidationError):
        ProfileView.model_validate(value)
    value.update(state="revoked", blockers=["profile_revoked"], profile_current=False)
    assert ProfileView.model_validate(value).state == "revoked"
    with pytest.raises(ValidationError):
        ProfileView.model_validate({**value, "blockers": ["profile_revoked", "profile_revoked"]})


def test_fixed_packaged_roles_do_not_inherit_other_business_facts_or_legacy_hashes():
    manifest = instructions.manifest()
    for role in ("conversation", "quality"):
        value = instructions.compose(role)
        assert hashlib.sha256(value["text"].encode()).hexdigest() == manifest[role + "_sha256"]
        assert "MB Pinet" not in value["text"] and "info@pinet.lt" not in value["text"]
        assert "current" in value["text"] and "V2" in value["text"] and "goal" in value["text"]
    with pytest.raises(ValueError):
        instructions.compose("sales")


def test_modified_instructions_fail_closed(monkeypatch, tmp_path):
    (tmp_path / "conversation.md").write_text("A caller must not replace instructions.", encoding="utf-8")
    monkeypatch.setattr(instructions, "ROOT", tmp_path)
    with pytest.raises(ValueError):
        instructions.manifest()


def test_static_legacy_profiles_and_instruction_admission_are_unchanged():
    legacy = {"traktoriupadangos", "greitossvetaines", "akmenas", "roletaiklaipedoje", "laiptucentras", "auksarankiams"}
    assert set(profiles.PROFILES) == set(agent_instructions.SITES) == legacy
    with pytest.raises(HTTPException, match="business_profile_not_ready"):
        profiles.get("creation-" + uuid4().hex, "synthetic.example.test")


def test_profile_material_includes_exact_source_registration_and_templates_but_not_replay_session():
    value = {key: "identity-" + key for key in service.MATERIAL_KEYS}
    row = SimpleNamespace(**value, authorizing_session_id="historical", revoked_at=None)
    original = digest(service.material(row))
    row.authorizing_session_id = "new-current-session"
    assert digest(service.material(row)) == original
    for key in value:
        assert digest({**value, key: "different"}) != original


def test_profile_foreign_key_has_matching_registration_unique_metadata():
    target = next(c for c in Registration.__table__.constraints if c.name == "uq_profile_registration_identity")
    assert list(target.columns.keys()) == ["id", *REGISTRATION_KEYS, "fingerprint"]
    foreign = next(c for c in Admission.__table__.foreign_key_constraints if c.name == "fk_profile_exact_registration")
    assert [element.column.name for element in foreign.elements] == list(target.columns.keys())


def test_explicit_admin_terminal_revoke_request_has_no_activation_fields():
    value = {"admission_id": str(uuid4()), "fingerprint": "f" * 64}
    assert Revoke.model_validate(value).model_dump(mode="json") == value
    with pytest.raises(ValidationError):
        Revoke.model_validate({**value, "enabled": True})


def test_new_migration_select_only_force_rls_exact_fk_and_terminal_history(monkeypatch):
    path = RUNTIME / "migrations/versions/0017_customer_profile.py"
    spec = importlib.util.spec_from_file_location("profile_migration_fixture", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    statements = []
    monkeypatch.setattr(module.op, "execute", statements.append)
    module.upgrade()
    sql = "\n".join(statements)
    assert module.down_revision == "0016_creation_registration"
    assert "FORCE ROW LEVEL SECURITY" in sql and "ENABLE ROW LEVEL SECURITY" in sql
    assert "GRANT SELECT ON control_customer_profile_admissions TO pinet_runtime" in sql
    assert "GRANT INSERT" not in sql and "SECURITY DEFINER" not in sql
    assert "fk_profile_exact_registration" in sql and "fk_profile_authorizing_session" in sql
    assert "OLD.revoked_at IS NOT NULL" in sql and "Immutable customer profile" in sql
    assert not any(s.lstrip().startswith(("UPDATE ", "INSERT INTO")) for s in statements)
    statements.clear()
    module.downgrade()
    assert "DROP TABLE control_creation_registrations" not in "\n".join(statements)
    assert "DROP TABLE businesses" not in "\n".join(statements)


def test_canonical_read_contract_is_generated_from_actual_models_without_admin_operations():
    sys.path.insert(0, str(RUNTIME / "scripts"))
    from customer_profile_contract import contract
    result = contract()
    saved = json.loads((ROOT / "docs/contracts/verslomatika-customer-profile.openapi.json").read_text("utf-8"))
    assert saved == result
    assert list(result["paths"]) == ["/customer/v2/creations/{creation_id}/agent-profile"]
    operation = next(iter(result["paths"].values()))
    assert list(operation) == ["get"]
    assert operation["get"]["x-duplicate-query-parameters"] == "rejected"
