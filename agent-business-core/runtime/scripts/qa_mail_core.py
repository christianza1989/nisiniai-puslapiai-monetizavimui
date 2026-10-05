"""Metadata-only QA for the named owner's mail test; no credentials/transcripts logged."""
import argparse
import asyncio
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select, text

from pinet_core import mailbox, service
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Base, MailMessage


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    cfg = settings()
    async with db.registry() as tx:
        role = (await tx.execute(text("SELECT rolname,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user"))).mappings().one()
        tables = list((await tx.execute(text("SELECT relname,relrowsecurity,relforcerowsecurity,pg_get_userbyid(relowner) AS owner FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname <> 'alembic_version'"))).mappings())
    mail_table = next(table for table in tables if table["relname"] == "mail_messages")
    report = json.loads(args.report.read_text(encoding="utf-8"))
    receipts = []
    for row in report["clients"]:
        if not row.get("proposed_email"):
            continue
        item = await service.business(row["site_id"])
        case_id = str(uuid5(NAMESPACE_URL, item.site_id + ":client-lab:" + row["conversation_id"]))
        async with db.transaction(item.id, cfg.environment) as tx:
            messages = list(await tx.scalars(select(MailMessage).where(MailMessage.case_id == case_id)))
            receipts += [{"client_id": row["id"], "state": message.state,
                "message_id": message.message_id, "body_hash_verified": message.payload["hash"] == mailbox.fingerprint(message.payload),
                "intended_recipient": message.payload["recipient"] == cfg.lab_mail_recipient,
                "common_sender": message.payload["sender"] == "info@pinet.lt", "synthetic": message.payload["synthetic"]} for message in messages]
    checks = {"restricted_role": not role["rolsuper"] and not role["rolbypassrls"],
        "mail_rls_forced": mail_table["relrowsecurity"] and mail_table["relforcerowsecurity"] and mail_table["owner"] != role["rolname"],
        "production_smtp_off": not cfg.smtp_enabled, "voice_off": not cfg.voice_enabled,
        "six_text_clients_passed": len(report["clients"]) == 6 and report["all_checks_pass"],
        "five_owner_test_receipts": len(receipts) == 5 and all(r["state"] == "accepted_by_smtp" and
            r["body_hash_verified"] and r["intended_recipient"] and r["common_sender"] and r["synthetic"] for r in receipts)}
    result = {"date": "2026-10-01", "checks": checks, "passed": all(checks.values()),
        "tables": len(Base.metadata.tables), "forced_rls_tables": sum(t["relforcerowsecurity"] for t in tables),
        "receipts": receipts, "gemini_audio_verified": False, "recipient_inbox_verified": False,
        "supplier_contacted": False, "real_order_created": False, "fiscal_invoice_issued": False}
    Path("artifacts/mail-core-qa-2026-10-01.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    await db.engine.dispose()
    print(json.dumps({"checks": checks, "tables": result["tables"], "forced_rls_tables": result["forced_rls_tables"]}))
    if not result["passed"]:
        raise RuntimeError("named_mail_qa_failed")


if __name__ == "__main__":
    asyncio.run(main())
