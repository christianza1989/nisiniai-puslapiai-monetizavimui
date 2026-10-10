"""Measured audio-case contact and Flash draft evidence. Never sends mail or enables voice."""
import argparse
import asyncio
import hashlib
import hmac
import json
import re
import sys
import time
from pathlib import Path
from uuid import uuid4

import httpx
from pydantic import ValidationError
from sqlalchemy import select

from pinet_core import budget, jobs, knowledge, service
from pinet_core.config import settings
from pinet_core.contracts import Analysis, Knowledge, Quality
from pinet_core.db import db
from pinet_core.models import Conversation, Outbox
from pinet_core.profiles import PROFILES
from pinet_core.security import digest, edge_signature

ROOT = Path("artifacts/tractor-voice")


async def probe(cid, email, preview_url, site='traktoriupadangos'):
    cfg = settings()
    if not cfg.m0_probe_enabled or cfg.voice_enabled or cfg.smtp_enabled:
        raise ValueError("private_probe_requires_public_voice_and_smtp_off")
    from urllib.parse import urlsplit
    target = urlsplit(preview_url)
    if (target.scheme != 'http' or target.hostname != '127.0.0.1' or target.username or target.password
            or target.path or target.query or target.fragment or not target.port or not 1024 <= target.port <= 65535):
        raise ValueError("only_owned_loopback_preview_allowed")
    if site not in PROFILES or site not in cfg.voice_sites:
        raise ValueError('site_not_admitted_for_probe')
    item = await service.business(site)
    async with db.transaction(item.id, cfg.environment) as tx:
        convo = await tx.get(Conversation, cid)
        if not convo or not convo.payload["test"] or not convo.payload.get("m0_probe") or convo.state != "finalized":
            raise ValueError("only_finalized_private_audio_probe_allowed")
        token = hmac.new(cfg.worker_secret.encode(),
            f"{item.id}:{cfg.environment}:{convo.payload['start_request_id']}".encode(), hashlib.sha256).hexdigest()
    async with httpx.AsyncClient(timeout=10) as client:
        # Read the actual public projection, not a second Python publishing filter.
        stamp, nonce, path = str(int(time.time())), str(uuid4()), "/pokalbis/manifestas"
        canonical = "\n".join([stamp, nonce, "GET", path, item.site_id, digest("")])
        response = await client.get(preview_url + path, headers={"Host": item.canonical_host,
            "x-pinet-timestamp": stamp, "x-pinet-nonce": nonce,
            "x-pinet-signature": hmac.new(cfg.edge_secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()})
        response.raise_for_status()
        manifest = Knowledge.model_validate_json(response.content)
        async with db.transaction(item.id, cfg.environment) as tx:
            await knowledge.register(tx, item, manifest)
        path = f"/v1/sites/{item.site_id}/sessions/{cid}/contact"
        body = json.dumps({"channel": "email", "value": email, "consent": True,
            "notice_version": "private-audio-acceptance-v1", "purpose": "followup"}).encode()
        stamp, nonce = str(int(time.time())), str(uuid4())
        response = await client.post(cfg.core_url + path, content=body, headers={
            "Content-Type": "application/json", "x-pinet-session": token,
            "x-pinet-timestamp": stamp, "x-pinet-nonce": nonce,
            "x-pinet-signature": edge_signature(cfg.edge_secret, stamp, nonce, "POST", path, body)})
        response.raise_for_status()
        contact = response.json()
    for _ in range(25):
        data = await jobs.load_input(item.id, cid)
        if data["actual_core_followup"]:
            break
        await asyncio.sleep(1)
    if not data["actual_core_followup"]:
        raise RuntimeError("postcall_followup_not_prepared")
    models = {}
    run_id = str(uuid4())
    for kind, schema in [("analysis", Analysis), ("quality", Quality)]:
        action = f"m0-{kind}:{cid}:{run_id}"
        if not await budget.allow_analysis(item.id, action):
            raise RuntimeError("declared_analysis_budget_unavailable")
        result = await jobs.model_output(schema,
            jobs.analysis_instruction(data)
            if kind == "analysis" else
            "Independently assess this transcript and the prepared follow-up. Identify missing facts, "
            "communication or tool issues. Do not claim pronunciation or delivery is measured from text.", data, action)
        jobs.check_evidence(result, data, client_only=kind == "analysis")
        models[kind] = await jobs.review_followup(result, data, action) if kind == "analysis" else result.model_dump()
    result = {"status": "measured", "site_id": site, "canonical_host": item.canonical_host,
        "conversation_id": cid, "contact_saved": contact["saved"],
        "contact_channel": contact["channel"], "actual_core_followup": data["actual_core_followup"],
        "core_analysis_engine": "programmatic_baseline", "measured_draft_engine": cfg.analysis_model,
        "analysis": models["analysis"], "quality": models["quality"],
        "draft_auto_send_reviewed": bool(models["analysis"].get("validated_followup")),
        "smtp_sent": False, "public_voice_enabled": cfg.voice_enabled,
        "full_m0_pass": False}
    async with db.transaction(item.id, cfg.environment) as tx:
        result["outbox_states"] = list(await tx.scalars(select(Outbox.state).where(Outbox.conversation_id == cid)))
    return result


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--conversation-id", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--preview-url", default="http://127.0.0.1:5187")
    parser.add_argument('--site', choices=sorted(PROFILES), default='traktoriupadangos')
    args = parser.parse_args()
    try:
        result = await probe(args.conversation_id, args.email, args.preview_url, args.site)
    except Exception as error:
        result = {"status": "failed", "error_type": type(error).__name__, "smtp_sent": False, "full_m0_pass": False}
        if isinstance(getattr(error, "code", None), int):
            result["provider_error_code"] = error.code
            message = str(getattr(error, "message", ""))
            for secret in [settings().google_api_key, settings().worker_secret, settings().operator_secret, settings().edge_secret, args.email]:
                if secret:
                    message = message.replace(secret, "[redacted]")
            result["provider_diagnostic"] = re.sub(r"https?://\S+", "[url]", message)[:600]
        if isinstance(error, ValidationError):
            result["validation_errors"] = [{"loc": e["loc"], "type": e["type"]} for e in error.errors()]
    finally:
        await db.engine.dispose()
    root = ROOT if args.site == 'traktoriupadangos' else Path('artifacts') / (args.site + '-voice')
    root.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(result, ensure_ascii=False, indent=2)
    (root / "postcall-probe.json").write_text(encoded, encoding="utf-8")
    (root / f"postcall-probe-{uuid4()}.json").write_text(encoded, encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k not in {"analysis", "quality", "actual_core_followup"}}))
    if result["status"] != "measured":
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
