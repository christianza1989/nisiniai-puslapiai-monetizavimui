"""Actual PG/private shared Node intake and authenticated projection; synthetic provider only."""
import json

from sqlalchemy import select
from test_customer_creations import creation as creation_fixture
from test_customer_creations import result, start
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.control.routes import scope
from pinet_core.creation import studio, worker
from pinet_core.creation.models import Job
from pinet_core.tasks.codex_transport import RunnerError

creation = creation_fixture


async def read(c, auth, identity):
    return await c["client"].get("/customer/v2/creations/" + identity + "/content", headers=auth)


async def test_actual_node_intake_and_current_own_revision_projection(creation):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    identity = row["creation_id"]
    response = await read(c, auth, identity)
    assert response.status_code == 200 and response.json()["data"]["state"] == "not_imported"
    assert await worker.execute_once(result, intake_runner=studio.import_draft)
    response = await read(c, auth, identity)
    assert response.status_code == 200, response.text
    assert response.json()["contract_version"] == "content.v1"
    value = response.json()["data"]
    assert value["state"] == "private_draft_imported" and value["current_revision"] == 1
    assert value["observed_at"] and value["observation_scope"] == "intake_snapshot"
    assert len(value["pages"]) == 3 and all(page["state"] == "blocked" for page in value["pages"])
    assert all(page["blocker_count"] and not page["has_approved_revision"] for page in value["pages"])
    assert value["content_plan_state"] == "not_provided" and value["plan"] == []
    assert value["full_f1_status"] == value["launch_status"] == value["scheduling"] == "UNVERIFIED"
    for private in ("dataDir", "outputDir", "manifestPath", "siteFileHash", "artifactsRoot", "runtime/artifacts"):
        assert private not in response.text
    assert (await read(c, auth, identity)).json()["data"] == value
    _, foreign, _ = await verified(c)
    assert (await read(c, foreign, identity)).status_code == 404
    assert (await c["client"].get("/customer/v2/creations/"+identity+"/content")).status_code == 401
    async with scope(user=me["user_id"]) as tx:
        job = await tx.scalar(select(Job).where(Job.creation_id == identity))
        receipt = dict(job.usage)
        receipt["content_intake"] = {**receipt["content_intake"], "sourceHash": "0" * 64}
        job.usage = receipt
    response = await read(c, auth, identity)
    assert response.status_code == 503 and "invalid_content_source" in response.text


async def test_failed_intake_preserves_good_draft_and_explicit_dependency(creation):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    async def failed(*args, **kwargs):
        assert await kwargs["still_authorized"]()
        raise RunnerError("studio_unavailable")
    assert await worker.execute_once(result, intake_runner=failed)
    value = (await read(c, auth, row["creation_id"])).json()["data"]
    assert value["state"] == "intake_failed" and value["failure_code"] == "studio_unavailable"
    assert value["current_revision"] == 1 and value["pages"] == []
    detail = (await c["client"].get("/customer/v2/creations/" + row["creation_id"], headers=auth)).json()["data"]
    assert detail["status"] == "draft_ready"
    files = (await c["client"].get("/customer/v2/creations/"+row["creation_id"]+"/artifacts", headers=auth)).json()["data"]["items"]
    assert len(files) == 3
    assert "manifestPath" not in json.dumps(value)


async def test_revoked_intake_cannot_accept_a_late_revision(creation):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    async def revoked(*args, **kwargs):
        raise RunnerError("authorization_revoked")
    assert await worker.execute_once(result, intake_runner=revoked)
    detail = (await c["client"].get("/customer/v2/creations/"+row["creation_id"], headers=auth)).json()["data"]
    assert detail["status"] == "failed" and detail["current_revision"] is None
    assert detail["failure_code"] == "authorization_revoked"
