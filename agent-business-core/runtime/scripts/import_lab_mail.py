"""Import local lab drafts into the common per-site console; optional authorized owner test send."""
import argparse
import asyncio
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from pinet_core import mailbox, service
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Case
from pinet_core.offers import OfferSnapshot, PricingPolicy, retail_options
from pinet_core.security import digest


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("report", type=Path)
    parser.add_argument("--send", action="store_true")
    args = parser.parse_args()
    if settings().environment != "local":
        raise RuntimeError("local_lab_import_only")
    report = json.loads(args.report.read_text(encoding="utf-8"))
    if report.get("assistant_engine") != "codex_cli_local_default" or not report.get("synthetic_core_scope"):
        raise RuntimeError("explicit_lab_report_required")
    for row in report["clients"]:
        if not row.get("proposed_email"):
            continue
        item = await service.business(row["site_id"])
        case_id = str(uuid5(NAMESPACE_URL, item.site_id + ":client-lab:" + row["conversation_id"]))
        payload = row["proposed_email"]
        snapshot = OfferSnapshot.model_validate_json(Path('evals/public-offers.json').read_text(encoding='utf-8'))
        pricing = PricingPolicy.model_validate_json(Path('artifacts/pricing', item.site_id + '.json').read_text(encoding='utf-8'))
        retail_text, retail_items = retail_options(row.get('need', {}), snapshot, item.site_id, pricing)
        base_body = payload['body'].split('\n\nPRELIMINARŪS VARIANTAI PAGAL JŪSŲ POREIKĮ')[0]
        for offer in snapshot.offers:
            if offer.url in base_body or offer.seller in base_body:
                raise ValueError('supplier_data_in_customer_letter')
        if 'https://' in base_body or 'http://' in base_body:
            raise ValueError('unverified_url_in_customer_letter')
        payload = {**payload, 'body': base_body + retail_text}
        source = "client-lab:" + row["conversation_id"] + ":" + digest(json.dumps(payload, sort_keys=True))
        async with db.transaction(item.id, settings().environment) as tx:
            case = await tx.get(Case, case_id)
            if not case:
                case = Case(id=case_id, business_id=item.id, environment_id=settings().environment,
                            payload={"test": True, "source": "text_client_lab", "conversation_ref": row["conversation_id"],
                                     "need": row.get("need", {}), "history": row["history"],
                                     "offer_ids": row["proposed_email"].get("public_offer_ids", [])})
                tx.add(case)
                await tx.flush()
            case.payload = {**case.payload, 'retail_offers': retail_items}
            message = await mailbox.prepare(tx, item, mailbox.DraftInput(case_id=case_id,
                recipient=row["recipient"], subject=payload["subject"], body=payload["body"], source_ref=source))
            message_id = message.id
        passed = bool(row.get("checks")) and all(row["checks"].values())
        result = await mailbox.send_test(item.id, message_id) if args.send and passed else {"state": "draft"}
        print(json.dumps({"site_id": item.site_id, "client": row["id"], "state": result["state"], "checks_pass": passed}), flush=True)
    await db.engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
