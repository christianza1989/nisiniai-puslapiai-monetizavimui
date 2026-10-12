"""Restricted PostgreSQL/current canonical Node read, provider0 and no mutation."""
import hashlib
import json
from datetime import timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_content_completion_pg import counts
from test_creation_registration import accepted
from test_customer_creations import creation as creation_fixture
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.control.models import Membership
from pinet_core.creation import service as creation_service
from pinet_core.creation import studio
from pinet_core.creation.models import Job
from pinet_core.models import utcnow

creation = creation_fixture


async def fixture(c):
    try:
        request, _, auth, me = await accepted(c)
    except AttributeError:
        async with AsyncSession(c["admin"]) as tx:
            statuses = list((await tx.execute(select(Job.status, Job.failure_code).where(
                Job.environment_id == c["environment"])) ).all())
        raise AssertionError({"fixture_job_states": [tuple(row) for row in statuses]}) from None
    cid = request["creation_id"]
    node, _, artifacts, environment = studio.configuration()
    directory = artifacts / "customer-content" / cid / "revision-1"
    sitefile = next((directory / "data/sites").glob("*.json"))
    site = json.loads(sitefile.read_bytes())
    page = next(page for page in site["pages"] if page["type"] == "home")
    base = {"creationId": cid, "acceptedRevision": 1, "sourceHash": request["candidate_sha256"],
        "canonicalHost": site["canonicalHost"], "artifactsRoot": str(artifacts),
        "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}

    async def authorized():
        return True  # Explicit fixture operator edit, never a HTTP permission substitute.

    async def invoke(command, **fields):
        return await studio._execute([node, "content-studio/scripts/customer-content-workflow.mjs"],
            {**base, "command": command, **fields}, environment, authorized, 20)

    return request, auth, me, page, sitefile, directory, invoke


async def read(c, request, auth, page, **extra):
    return await c["client"].get(f"/customer/v2/creations/{request['creation_id']}/content-pages/{page['id']}",
        headers=auth, params={"accepted_revision": 1, **extra})


async def test_current_saved_page_read_is_owner_scoped_live_and_readonly(creation):
    c = creation
    request, auth, me, page, sitefile, _, invoke = await fixture(c)
    before_counts = await counts(c)
    before = sitefile.read_bytes()
    first = await read(c, request, auth, page)
    assert first.status_code == 200, first.text
    value = first.json()["data"]
    assert first.json()["contract_version"] == "content-page.v1"
    assert value["observation_scope"] == "current_private_page" and value["document"]["body"]
    assert sitefile.read_bytes() == before and await counts(c) == before_counts
    status = await invoke("status")
    meta = next(item for item in status["pages"] if item["pageId"] == page["id"])
    await invoke("amend-page", pageId=page["id"], expectedSiteHash=status["expectedSiteHash"],
        expectedRevisionHash=meta["revisionHash"], expectedPlanningHash=meta["planningHash"],
        patch={"title": "Aktualus išsaugotas testinis pavadinimas"})
    changed = sitefile.read_bytes()
    current = await read(c, request, auth, page)
    assert current.status_code == 200, current.text
    assert current.json()["data"]["document"]["title"] == "Aktualus išsaugotas testinis pavadinimas"
    assert current.json()["data"]["page"]["revision_sha256"] != value["page"]["revision_sha256"]
    assert sitefile.read_bytes() == changed and await counts(c) == before_counts
    _, foreign, _ = await verified(c)
    assert (await read(c, request, foreign, page)).status_code == 404
    assert (await read(c, request, auth, page, accepted_revision=2)).status_code == 409
    assert (await read(c, request, auth, page, unknown="1")).status_code == 400
    path = f"/customer/v2/creations/{request['creation_id']}/content-pages/{page['id']}?accepted_revision=1&accepted_revision=1"
    assert (await c["client"].get(path, headers=auth)).status_code == 400
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Membership).where(Membership.user_id == me["user_id"],
            Membership.environment_id == c["environment"]).values(enabled=False))
    assert (await read(c, request, auth, page)).status_code == 404


async def test_owned_current_media_is_binary_hash_bound_and_refuses_other_page_or_revision(creation, monkeypatch):
    c = creation
    request, auth, me, page, sitefile, directory, invoke = await fixture(c)
    source_dir = directory / "media-inputs"
    source_dir.mkdir()
    node, _, _, environment = studio.configuration()
    script = "import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';const sharp=createRequire(pathToFileURL(process.cwd()+'/content-studio/package.json'))('sharp');await sharp({create:{width:24,height:16,channels:3,background:'#336699'}}).png().toFile(process.argv[1]);console.log('{}');"

    async def authorized():
        return True

    source = source_dir / "read-fixture.png"
    await studio._execute([node, "--input-type=module", "-e", script, source], {}, environment, authorized, 20)
    status = await invoke("status")
    imported = await invoke("import-media", expectedSiteHash=status["expectedSiteHash"], sourcePath=str(source),
        metadata={"mime": "image/png", "alt": "Synthetic fixture", "rights": "Only synthetic test", "prompt": "Private fixture prompt"})
    asset_id = imported["operation"]["result"]["assetId"]
    meta = next(item for item in imported["pages"] if item["pageId"] == page["id"])
    await invoke("amend-page", pageId=page["id"], expectedSiteHash=imported["expectedSiteHash"],
        expectedRevisionHash=meta["revisionHash"], expectedPlanningHash=meta["planningHash"], patch={"media": [{"id": asset_id}]})
    before = sitefile.read_bytes()
    current = await read(c, request, auth, page)
    assert current.status_code == 200, current.text
    view = current.json()["data"]
    asset = view["document"]["media"][0]
    path = f"/customer/v2/creations/{request['creation_id']}/content-pages/{page['id']}/media/{asset_id}"
    params = {"accepted_revision": 1, "expected_revision_sha256": view["page"]["revision_sha256"]}
    image = await c["client"].get(path, headers=auth, params=params)
    assert image.status_code == 200, image.text
    assert image.headers["content-type"] == "image/webp" and image.headers["x-content-type-options"] == "nosniff"
    assert len(image.content) == asset["bytes"] and hashlib.sha256(image.content).hexdigest() == asset["sha256"]
    assert sitefile.read_bytes() == before
    assert (await c["client"].get(path, headers=auth, params={**params, "expected_revision_sha256": "0" * 64})).status_code == 409
    _, foreign, _ = await verified(c)
    assert (await c["client"].get(path, headers=foreign, params=params)).status_code == 404
    other = next(item for item in view["completion"]["pages"] if item["page_id"] != page["id"])
    other_path = path.replace(page["id"], other["page_id"])
    assert (await c["client"].get(other_path, headers=auth, params={**params, "expected_revision_sha256": other["revision_sha256"]})).status_code == 404
    original = studio._execute

    async def expire_after(*args, **kwargs):
        value = await original(*args, **kwargs)
        # Natural expiry may occur while a request holds the Session read lock.
        # Advance the final authority clock rather than deadlocking a DB update
        # against that intentional lock in this synthetic harness.
        monkeypatch.setattr(creation_service, "utcnow", lambda: utcnow() + timedelta(days=1))
        return value

    monkeypatch.setattr(studio, "_execute", expire_after)
    expired = await c["client"].get(path, headers=auth, params=params)
    assert expired.status_code == 401 and expired.content != image.content
    assert expired.headers["cache-control"] == "private, no-store" and sitefile.read_bytes() == before
