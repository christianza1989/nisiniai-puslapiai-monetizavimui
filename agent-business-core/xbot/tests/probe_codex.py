"""Explicit two-call capability check, synthetic facts, no Treg, no publication."""

import asyncio
import hashlib
import json
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from xbot.config import ROOT, Config  # noqa: E402
from xbot.contracts import Profile, validate_text  # noqa: E402
from xbot.service import Service  # noqa: E402
from xbot.store import Store, fingerprint  # noqa: E402


async def probe():
    config = Config.private()
    p = Profile(
        site_id="capability-fixture",
        canonical="https://example.com",
        enabled=True,
        paused=False,
        start_hour=0,
        end_hour=24,
        language="lt",
        facts=["Šis testinis pavyzdys skirtas tik vietinei įrašų ruošimo patikrai."],
        facts_source="Synthetic local capability fixture",
        facts_verified_at=time.time(),
    )
    evidence = {
        "scope": "synthetic-service-queue-cli-persisted-draft",
        "live_calls": 0,
        "treg_spend_micro": 0,
        "configured_model": config.codex_model,
        "instruction_sha256": hashlib.sha256((ROOT / "instructions/AGENT.md").read_bytes()).hexdigest(),
        "instruction_fingerprint": fingerprint((ROOT / "instructions/AGENT.md").read_text(encoding="utf-8")),
    }
    try:
        with tempfile.TemporaryDirectory(prefix="xbot-capability-") as directory:
            store = Store(Path(directory) / "fixture.sqlite")
            store.update_profile(p.model_dump(), 0, "Synthetic capability only")
            job = store.enqueue(
                p.site_id,
                "draft",
                "capability-once",
                {
                    "title": "Kaip paruošti aiškų vieno klausimo įrašą",
                    "angle": "One useful writing tip; no business claim or URL.",
                },
                time.time() - 1,
            )
            config.codex_enabled = True
            result = await Service(store, config).run_once(p.site_id)
            if result["state"] != "completed":
                raise RuntimeError(result.get("reason", "unexpected_service_state"))
            draft = store.records(p.site_id, "draft")[0]["payload"]
            model_usage = store.model_usage_totals(p.site_id)
            usage_receipts = store.records(p.site_id, "model_usage")
            assert len(usage_receipts) == 2 and model_usage["known_receipts"] == 2
            assert model_usage["unknown_receipts"] == 0
            assert model_usage["usage"]["input_tokens"] == sum(c["input_tokens"] for c in draft["usage"])
            assert store.jobs(p.site_id)[0]["id"] == job["id"]
            assert draft["instruction_hash"] == evidence["instruction_fingerprint"]
            validate_text(draft["draft"]["text"], [])
        evidence.update(
            state="PASS",
            draft_sha256=hashlib.sha256(draft["draft"]["text"].encode()).hexdigest(),
            review_approved=draft["review"]["approved"],
            unsupported_claims=draft["review"]["unsupported_claims"],
            review_reasons=draft["review"]["reasons"],
            publish_eligible=draft["review"]["approved"] and not draft["review"]["unsupported_claims"],
            facts_hash=draft["facts_hash"],
            usage=draft["usage"],
            model_usage_totals=model_usage,
            usage_receipts_count=len(usage_receipts),
        )
    except (ValueError, RuntimeError, AssertionError) as error:
        evidence.update(
            state="BLOCKED",
            reason=str(error) if str(error).startswith(("codex_", "lab_", "unexpected_")) else type(error).__name__,
        )
    # Sanitized metadata survives a console encoding failure; no draft text or credentials.
    (config.data / "qa-cli-probe.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    print(json.dumps(evidence))


asyncio.run(probe())
