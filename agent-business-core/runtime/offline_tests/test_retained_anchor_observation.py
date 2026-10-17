"""Canonical anchor validation over a fresh SQL leaf fake; no DB or native process."""
import copy
from datetime import timedelta
from types import SimpleNamespace as Row
from uuid import uuid4

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import visitors
from sqlalchemy.sql.elements import BinaryExpression, BindParameter

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.creation import private_native_continuity as continuity
from pinet_core.creation import private_preview as service
from pinet_core.creation.models import PrivateIntakeReceipt, PrivateIntakeRequest
from pinet_core.creation.service import digest
from pinet_core.models import utcnow
from pinet_core.site_build.authority_observation import Observation


@pytest.fixture
def anchor(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "environment", "test-anchor-observation")
    monkeypatch.setattr(continuity, "observer_sha256", lambda: "f"*64)
    owner = {key: str(uuid4()) for key in ("user_id", "organization_id", "portfolio_id")}
    owner["environment_id"] = cfg.environment
    creation = Row(id=str(uuid4()), **owner)
    session = Row(id=str(uuid4()), user_id=owner["user_id"], environment_id=cfg.environment)
    proof = {"revision_id": str(uuid4()), "accepted_revision": 1, "candidate_sha256": "1"*64,
        "accepted_source_revision": "a"*40, "coordinator_event_id": str(uuid4()), "coordinator_sha256": "2"*64}
    context = {"version": "creation-private-intake-binding.v1", **owner, "creation_id": creation.id,
        "session_id": session.id, "creation_source_revision": "a"*40, "accepted": proof,
        "source_revision": "a"*40, "native_host": service.private_host(creation.id), "source_context": None,
        "native_sources": {"public_source_revision": "b"*40, "importer_sha256": "3"*64, "network_sha256": "4"*64}}
    request = Row(id=str(uuid4()), created_at=utcnow(), creation_id=creation.id, revision_id=proof["revision_id"],
        accepted_revision=1, session_id=session.id, context=context, context_sha256=digest(context),
        idempotency_key=str(uuid4()), run_id=str(uuid4()), **owner)
    request.request_fingerprint = digest({"creation_id": creation.id, "accepted_revision": 1,
        "candidate_sha256": proof["candidate_sha256"], "idempotency_key": request.idempotency_key})
    intake = {"version": "customer-content-intake.v1", "state": "private-draft-imported", "creationId": creation.id,
        "acceptedRevision": 1, "sourceHash": proof["candidate_sha256"], "canonicalHost": context["native_host"],
        "importerHash": "3"*64, "requestHash": "5"*64, "siteFileHash": "6"*64}
    receipt = Row(id=str(uuid4()), recovery_id=request.id, run_id=request.run_id, state="private_draft_imported",
        failure_code=None, intake=intake, intake_sha256=digest(intake), **owner)
    f = Row(creation=creation, session=session, request=request, receipt=receipt, calls=[], statements=[], cache={},
        requests={request.id: request}, receipts={request.id: receipt}, hidden_requests=set(), hidden_receipts=set())
    f.captured = {**copy.deepcopy(context), "session_id": str(uuid4()), "source_revision": "c"*40}

    def refreshed(model, row, fresh):
        if row is None:
            return None
        key = model, row.id
        if fresh or key not in f.cache:
            f.cache[key] = copy.deepcopy(row)
        return f.cache[key]

    def selected(statement):
        bound = {(part.left.table.name, part.left.name): part.right.value
            for part in visitors.iterate(statement) if isinstance(part, BinaryExpression)
            and isinstance(part.right, BindParameter) and getattr(part.left, "table", None) is not None}
        table = PrivateIntakeRequest.__tablename__
        if (table, "id") in bound:
            row = f.requests.get(bound[table, "id"])
            return None if row is None or row.id in f.hidden_requests else row
        rows = [row for row in f.requests.values() if row.id not in f.hidden_requests
            and row.creation_id == bound[table, "creation_id"] and row.revision_id == bound[table, "revision_id"]
            and "continuity" not in row.context and row.id not in f.hidden_receipts
            and (item := f.receipts.get(row.id)) is not None and item.state == "private_draft_imported"]
        return max(rows, key=lambda row: (row.created_at, row.id)) if rows else None

    class Tx:
        async def get(self, model, identity, **kwargs):
            f.calls.append("get")
            assert model is PrivateIntakeRequest
            row = None if identity in f.hidden_requests else f.requests.get(identity)
            return refreshed(model, row, kwargs.get("populate_existing", False))

        async def scalar(self, statement):
            f.calls.append("scalar")
            f.statements.append(statement)
            model = statement.column_descriptions[0]["entity"]
            if model is PrivateIntakeRequest:
                row = selected(statement)
            else:
                assert model is PrivateIntakeReceipt
                identity = statement.compile().params["recovery_id_1"]
                row = None if identity in f.hidden_receipts else f.receipts.get(identity)
            return refreshed(model, row, statement.get_execution_options().get("populate_existing", False))

        async def execute(self, statement):
            f.calls.append("execute")
            f.statements.append(statement)
            assert [column["entity"] for column in statement.column_descriptions] == [PrivateIntakeRequest, PrivateIntakeReceipt]
            row = selected(statement)
            item = None if row is None or row.id in f.hidden_receipts else f.receipts.get(row.id)
            fresh = statement.get_execution_options().get("populate_existing", False)
            value = None if row is None else (refreshed(PrivateIntakeRequest, row, fresh),
                refreshed(PrivateIntakeReceipt, item, fresh))
            return Row(one_or_none=lambda: value)
    f.tx = Tx()
    return f


async def marker_for(f):
    marker, _ = await service.retained_anchor(f.tx, f.creation, f.captured)
    f.calls.clear()
    f.statements.clear()
    return marker


@pytest.mark.parametrize("upgraded", [False, True])
async def test_marker_anchor_is_one_fresh_joined_read(anchor, upgraded):
    f = anchor
    if upgraded:
        f.captured["native_sources"].update(public_source_revision="d"*40, importer_sha256="7"*64)
    marker = await marker_for(f)
    result, intake = await service.retained_anchor(f.tx, f.creation, f.captured, marker)
    assert result == marker and intake == f.receipt.intake
    assert (result["version"] == continuity.UPGRADE_MARKER_VERSION) is upgraded
    assert len(f.calls) == 1, "One fresh Request+Receipt observation must use one SQL roundtrip"
    sql = str(f.statements[-1].compile(dialect=postgresql.dialect()))
    assert "LEFT OUTER JOIN" in sql
    assert f.statements[-1].get_execution_options()["populate_existing"] is True
    assert [column["entity"] for column in f.statements[-1].column_descriptions] == [PrivateIntakeRequest, PrivateIntakeReceipt]


async def test_no_marker_selection_is_one_read_and_keeps_eligibility_order_limit(anchor):
    f = anchor
    newer = copy.deepcopy(f.request)
    newer.id, newer.created_at = str(uuid4()), f.request.created_at+timedelta(seconds=1)
    f.requests[newer.id] = newer  # An unfinished newer request is not an eligible historical anchor.
    marker, _ = await service.retained_anchor(f.tx, f.creation, f.captured)
    assert marker["recovery_id"] == f.request.id
    assert len(f.calls) == 1
    sql = str(f.statements[-1].compile(dialect=postgresql.dialect()))
    assert " JOIN " in sql and "LEFT OUTER JOIN" not in sql
    assert "ORDER BY" in sql and "created_at DESC" in sql and "id DESC" in sql and "LIMIT" in sql
    assert "continuity" in f.statements[-1].compile().params.values()


@pytest.mark.parametrize("change", ["hidden_request", "missing_request", "hidden_receipt", "missing_receipt"])
async def test_marker_missing_or_rls_hidden_rows_keep_anchor_stale(anchor, change):
    f = anchor
    marker = await marker_for(f)
    if change == "hidden_request":
        f.hidden_requests.add(f.request.id)
    elif change == "missing_request":
        del f.requests[f.request.id]
    elif change == "hidden_receipt":
        f.hidden_receipts.add(f.request.id)
    else:
        del f.receipts[f.request.id]
    with pytest.raises(ControlError) as error:
        await service.retained_anchor(f.tx, f.creation, f.captured, marker)
    assert (error.value.status, error.value.code) == (409, "private_intake_anchor_stale")


@pytest.mark.parametrize("change,status,code", [
    ("request_hash", 503, "invalid_private_intake_source"),
    ("receipt_hash", 503, "invalid_private_intake_source"),
    ("receipt_binding", 503, "invalid_private_intake_source"),
    ("receipt_run", 503, "invalid_private_intake_source"),
    ("receipt_state", 503, "invalid_private_intake_source"),
    ("receipt_id", 409, "private_intake_anchor_stale"),
    ("native_hash", 409, "private_intake_anchor_stale"),
    ("network_hash", 409, "private_intake_anchor_stale"),
])
async def test_fresh_identity_map_observes_corruption_and_preserves_typed_refusal(anchor, change, status, code):
    f = anchor
    marker = await marker_for(f)  # Warm both ORM entities first.
    if change == "request_hash":
        f.request.context_sha256 = "0"*64
    elif change == "receipt_hash":
        f.receipt.intake_sha256 = "0"*64
    elif change == "receipt_binding":
        f.receipt.portfolio_id = str(uuid4())
    elif change == "receipt_run":
        f.receipt.run_id = str(uuid4())
    elif change == "receipt_state":
        f.receipt.state = "not-terminal"
    elif change == "receipt_id":
        f.receipt.id = str(uuid4())
    elif change == "native_hash":
        f.receipt.intake["sourceHash"] = "8"*64
        f.receipt.intake_sha256 = digest(f.receipt.intake)
    else:
        f.captured["native_sources"]["network_sha256"] = "8"*64
    with pytest.raises(ControlError) as error:
        await service.retained_anchor(f.tx, f.creation, f.captured, marker)
    assert (error.value.status, error.value.code) == (status, code)


async def test_no_marker_no_eligible_anchor_is_none(anchor):
    f = anchor
    f.hidden_receipts.add(f.request.id)
    assert await service.retained_anchor(f.tx, f.creation, f.captured) is None


async def test_no_marker_picks_latest_eligible_success_and_ignores_renewed_requests(anchor):
    f = anchor
    eligible = copy.deepcopy(f.request)
    eligible.id, eligible.run_id = str(uuid4()), str(uuid4())
    eligible.created_at += timedelta(seconds=1)
    eligible.idempotency_key = str(uuid4())
    eligible.request_fingerprint = digest({"creation_id": f.creation.id, "accepted_revision": 1,
        "candidate_sha256": eligible.context["accepted"]["candidate_sha256"], "idempotency_key": eligible.idempotency_key})
    receipt = copy.deepcopy(f.receipt)
    receipt.id, receipt.recovery_id, receipt.run_id = str(uuid4()), eligible.id, eligible.run_id
    f.requests[eligible.id], f.receipts[eligible.id] = eligible, receipt
    first, _ = await service.retained_anchor(f.tx, f.creation, f.captured)
    assert first["recovery_id"] == eligible.id
    renewed = copy.deepcopy(eligible)
    renewed.id, renewed.created_at = str(uuid4()), eligible.created_at+timedelta(seconds=1)
    renewed.context["continuity"] = first
    renewed_receipt = copy.deepcopy(receipt)
    renewed_receipt.id, renewed_receipt.recovery_id = str(uuid4()), renewed.id
    f.requests[renewed.id], f.receipts[renewed.id] = renewed, renewed_receipt
    assert (await service.retained_anchor(f.tx, f.creation, f.captured))[0] == first


async def test_marker_does_not_filter_a_failed_receipt_into_missing_parent(anchor):
    f = anchor
    marker = await marker_for(f)
    f.receipt.state, f.receipt.failure_code, f.receipt.intake = "failed", "synthetic_failure", None
    f.receipt.intake_sha256 = digest(None)
    with Observation(f.tx, f.session, f.creation.id) as operation, operation.phase() as phase:
        with pytest.raises(ControlError) as error:
            await service.retained_anchor(f.tx, f.creation, f.captured, marker)
        assert (error.value.status, error.value.code) == (409, "private_intake_anchor_stale")
        assert phase.pins["private_receipt:"+f.request.id] == [f.receipt.id, f.receipt.intake_sha256, "failed"]


async def test_invalid_marker_fails_before_any_sql(anchor):
    f = anchor
    marker = await marker_for(f)
    marker["unexpected"] = True
    with pytest.raises(ControlError):
        await service.retained_anchor(f.tx, f.creation, f.captured, marker)
    assert not f.calls


async def test_anchor_and_receipt_pins_remain_on_each_phase(anchor):
    f = anchor
    marker = await marker_for(f)
    with Observation(f.tx, f.session, f.creation.id) as operation:
        for _ in range(2):
            with operation.phase() as phase:
                await service.retained_anchor(f.tx, f.creation, f.captured, marker)
                assert phase.pins["private_anchor"] == marker
                assert phase.pins["private_receipt:"+f.request.id] == [f.receipt.id, f.receipt.intake_sha256, f.receipt.state]


async def test_terminal_keeps_the_same_receipt_pin(anchor):
    f = anchor
    with Observation(f.tx, f.session, f.creation.id) as operation, operation.phase() as phase:
        await service.terminal(f.tx, f.request)
        assert phase.pins["private_receipt:"+f.request.id] == [f.receipt.id, f.receipt.intake_sha256, f.receipt.state]


async def test_missing_receipt_still_records_none_pin_before_refusal(anchor):
    f = anchor
    marker = await marker_for(f)
    f.hidden_receipts.add(f.request.id)
    with Observation(f.tx, f.session, f.creation.id) as operation, operation.phase() as phase:
        with pytest.raises(ControlError, match="private_intake_anchor_stale"):
            await service.retained_anchor(f.tx, f.creation, f.captured, marker)
        assert phase.pins["private_receipt:"+f.request.id] is None


async def test_later_phase_cannot_reuse_an_old_receipt(anchor):
    f = anchor
    marker = await marker_for(f)
    with Observation(f.tx, f.session, f.creation.id) as operation:
        with operation.phase():
            await service.retained_anchor(f.tx, f.creation, f.captured, marker)
        f.receipt.id = str(uuid4())
        with pytest.raises(ControlError, match="private_intake_anchor_stale"):
            with operation.phase():
                await service.retained_anchor(f.tx, f.creation, f.captured, marker)
