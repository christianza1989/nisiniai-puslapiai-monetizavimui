"""Strict client contract and corrupted immutable continuation detection."""
import json
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest
from pinet_core.site_build.continuation import fingerprint, stored
from pinet_core.site_build.continuation_contract import document
from pinet_core.site_build.continuation_wire import Resume


@pytest.mark.parametrize("change", [{"accepted_revision": True}, {"accepted_revision": "1"},
    {"accepted_revision": 0}, {"accepted_revision": 21}, {"source_revision": "a"*40},
    {"session_id": str(uuid4())}, {"origin": "http://127.0.0.1:8905"}, {"idempotency_key": "invalid"}])
def test_resume_rejects_caller_authority_source_and_invalid_revision(change):
    with pytest.raises(ValidationError):
        Resume.model_validate_json(json.dumps({"accepted_revision": 1, "idempotency_key": str(uuid4()), **change}))


def test_contract_matches_committed_schema():
    source = Path(__file__).resolve().parents[2]/"contracts/site-continuation.schema.json"
    assert json.loads(source.read_text(encoding="utf-8")) == document()


def test_retained_context_mutation_and_parent_binding_are_rejected():
    owner = {k: str(uuid4()) for k in ("user_id", "organization_id", "portfolio_id")}
    owner["environment_id"] = "test-continuation"
    identity = {k: str(uuid4()) for k in ("creation_id", "approval_id", "session_id", "revision_id")}
    value = {"version": "native-build-continuation.v1", **owner,
        **{k: v for k, v in identity.items() if k != "revision_id"},
        "accepted": {"revision_id": identity["revision_id"], "accepted_revision": 1}}
    request = Resume(accepted_revision=1, idempotency_key=str(uuid4()))
    row = SimpleNamespace(**owner, **identity, accepted_revision=1, context=value, context_sha256=digest(value),
        idempotency_key=str(request.idempotency_key), request_fingerprint=fingerprint(identity["creation_id"], request))
    assert stored(row) == value
    row.context = {**value, "session_id": str(uuid4())}
    with pytest.raises(ControlError) as failure:
        stored(row)
    assert failure.value.code == "invalid_build_continuation"
    row.context, row.portfolio_id = value, str(uuid4())
    with pytest.raises(ControlError):
        stored(row)
    row.portfolio_id, row.request_fingerprint = owner["portfolio_id"], "f"*64
    with pytest.raises(ControlError):
        stored(row)
