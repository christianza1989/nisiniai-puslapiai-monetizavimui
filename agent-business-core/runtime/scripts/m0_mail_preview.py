"""Owner-only delivery of a reviewed audio follow-up through the existing lab mail core."""
import argparse
import asyncio
import json
import sys
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from pinet_core import mailbox, service
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Case
from pinet_core.security import digest


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--send", action="store_true")
    args = parser.parse_args()
    cfg = settings()
    if not cfg.m0_probe_enabled or cfg.voice_enabled or cfg.smtp_enabled or not cfg.environment.startswith("tractor-live-"):
        raise ValueError("isolated_private_audio_pilot_required")
    proof = json.loads(Path("artifacts/tractor-voice/postcall-probe.json").read_text(encoding="utf-8"))
    if proof.get("status") != "measured" or not proof.get("draft_auto_send_reviewed"):
        raise ValueError("reviewed_native_audio_draft_required")
    letter = proof["analysis"]["validated_followup"]
    if letter["body_hash"] != digest(letter["body"]):
        raise ValueError("draft_changed_after_review")
    # Explicit owner test uses the existing lab's local namespace in this isolated
    # database. The audio conversation remains synthetic and its outbox unsent.
    cfg.environment = "local"
    if not mailbox.test_transport_ready(cfg):
        raise ValueError("configured_owner_lab_recipient_and_transport_required")
    item = await service.business("traktoriupadangos")
    case_id = str(uuid5(NAMESPACE_URL, "m0-preview:" + proof["conversation_id"]))
    async with db.transaction(item.id, cfg.environment) as tx:
        if not await tx.get(Case, case_id):
            tx.add(Case(id=case_id, business_id=item.id, environment_id=cfg.environment,
                payload={"test": True, "source": "owner_audio_preview", "audio_conversation_ref": proof["conversation_id"]}))
            await tx.flush()
        message = await mailbox.prepare(tx, item, mailbox.DraftInput(case_id=case_id,
            recipient=cfg.lab_mail_recipient, subject=letter["subject"], body=letter["body"],
            source_ref="m0-reviewed:" + letter["body_hash"]))
        mid, message_id = message.id, message.message_id
    receipt = await mailbox.send_test(item.id, mid) if args.send else {"state": "draft"}
    result = {"state": receipt["state"], "message_id": message_id, "site_id": item.site_id,
        "sender_is_info_pinet": cfg.sender_email == "info@pinet.lt", "configured_owner_recipient_only": True,
        "delivery_mode": "owner_lab_preview", "automatic_postcall_smtp_verified": False,
        "recipient_inbox_verified": False, "production_smtp_enabled": cfg.smtp_enabled}
    Path("artifacts/tractor-voice/mail-preview-receipt.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result))
    await db.engine.dispose()
    if args.send and result["state"] != "accepted_by_smtp":
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
