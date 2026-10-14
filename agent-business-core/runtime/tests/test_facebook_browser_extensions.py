import uuid
from datetime import timedelta

import pytest
from PIL import Image
from test_facebook import SITE, headers
from test_facebook_browser import claim, command, endpoint, observation, setup
from test_facebook_browser import fb_client as shared_client

from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.facebook import service as fb
from pinet_core.models import utcnow
from pinet_core.service import business


@pytest.fixture
async def fb_client(client):
    async for value in shared_client.__wrapped__(client):
        yield value


@pytest.fixture
def media_file():
    path = fb.ROOT / "agent-business-core/runtime/artifacts" / ("fixture-media-" + uuid.uuid4().hex + ".png")
    path.parent.mkdir(exist_ok=True)
    Image.new("RGB", (8, 8), "#214f93").save(path)
    yield path
    path.unlink()


async def add_media(client, path):
    return await client.post(endpoint() + "/media", headers=headers(), json={"key": "qa-media",
        "path": str(path), "alt": "Synthetic small blue image", "provenance": "Deterministic test fixture only"})


async def post(client, **changes):
    return await client.post(endpoint() + "/posts", headers=headers(), json={"key": "extension-job",
        "binding_key": "binding-page", "body": "Synthetic context-aware action, no real Facebook publication.",
        "purpose": "personal", "audience": "public", "review_note": "Codex automatic review under explicit owner mandate.",
        **changes})


async def test_media_fingerprint_and_actual_upload_observation(fb_client, media_file):
    await setup(fb_client)
    media = await add_media(fb_client, media_file)
    assert media.status_code == 200, media.text
    assert (await post(fb_client, attachment_key="qa-media")).status_code == 200
    packet = (await claim(fb_client)).json()
    assert packet["media"]["sha256"] == media.json()["sha256"]
    no_image = await command(fb_client, packet, "submit-permit", {"observation": observation(packet)})
    assert no_image.status_code == 409
    matched = await command(fb_client, packet, "submit-permit", {
        "observation": observation(packet, media_sha256=media.json()["sha256"])})
    assert matched.status_code == 200, matched.text


async def test_media_mutation_blocks_claim_and_outside_path_rejects(fb_client, media_file, tmp_path):
    await setup(fb_client)
    assert (await add_media(fb_client, tmp_path / "secret.env")).status_code == 422
    assert (await add_media(fb_client, media_file)).status_code == 200
    await post(fb_client, attachment_key="qa-media")
    Image.new("RGB", (8, 8), "#ff0000").save(media_file)
    result = (await claim(fb_client)).json()
    assert result["state"] == "blocked"
    assert result["reason"] == "facebook_media_changed_requires_new_review"


async def test_bounded_read_only_discovery_creates_metadata_not_sends(fb_client):
    await setup(fb_client)
    assert (await post(fb_client, action="discover_groups", query="Lineage 2")).status_code == 200
    packet = (await claim(fb_client)).json()
    assert packet["action"] == "discover_groups" and "Lineage%202" in packet["target_url"]
    assert (await command(fb_client, packet, "submit-permit", {"observation": observation(packet)})).status_code == 409
    result = {"actor_id": packet["publisher"]["actor_id"], "actor_name": packet["publisher"]["actor_name"],
        "search_url": packet["target_url"], "evidence": "Synthetic search result inspected, no people or feed collected.",
        "groups": [{"key": "synthetic-lineage-group", "name": "Synthetic Lineage group", "url": "https://www.facebook.com/groups/synthetic-lineage",
                    "rules_url": "https://www.facebook.com/groups/synthetic-lineage/about", "reuse": "unknown"}]}
    response = await command(fb_client, packet, "discovery-result", result)
    assert response.status_code == 200, response.text
    assert response.json()["state"] == "searched" and response.json()["external_sending"] is False
    assert (await command(fb_client, packet, "discovery-result", result)).json()["id"] == response.json()["id"]
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        assert len(await fb.listing(tx, "group")) == 1


async def test_read_only_discovery_does_not_require_public_business_facts(fb_client):
    await setup(fb_client, scope="live")
    result = await post(fb_client, purpose="business", action="discover_groups", query="Lineage 2")
    assert result.status_code == 200, result.text
    assert (await claim(fb_client)).json()["state"] == "claimed"


async def test_comment_requires_correct_actor_group_proof_and_parent_receipt(fb_client):
    await setup(fb_client)
    # A live-shaped contract in isolated ASGI tests performs no browser/network action.
    await fb_client.post(f"/operator/sites/{SITE}/facebook/groups", headers=headers(), json={
        "key": "group-one", "name": "Synthetic group", "url": "https://www.facebook.com/groups/synthetic-lineage",
        "rules_url": "https://www.facebook.com/groups/synthetic-lineage/about", "reuse": "unknown"})
    target = "https://www.facebook.com/groups/synthetic-lineage/posts/123456789"
    missing = await post(fb_client, action="comment", target_url=target, group_access_key="unknown-proof")
    assert missing.status_code == 403
    response = await fb_client.post(endpoint() + "/group-access", headers=headers(), json={
        "key": "page-group-proof", "binding_key": "binding-page", "group_key": "group-one", "comments_allowed": True,
        "valid_until": (utcnow() + timedelta(hours=1)).isoformat(),
        "evidence": "Synthetic actor-specific group rule and comment composer inspection; not actual platform permission."})
    assert response.status_code == 200, response.text
    assert (await post(fb_client, action="comment", target_url=target, group_access_key="page-group-proof")).status_code == 200
    packet = (await claim(fb_client)).json()
    assert packet["target_url"] == target
    wrong_target = await command(fb_client, packet, "submit-permit", {"observation": observation(packet)})
    assert wrong_target.status_code == 409
    obs = observation(packet, target_url=target)
    assert (await command(fb_client, packet, "submit-permit", {"observation": obs})).status_code == 200
    receipt = {"status": "visible", "provider_post_id": "wrong-parent", "provider_comment_id": "987654321",
        "permalink": target + "?comment_id=987654321", "observation": observation(packet, target_url=target),
        "evidence": "Synthetic exact parent/comment receipt boundary test only"}
    assert (await command(fb_client, packet, "receipt", receipt)).status_code == 422
    receipt["provider_post_id"] = "123456789"
    # This binding is a fixture: it still requires an actual fixture post and cannot manufacture visibility.
    assert (await command(fb_client, packet, "receipt", receipt)).status_code == 409


async def test_no_human_approval_state(fb_client):
    await setup(fb_client)
    result = await post(fb_client)
    assert result.json()["state"] == "ready"
    assert "approval" not in result.json()
    assert (await claim(fb_client)).json()["state"] == "claimed"


async def test_live_shaped_comment_receipt_and_group_rule_revision(fb_client):
    await setup(fb_client, scope="live")
    group = {"key": "group-live-shaped", "name": "Synthetic contract group", "url": "https://www.facebook.com/groups/synthetic-contract",
             "rules_url": "https://www.facebook.com/groups/synthetic-contract/about", "reuse": "unknown"}
    await fb_client.post(f"/operator/sites/{SITE}/facebook/groups", headers=headers(), json=group)
    proof = {"key": "qa-proof", "binding_key": "binding-page", "group_key": group["key"], "comments_allowed": True,
             "valid_until": (utcnow()+timedelta(hours=1)).isoformat(),
             "evidence": "Synthetic group rules and Page actor-specific composer proof for contract validation only."}
    assert (await fb_client.post(endpoint()+"/group-access",headers=headers(),json=proof)).status_code == 200
    target = group["url"] + "/posts/123456789"
    await post(fb_client,action="comment",target_url=target,group_access_key=proof["key"])
    packet = (await claim(fb_client)).json()
    assert (await command(fb_client,packet,"submit-permit",{"observation":observation(packet,target_url=target)})).status_code == 200
    receipt = {"status":"visible","provider_post_id":"123456789","provider_comment_id":"987654321",
               "permalink":target+"?comment_id=987654321","observation":observation(packet,target_url=target),
               "evidence":"Synthetic accepted worker receipt; no actual browser or provider request made."}
    assert (await command(fb_client,packet,"receipt",receipt)).json()["state"] == "visible"
    await post(fb_client,key="second-comment",action="comment",target_url=target,group_access_key=proof["key"])
    item = await business(SITE)
    async with db.transaction(item.id,settings().environment) as tx:
        current=await fb.record(tx,"group",group["key"])
        current.payload={**current.payload,"notes":"Group rules changed after review"}
    assert (await claim(fb_client)).json()["state"] == "blocked"


@pytest.mark.parametrize("changes", [{"action": "comment", "target_url": "https://www.facebook.com/groups/x/posts/1"},
    {"action": "comment", "target_url": "https://evil.test/a/posts/1"},
    {"action": "discover_groups", "query": "x"}, {"action": "comment", "target_url": "https://www.facebook.com/a/posts/1", "attachment_key": "img"}])
async def test_invalid_extension_scope(fb_client, changes):
    await setup(fb_client)
    assert (await post(fb_client, **changes)).status_code == 422
