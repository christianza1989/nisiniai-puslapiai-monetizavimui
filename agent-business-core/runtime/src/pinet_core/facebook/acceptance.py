"""Disposable local UI/CLI acceptance. Never loads a real FB account or sends messages."""
import argparse
import asyncio
import json
from pathlib import Path

import uvicorn
from sqlalchemy import delete, select

from ..config import settings
from ..db import db
from ..models import Business, Case
from ..service import business
from . import service
from .agent import generate
from .contracts import ActionInput, GroupInput, ModulePolicy, PolicyUpdate, SignalInput
from .models import FacebookAccountLease, FacebookRecord

ENV = "test-facebook-preview-20261001"
QA_KEY = "synthetic-local-facebook-preview-only"
REPORT = Path(__file__).resolve().parents[5] / "research/facebook-module-2026-10-01/CLI-PROBE.json"


def isolated_config():
    cfg = settings()
    cfg.environment = ENV
    cfg.allow_simulation = True
    cfg.operator_secret = QA_KEY
    cfg.worker_secret = "synthetic-preview-worker-only"
    cfg.edge_secret = "synthetic-preview-edge-only"
    cfg.smtp_enabled = cfg.lab_mail_enabled = cfg.voice_enabled = cfg.knowledge_refresh_enabled = False
    cfg.google_api_key = ""
    return cfg


async def cleanup():
    async with db.registry() as tx:
        items = list(await tx.scalars(select(Business)))
    for item in items:
        async with db.transaction(item.id, ENV) as tx:
            await tx.execute(delete(FacebookRecord))
            await tx.execute(delete(FacebookAccountLease))
            await tx.execute(delete(Case))
    await db.engine.dispose()
    print(json.dumps({"cleaned_test_environment": ENV}))


async def probe():
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, ENV) as tx:
        current = await service.policy(tx)
        await service.update_policy(tx, item, PolicyUpdate(
            base_revision=current["revision"], reason="Synthetic CLI acceptance",
            policy=ModulePolicy(enabled=True, daily_draft_limit=5)))
        await service.add_group(tx, item, GroupInput(
            key="cli-qa", name="Synthetic CLI QA metadata",
            url="https://www.facebook.com/groups/synthetic-qa/",
            rules_url="https://www.facebook.com/groups/synthetic-qa/about", reuse="unknown"))
        signal = await service.add_signal(tx, item, SignalInput(
            key="cli-qa", group_key="cli-qa", title="Traktoriaus padangos dydžio klausimas",
            summary="Sintetinis anoniminis poreikis: neaiškus žymėjimas, kiekis ir laikotarpis.",
            role="buyer", scope_fit="yes", data_class="synthetic"))
        await service.queue_draft(tx, item, ActionInput(
            key="cli-qa", signal_id=signal["id"], kind="comment_draft"))
        task = await service.claim_model_draft(tx, item)
    if not task:
        raise RuntimeError("No isolated model task available")
    result = await generate(task)
    async with db.transaction(item.id, ENV) as tx:
        acceptance = await service.complete_model_draft(tx, item, task, result)
    report = {"environment": ENV, "site_id": item.site_id, "synthetic": True,
              "acceptance": acceptance, "approved": result.get("approved", False),
              "body": result.get("body"), "review": result.get("review"),
              "usage": result.get("usage"), "reason": result.get("reason"),
              "instruction_hash": task["context"]["instruction_hash"],
              "facts_hash": task["context"]["facts_hash"],
              "external_actions": 0, "demand_evidence": False}
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    await db.engine.dispose()
    print(json.dumps({"acceptance": acceptance, "report": str(REPORT), "external_actions": 0}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["preview", "probe", "cleanup"])
    args = parser.parse_args()
    isolated_config()
    if args.mode == "preview":
        uvicorn.run("pinet_core.api:app", host="127.0.0.1", port=8843, log_level="warning")
    else:
        asyncio.run(probe() if args.mode == "probe" else cleanup())
