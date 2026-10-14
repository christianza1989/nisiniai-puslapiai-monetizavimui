"""Bounded desktop discovery, actor-specific group comments and immutable local image uploads."""
import hashlib
import re
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

from fastapi import HTTPException
from PIL import Image

from ..models import utcnow
from . import service as fb


def inspect_media(path):
    candidate = Path(path).expanduser()
    root = (fb.ROOT / "agent-business-core/runtime/artifacts").resolve()
    resolved = candidate.resolve()
    if not resolved.is_relative_to(root) or candidate.is_symlink() or not resolved.is_file():
        raise HTTPException(422, "facebook_media_requires_own_private_artifacts_file")
    if not 0 < resolved.stat().st_size <= 10 * 1024 * 1024:
        raise HTTPException(422, "facebook_media_size_invalid")
    try:
        with Image.open(resolved) as asset:
            if asset.format not in {"PNG", "JPEG", "WEBP"} or asset.width * asset.height > 20_000_000:
                raise ValueError("invalid image format or dimensions")
            width, height, fmt = asset.width, asset.height, asset.format
            asset.verify()
    except Exception as error:
        raise HTTPException(422, "facebook_media_image_invalid") from error
    return {"path": str(resolved), "sha256": hashlib.sha256(resolved.read_bytes()).hexdigest(),
            "bytes": resolved.stat().st_size, "width": width, "height": height, "format": fmt}


async def add_media(tx, item, data):
    from .browser_service import enabled
    await enabled(tx)
    payload = {**data.model_dump(), **inspect_media(data.path)}
    return await fb.insert_unique(tx, item, "browser_media", data.key, payload)


async def group_access(tx, item, data):
    from .browser_service import binding_guard
    binding = await fb.record(tx, "browser_binding", data.binding_key)
    await binding_guard(tx, item, binding=binding)
    group = await fb.record(tx, "group", data.group_key)
    if not group or not re.fullmatch(r"/groups/[a-zA-Z0-9_.-]+/?", urlparse(group.payload["url"]).path):
        raise HTTPException(422, "facebook_group_access_requires_registered_group")
    if not utcnow() < data.valid_until <= utcnow() + timedelta(days=1):
        raise HTTPException(422, "facebook_group_access_evidence_requires_current_day")
    return await fb.insert_unique(tx, item, "browser_group_access", data.key,
        {**data.model_dump(mode="json"), "binding_hash": fb.fingerprint(binding.payload),
         "group_hash": fb.fingerprint(group.payload), "group_url": group.payload["url"].rstrip("/")})


async def snapshot(tx, item, command, binding):
    result = {"action": command.get("action", "post"), "target_url": binding["target_url"], "media": None,
              "group_access_hash": None}
    action = result["action"]
    if action == "comment":
        result["target_url"] = command["target_url"]
        if urlparse(command["target_url"]).path.startswith("/groups/"):
            access = await fb.record(tx, "browser_group_access", command["group_access_key"])
            if not access or access.payload["binding_key"] != binding["key"] or not access.payload["comments_allowed"]:
                raise HTTPException(403, "facebook_group_comment_access_unverified")
            proof = access.payload
            group = await fb.record(tx, "group", proof["group_key"])
            if (datetime.fromisoformat(proof["valid_until"]) <= utcnow() or not group
                    or proof["binding_hash"] != fb.fingerprint(binding)
                    or proof["group_hash"] != fb.fingerprint(group.payload)
                    or not command["target_url"].startswith(proof["group_url"] + "/posts/")):
                raise HTTPException(409, "facebook_group_comment_context_changed")
            result["group_access_hash"] = fb.fingerprint(proof)
    elif action == "discover_groups":
        result["target_url"] = "https://www.facebook.com/search/groups/?q=" + quote(command["query"], safe="")
    if command.get("attachment_key"):
        media = await fb.record(tx, "browser_media", command["attachment_key"])
        if not media or inspect_media(media.payload["path"])["sha256"] != media.payload["sha256"]:
            raise HTTPException(409, "facebook_media_changed_requires_new_review")
        result["media"] = media.payload
    return result


async def guard(tx, item, job):
    current = await snapshot(tx, item, job.payload, job.payload["binding"])
    if current != job.payload.get("extension", current):
        raise HTTPException(409, "facebook_action_or_media_context_changed")


def task_projection(job):
    value = job.payload.get("extension", {})
    return {"action": value.get("action", "post"), "target_url": value.get("target_url", job.payload["binding"]["target_url"]),
            "media": value.get("media"), "query": job.payload.get("query", "")}


def comment_receipt(job, data):
    target = urlparse(job.payload["target_url"])
    link = urlparse(data.permalink)
    parent_id = target.path.rstrip("/").rsplit("/", 1)[-1]
    if (data.status == "pending_moderation" and not data.provider_comment_id
            and data.moderation_notice == "facebook_admin_review"
            and target.path.startswith("/groups/") and data.provider_post_id == parent_id
            and data.permalink == job.payload["target_url"]):
        # Facebook can acknowledge first-comment admin review without exposing an ID.
        # This stores known moderation, never visibility or permission to resend.
        return
    if (not data.provider_comment_id or data.provider_post_id != parent_id
            or link.scheme != target.scheme or link.hostname != target.hostname or link.port
            or link.username or link.password or link.fragment
            or link.path.rstrip("/") != target.path.rstrip("/")
            or parse_qs(link.query) != {"comment_id": [data.provider_comment_id]}):
        raise HTTPException(422, "facebook_comment_receipt_requires_exact_parent_and_comment")


async def complete_discovery(tx, item, ident, data):
    from . import browser_service as browser
    job = await browser.owned(tx, item, ident, data)
    command_hash = fb.fingerprint(data.model_dump(mode="json"))
    if job.state == "searched" and job.payload.get("discovery", {}).get("input_hash") == command_hash:
        return fb.view(job)
    if job.state != "claimed" or job.payload.get("action") != "discover_groups":
        raise HTTPException(409, "facebook_discovery_task_not_claimed")
    await browser.binding_guard(tx, item, job=job)
    await fb.fenced_account(tx, job.payload["binding"]["account_key"], job.payload["lease_owner"], data.epoch)
    parsed = urlparse(data.search_url)
    if (parsed.scheme != "https" or parsed.hostname != "www.facebook.com" or parsed.username or parsed.password
            or parsed.port or parsed.fragment or parsed.path.rstrip("/") != "/search/groups"
            or parse_qs(parsed.query).get("q") != [job.payload["query"]]
            or data.actor_id != job.payload["binding"]["actor_id"]
            or data.actor_name != job.payload["binding"]["actor_name"]):
        raise HTTPException(409, "facebook_discovery_actor_or_query_mismatch")
    for group in data.groups:
        if not re.fullmatch(r"/groups/[a-zA-Z0-9_.-]+/?", urlparse(group.url).path):
            raise HTTPException(422, "facebook_discovery_requires_group_root")
        await fb.insert_unique(tx, item, "group", group.key, group.model_dump())
    job.state, job.revision = "searched", job.revision + 1
    job.payload = {**job.payload, "discovery": {"search_url": data.search_url, "input_hash": command_hash,
        "group_keys": [g.key for g in data.groups], "evidence": data.evidence}, "external_sending": False}
    await browser.release(tx, job)
    await tx.flush()
    return fb.view(job)
