"""Synthetic same-origin identity checks; history never establishes authority."""
import copy
from uuid import uuid4

import pytest
from test_private_native_continuity import continuity, forbidden, imported  # noqa: F401
from test_private_preview import recovery, request  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.creation import private_preview as private
from pinet_core.creation.service import digest
from pinet_core.creation_registration import service


@pytest.fixture
async def lineage(continuity):  # noqa: F811
    s = continuity
    await imported(s)
    s.pins.update(public_source_revision="0"*40, importer_sha256="1"*64)
    await private.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=s.reader)
    settings().control_source_revision = "d"*40
    await private.prepare("token", s.creation.id, request(s), intake_runner=forbidden, continuity_runner=s.reader)
    return s


def resolve(s, historical):
    return service.same_origin_intake(s.creation, s.requests[2], s.receipts[2],
        s.requests[0], s.receipts[0], *historical)


@pytest.mark.parametrize("index", [0, 1])
async def test_identity_is_the_exact_full_original_or_prior_continuity_receipt(lineage, index):
    s = lineage
    original = copy.deepcopy([(row.context, receipt.intake) for row, receipt in zip(s.requests, s.receipts, strict=True)])
    intake = resolve(s, (s.requests[index], s.receipts[index]))
    assert intake == s.receipts[index].intake
    assert digest(intake) == s.receipts[index].intake_sha256 != s.receipts[2].intake_sha256
    assert [(row.context, receipt.intake) for row, receipt in zip(s.requests, s.receipts, strict=True)] == original
    if index:
        assert "nativeContinuity" in intake  # Never strip a dictionary to fabricate a stable digest.


@pytest.mark.parametrize("change", ["owner", "accepted", "unknown_context", "origin_receipt",
    "origin_context", "origin_manifest", "origin_source", "origin_native_sources", "authority",
    "unknown_note", "missing_note", "request_hash", "site_hash", "replayed", "receipt_hash"])
async def test_self_consistent_but_foreign_or_changed_history_is_not_the_registration_identity(lineage, change):
    s = lineage
    historical, receipt = copy.deepcopy((s.requests[1], s.receipts[1]))
    context, intake = historical.context, receipt.intake
    if change == "owner":
        historical.user_id = context["user_id"] = str(uuid4())
        receipt.user_id = historical.user_id
    elif change == "accepted":
        context["accepted"]["candidate_sha256"] = "f"*64
    elif change == "unknown_context":
        context["unrecognized"] = "different immutable context"
    elif change.startswith("origin_"):
        key = {"origin_receipt": "receipt_id", "origin_context": "context_sha256",
            "origin_manifest": "manifest_sha256", "origin_source": "origin_source_revision",
            "origin_native_sources": "origin_native_sources"}[change]
        context["continuity"][key] = str(uuid4()) if key == "receipt_id" else "f"*40 if key == "origin_source_revision" \
            else {**context["continuity"][key], "public_source_revision": "f"*40} if key == "origin_native_sources" else "f"*64
        intake["nativeContinuity"]["anchor"] = copy.deepcopy(context["continuity"])
        intake["nativeContinuity"]["manifest_sha256"] = context["continuity"]["manifest_sha256"]
    elif change == "authority":
        intake["nativeContinuity"]["approval"] = "performed"
    elif change == "unknown_note":
        intake["nativeContinuity"]["unrecognized"] = True
    elif change == "missing_note":
        intake.pop("nativeContinuity")
    elif change == "request_hash":
        intake["requestHash"] = intake["nativeContinuity"]["intake_context_sha256"] = "f"*64
    elif change == "site_hash":
        intake["siteFileHash"] = "f"*64
    elif change == "replayed":
        intake["replayed"] = False
    historical.context_sha256 = digest(context)
    receipt.intake_sha256 = "f"*64 if change == "receipt_hash" else digest(intake)
    with pytest.raises((ControlError, ValueError, KeyError)):
        resolve(s, (historical, receipt))


async def test_lookalike_original_without_its_exact_origin_row_and_receipt_is_refused(lineage):
    s = lineage
    row, receipt = copy.deepcopy((s.requests[0], s.receipts[0]))
    row.id = receipt.recovery_id = str(uuid4())
    receipt.id = str(uuid4())
    with pytest.raises(ValueError, match="origin_changed"):
        resolve(s, (row, receipt))


async def test_historical_identity_does_not_make_a_stale_source_or_revoked_session_current(lineage):
    s = lineage
    assert resolve(s, (s.requests[1], s.receipts[1])) == s.receipts[1].intake
    settings().control_source_revision = "e"*40
    assert not await private.current(s.tx, s.creation, s.requests[2])
    settings().control_source_revision = "d"*40
    s.revoked = True
    assert not await private.current(s.tx, s.creation, s.requests[2])
