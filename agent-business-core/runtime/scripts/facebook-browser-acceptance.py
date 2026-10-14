"""Explicit disposable local CUA acceptance server. No live publishers or platform data."""
import asyncio
import os
from uuid import uuid4

import uvicorn

acceptance_environment = os.environ.get("PINET_FACEBOOK_ACCEPTANCE_ENV", "test-facebook-browser-" + uuid4().hex)
if not acceptance_environment.startswith("test-"):
    raise RuntimeError("Acceptance requires a disposable test-* environment")
os.environ["PINET_ENVIRONMENT"] = acceptance_environment
os.environ["PINET_ALLOW_SIMULATION"] = "true"
os.environ["PINET_KNOWLEDGE_REFRESH_ENABLED"] = "false"
os.environ["PINET_SMTP_ENABLED"] = "false"
os.environ["PINET_VOICE_ENABLED"] = "false"




async def seed():
    from datetime import timedelta

    from pinet_core.config import settings
    from pinet_core.db import db
    from pinet_core.facebook import browser_service as browser
    from pinet_core.facebook import service as fb
    from pinet_core.facebook.browser_contracts import BrowserPolicyUpdate, PostInput, PublisherBinding
    from pinet_core.facebook.contracts import PolicyUpdate
    from pinet_core.models import utcnow
    from pinet_core.service import business

    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        await fb.update_policy(tx, item, PolicyUpdate(base_revision=(await fb.policy(tx))["revision"],
                               policy={"enabled": True}, reason="Disposable CUA fixture"))
        await browser.update_policy(tx, item, BrowserPolicyUpdate(base_revision=(await browser.policy(tx))["revision"],
                               policy={"enabled": True}, reason="Disposable CUA fixture"))
        for kind, name, audience in [("page", "Bandomoji Page", "public"),
                                     ("profile", "Bandomasis profilis", "only_me")]:
            if not await fb.record(tx, "browser_binding", "cua-" + kind):
                await browser.bind(tx, item, PublisherBinding(key="cua-" + kind,
                account_key="cua-synthetic-shared-account", actor_kind=kind, actor_id="fixture-" + kind,
                actor_name=name, target_url=f"http://127.0.0.1:8844/operator/facebook-browser-fixture/{kind}/fixture-{kind}",
                verification_scope="fixture", access="verified", evidence="Actual local CUA acceptance fixture only",
                valid_until=utcnow() + timedelta(hours=2)))
            await browser.queue(tx, item, PostInput(key="cua-post-" + kind, binding_key="cua-" + kind,
                body="Codex Computer Use bandymas. " + name + ".\nTik vietinė aplinka; Facebook niekas neskelbiama.",
                purpose="personal", audience=audience, review_note="Synthetic text and audience approved for isolated acceptance."))
    await db.engine.dispose()


if __name__ == "__main__":
    print("Disposable Facebook CUA environment: " + acceptance_environment, flush=True)
    asyncio.run(seed())
    uvicorn.run("pinet_core.api:app", host="127.0.0.1", port=8844, log_level="warning")
