"""Reviewed immutable local source approval with a private durable status receipt."""
import argparse
import asyncio
import json
from pathlib import Path

from customer_knowledge_sync import CommittedReceiptUnavailable, write_receipt
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core.business_attachment import admin
from pinet_core.config import settings


def read_request(path):
    path = Path(path)
    if (not path.is_absolute() or any(p.is_symlink() for p in (path, *path.parents))
            or not path.is_file() or path.stat().st_size > 65536):
        raise ValueError("invalid_private_business_source_request")
    value = json.loads(path.read_text("utf-8"))
    if not isinstance(value, dict):
        raise ValueError("invalid_private_business_source_request")
    return value


async def execute(action, request, output):
    value = admin.MODELS[action].model_validate(request)
    output = Path(output)
    marker = Path(str(output) + ".status.json")
    if (not output.is_absolute() or any(p.is_symlink() for p in (output, *output.parents))
            or any(p.exists() or p.is_symlink() for p in (output, marker))):
        raise ValueError("new_private_business_source_receipt_required")
    engine = create_async_engine(settings().admin_database_url)
    committed = False
    try:
        with output.open("x", encoding="utf-8", newline="\n") as saved, marker.open("x", encoding="utf-8", newline="\n") as status:
            write_receipt(saved, "reserved")
            write_receipt(status, "reserved")
            async with AsyncSession(engine, expire_on_commit=False) as tx, tx.begin():
                result = await admin.operate(tx, action, value.model_dump(mode="json"))
                receipt_hash = write_receipt(saved, "prepared", result)
                write_receipt(status, "prepared", {"receipt_sha256": receipt_hash})
                await admin.verify(tx, value, result)
            committed = True
            write_receipt(status, "committed", {"receipt_sha256": receipt_hash})
    except Exception:
        if committed:
            raise CommittedReceiptUnavailable("committed_business_source_receipt_unavailable") from None
        raise
    finally:
        await engine.dispose()
    return {"status": "complete", "binding_id": result["binding_id"], "fingerprint": result["fingerprint"],
        "binding_current": result["binding_current"], "replayed": result["replayed"], "configuration_only": True,
        "model_dispatch_performed": False, "channel_activation": "not_performed"}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=tuple(admin.MODELS))
    parser.add_argument("--input", required=True, help="Private bounded review request outside Git")
    parser.add_argument("--receipt", required=True, help="New private receipt path outside Git")
    args = parser.parse_args()
    print(json.dumps(await execute(args.action, read_request(args.input), args.receipt)))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except CommittedReceiptUnavailable:
        raise SystemExit("committed_business_source_receipt_unavailable: inspect prepared receipt and current binding before retrying.") from None
    except Exception:
        raise SystemExit("Business source operation failed; verify private input, current owner/source and new receipt path.") from None
