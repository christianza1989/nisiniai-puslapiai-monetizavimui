"""Explicit privileged bounded model authorization, with a private commit receipt."""
import argparse
import asyncio
import json
from pathlib import Path

from customer_knowledge_sync import CommittedReceiptUnavailable, write_receipt
from customer_profile_admin import read_request
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core.acquisition import model_admin
from pinet_core.acquisition.model_contract import ApproveModel, StopModel
from pinet_core.config import settings


async def execute(action, request, output):
    output = Path(output)
    marker = Path(str(output)+".status.json")
    if (not output.is_absolute() or any(p.is_symlink() for p in (output, *output.parents))
            or any(p.exists() or p.is_symlink() for p in (output, marker))):
        raise ValueError("new_private_model_receipt_required")
    value = (ApproveModel if action == "approve" else StopModel).model_validate(request)
    engine = create_async_engine(settings().admin_database_url)
    committed = False
    try:
        with output.open("x", encoding="utf-8", newline="\n") as saved, marker.open("x", encoding="utf-8", newline="\n") as status:
            write_receipt(saved, "reserved")
            write_receipt(status, "reserved")
            async with AsyncSession(engine, expire_on_commit=False) as tx, tx.begin():
                result = await model_admin.operate(tx, action, value.model_dump(mode="json"))
                receipt_hash = write_receipt(saved, "prepared", result)
                write_receipt(status, "prepared", {"receipt_sha256": receipt_hash})
                await model_admin.verify(tx, value.model_dump(mode="json"), result)
            committed = True
            write_receipt(status, "committed", {"receipt_sha256": receipt_hash})
    except Exception:
        if committed:
            raise CommittedReceiptUnavailable("committed_model_receipt_unavailable") from None
        raise
    finally:
        await engine.dispose()
    return {"status": "complete", "authorization_id": result["after"]["id"],
        "fingerprint": result["after"]["fingerprint"], "enabled": result["after"]["enabled"],
        "model_dispatch_performed": False, "channel_activation": "not_performed"}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("approve", "stop", "inspect"))
    parser.add_argument("--input", required=True, help="Private exact current-owner input outside Git")
    parser.add_argument("--receipt", required=True, help="New absolute private receipt path")
    args = parser.parse_args()
    print(json.dumps(await execute(args.action, read_request(args.input), args.receipt)))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except CommittedReceiptUnavailable:
        raise SystemExit("Committed model receipt unavailable; inspect the retained prepared record and exact authorization before any new budget.") from None
    except Exception:
        raise SystemExit("Model authorization failed; inspect the private request, current owner/source and new receipt path.") from None
