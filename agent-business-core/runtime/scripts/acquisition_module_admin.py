"""Privileged local capture approval with private commit-status receipt; no runtime start."""
import argparse
import asyncio
import json
from pathlib import Path

from customer_knowledge_sync import CommittedReceiptUnavailable, write_receipt
from customer_profile_admin import read_request
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core.acquisition import module_admin
from pinet_core.config import settings


async def execute(action, request, output):
    output = Path(output)
    marker = Path(str(output) + ".status.json")
    if (not output.is_absolute() or any(p.is_symlink() for p in (output, *output.parents))
            or any(p.exists() or p.is_symlink() for p in (output, marker))):
        raise ValueError("new_private_module_receipt_required")
    models = {"approve": module_admin.Approve, "stop": module_admin.Stop, "inspect": module_admin.Authority}
    value = models[action].model_validate(request)
    engine = create_async_engine(settings().admin_database_url)
    committed = False
    try:
        with output.open("x", encoding="utf-8", newline="\n") as saved, marker.open("x", encoding="utf-8", newline="\n") as status:
            write_receipt(saved, "reserved")
            write_receipt(status, "reserved")
            async with AsyncSession(engine, expire_on_commit=False) as tx, tx.begin():
                result = await module_admin.operate(tx, action, value.model_dump(mode="json"))
                receipt_hash = write_receipt(saved, "prepared", result)
                write_receipt(status, "prepared", {"receipt_sha256": receipt_hash})
                await module_admin.verify(tx, value, result)
            committed = True
            write_receipt(status, "committed", {"receipt_sha256": receipt_hash})
    except Exception:
        if committed:
            raise CommittedReceiptUnavailable("committed_module_receipt_unavailable") from None
        raise
    finally:
        await engine.dispose()
    after = result["after"]
    return {"status": "complete", "fingerprint": result["fingerprint"],
        "enabled": after["enabled"] if after else False, "configuration_only": True,
        "model_dispatch_performed": False, "channel_activation": "not_performed"}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("approve", "stop", "inspect"))
    parser.add_argument("--input", required=True, help="Private exact current-owner request outside Git")
    parser.add_argument("--receipt", required=True, help="New private receipt path outside Git")
    args = parser.parse_args()
    print(json.dumps(await execute(args.action, read_request(args.input), args.receipt)))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except CommittedReceiptUnavailable:
        raise SystemExit("committed_module_receipt_unavailable: inspect the prepared receipt and current module before any new approval.") from None
    except Exception:
        raise SystemExit("Module operation failed; verify the private request, current authority, source and new receipt path.") from None
