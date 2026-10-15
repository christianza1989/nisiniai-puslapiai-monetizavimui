"""Opt-in retained dedicated QA: real owner HTTP/RLS/Node, synthetic writer/media.

The integrating owner supplies/migrates the EMPTY QA database. These tests never
create a database and deliberately retain append-only synthetic history/files.
Collection alone does not establish PostgreSQL behavior or serving adoption.
"""
import asyncio
import base64
import copy
import hashlib
import json
import os
import subprocess
from uuid import uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_team import runner
from test_customer_creations import start
from test_customer_public import verified
from test_private_preview_pg import (
    path,
    preview,  # noqa: F401
    snapshot,
)

from pinet_core.config import settings
from pinet_core.control.models import Membership
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation import editorial_preparation, media, private_native_continuity, studio, worker
from pinet_core.creation.models import PrivateIntakeReceipt, PrivateIntakeRequest, Revision
from pinet_core.creation.routes import owned
from pinet_core.creation_registration.service import accepted_proof
from pinet_core.customer_text.service import customer_session

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Requires explicitly supplied EMPTY dedicated PostgreSQL QA and retained synthetic history")


async def prepared(c, monkeypatch):
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me, canonical_host=None)
    cid = row["creation_id"]
    assert await worker.execute_once(creation_id=cid, role_runner=runner([], current_graph=True), intake_runner=studio.import_draft)
    async with AsyncSession(c["admin"]) as tx:
        revision = await tx.scalar(select(Revision).where(Revision.creation_id == cid))
        body = {"accepted_revision": revision.sequence, "candidate_sha256": revision.material_hash, "idempotency_key": str(uuid4())}
    response = await c["client"].post(path(cid), headers=auth, json=body)
    assert response.status_code == 200 and response.json()["data"]["state"] == "private_draft_imported", response.text
    monkeypatch.setattr(media, "source_current", lambda: True)  # explicit synthetic source-current seam, not a production waiver
    node, _, artifacts, environment = studio.configuration()
    directory = artifacts / "customer-content" / cid / "revision-1"
    token = auth["Authorization"].split()[1]
    # Real canonical native GUIDE writer, under the existing current owner locks.
    # No provider, queued GUIDE job, role receipt or approval is fabricated.
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        creation = await owned(tx, session, cid, lock=True)
        proof = await accepted_proof(tx, creation)
        request = editorial_preparation.Status(accepted_revision=1, candidate_sha256=proof["candidate_sha256"], canonical_host=proof["canonical_host"])
        guard = media.native_mutation_guard(tx, session, cid, request)
        await guard(lock=True)

        async def authorized():
            await guard()
            return True

        base = {"creationId": cid, "acceptedRevision": 1, "sourceHash": proof["candidate_sha256"], "canonicalHost": proof["canonical_host"],
                "artifactsRoot": str(artifacts), "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}
        status = await studio._execute([node, studio.ROOT / "content-studio/scripts/customer-content-workflow.mjs"],
            {**base, "command": "status"}, environment, authorized, 20)
        guide = next(p for p in status["pages"] if p["type"] == "guide" and p["path"].startswith("/gidai/"))
        script = studio.ROOT / "content-studio/scripts/customer-content-write.mjs"
        before = await studio._execute([node, script], {**base, "pageId": guide["pageId"], "command": "prepare"}, environment, authorized, 20)
        await studio._execute([node, script], {**base, "pageId": guide["pageId"], "command": "apply",
            "expectedRevisionHash": before["expectedRevisionHash"], "expectedPlanningHash": before["expectedPlanningHash"],
            "expectedContextHash": before["expectedContextHash"], "output": {"title": before["page"]["title"] if "page" in before else guide["title"],
                "description": "Tik atskiro sintetinio PostgreSQL bandymo privatus gidas.", "intent": "Patikrinti native tęstinumą be mokamo modelio.",
                "body": [{"type": "paragraph", "text": "Tai izoliuotas sintetinis native rašytojo bandymas. Jis nėra tikro kliento projektas, profesinė rekomendacija, atlikta redakcinė peržiūra ar viešas svetainės paleidimas."}],
                "factChecks": ["Tik izoliuotas sintetinis QA, ne tikras turinio priėmimas."]}}, environment, authorized, 20)
        await guard()
    # Generate only inert raster test bytes; maintained media.attach performs the real import.
    sharp = (studio.ROOT / "content-studio/node_modules/sharp/lib/index.js").as_uri()
    code = f"import sharp from {json.dumps(sharp)};process.stdout.write((await sharp({{create:{{width:400,height:300,channels:3,background:'#135050'}}}}).png().toBuffer()).toString('base64'));"
    png = base64.b64decode(await asyncio.to_thread(subprocess.check_output,
        [str(node), "--input-type=module", "-e", code], cwd=studio.ROOT, env=environment, text=True))
    inputs = directory / "media-inputs"
    inputs.mkdir(exist_ok=True)
    (inputs / "synthetic-continuity.png").write_bytes(png)
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        creation = await owned(tx, session, cid, lock=True)
        proof = await accepted_proof(tx, creation)
        observed = await editorial_preparation.status(tx, session, cid, request)
        page = next(p for p in observed["completion"]["pages"] if p["page_id"] == guide["pageId"])
        await media.attach(tx, session, cid, media.MediaAttachment(accepted_revision=1,
            candidate_sha256=proof["candidate_sha256"], canonical_host=proof["canonical_host"], page_id=page["page_id"],
            expected_site_sha256=observed["completion"]["site_context_sha256"], expected_revision_sha256=page["revision_sha256"],
            expected_planning_sha256=page["planning_sha256"], source_name="synthetic-continuity.png",
            source_sha256=hashlib.sha256(png).hexdigest(), mime="image/png", alt="Tik sintetinis native tęstinumo QA vaizdas",
            rights="Originalus izoliuotas sintetinis QA rasteris"))
    return cid, auth, body, directory


async def test_real_owner_source_renewal_preserves_evolved_native_case_and_still_requires_s6(preview, monkeypatch):  # noqa: F811
    c = preview
    cid, auth, body, directory = await prepared(c, monkeypatch)
    old = await snapshot(c, cid)
    files = {str(p.relative_to(directory)): p.read_bytes() for p in directory.rglob("*") if p.is_file()}
    async with AsyncSession(c["admin"]) as tx:
        original = await tx.scalar(select(PrivateIntakeReceipt).join(PrivateIntakeRequest,
            PrivateIntakeRequest.id == PrivateIntakeReceipt.recovery_id).where(PrivateIntakeRequest.creation_id == cid))
        old_intake = copy.deepcopy(original.intake)
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    before = await c["client"].get(path(cid), headers=auth)
    assert before.status_code == 200 and before.json()["data"]["state"] == "stale", before.text
    value = {**body, "idempotency_key": str(uuid4())}
    result = await c["client"].post(path(cid), headers=auth, json=value)
    assert result.status_code == 200 and result.json()["data"]["state"] == "private_draft_imported", result.text
    assert result.json()["data"]["latest"]["source_revision"] == "b" * 40
    assert await snapshot(c, cid) == old
    assert {str(p.relative_to(directory)): p.read_bytes() for p in directory.rglob("*") if p.is_file()} == files
    assert (await c["client"].post(path(cid), headers=auth, json=value)).json()["data"] == result.json()["data"]
    assert (await c["client"].post(path(cid), headers=auth, json=body)).status_code == 409
    token = auth["Authorization"].split()[1]
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        creation = await owned(tx, session, cid, lock=True)
        proof = await accepted_proof(tx, creation)
        request = editorial_preparation.Status(accepted_revision=1, candidate_sha256=proof["candidate_sha256"], canonical_host=proof["canonical_host"])
        with pytest.raises(ControlError, match="build_continuation_stale"):
            await editorial_preparation.status(tx, session, cid, request)
    async with AsyncSession(c["admin"]) as tx:
        rows = list(await tx.scalars(select(PrivateIntakeReceipt).join(PrivateIntakeRequest,
            PrivateIntakeRequest.id == PrivateIntakeReceipt.recovery_id).where(PrivateIntakeRequest.creation_id == cid).order_by(PrivateIntakeReceipt.created_at)))
        assert len(rows) == 2 and rows[0].intake == old_intake
        assert rows[1].intake["siteFileHash"] == old_intake["siteFileHash"]
        assert rows[1].intake["nativeContinuity"]["site_sha256"] != old_intake["siteFileHash"]


@pytest.mark.parametrize("artifact", ["source-draft.json", "intake-context.json", "intake-manifest.json"])
async def test_real_tampered_original_artifact_cannot_receive_continuity_receipt(preview, monkeypatch, artifact):  # noqa: F811
    c = preview
    cid, auth, body, directory = await prepared(c, monkeypatch)
    target = directory / artifact
    target.write_bytes(target.read_bytes() + b"\n")
    before = {str(p.relative_to(directory)): p.read_bytes() for p in directory.rglob("*") if p.is_file()}
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    result = await c["client"].post(path(cid), headers=auth, json={**body, "idempotency_key": str(uuid4())})
    assert result.status_code == 200 and result.json()["data"]["state"] == "failed", result.text
    assert {str(p.relative_to(directory)): p.read_bytes() for p in directory.rglob("*") if p.is_file()} == before


async def test_real_owner_revoked_after_read_cannot_commit_current_source_continuity(preview, monkeypatch):  # noqa: F811
    c = preview
    cid, auth, body, _ = await prepared(c, monkeypatch)
    original = private_native_continuity.observe
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)

    async def revoked(**kwargs):
        value = await original(**kwargs)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Membership).where(Membership.user_id == kwargs["context"]["user_id"],
                Membership.environment_id == c["environment"]).values(enabled=False))
        return value

    monkeypatch.setattr(private_native_continuity, "observe", revoked)
    response = await c["client"].post(path(cid), headers=auth, json={**body, "idempotency_key": str(uuid4())})
    assert response.status_code in {401, 404, 409}, response.text
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(PrivateIntakeRequest).where(PrivateIntakeRequest.creation_id == cid)) == 2
        assert await tx.scalar(select(func.count()).select_from(PrivateIntakeReceipt).join(PrivateIntakeRequest,
            PrivateIntakeRequest.id == PrivateIntakeReceipt.recovery_id).where(PrivateIntakeRequest.creation_id == cid)) == 1
