"""Explicit unchanged approved source recheck; no implicit GET renewal or activation."""
import argparse
import asyncio
import json
from pathlib import Path

from control_portable import source_check
from customer_knowledge_sync import CommittedReceiptUnavailable, project, sync, write_receipt
from customer_knowledge_sync import Request as SourceRequest
from customer_profile_admin import read_request
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core.config import settings
from pinet_core.customer_profile import maintenance

Request = maintenance.request_model(SourceRequest)


async def check_source(value):
    if await asyncio.to_thread(source_check) != value.execution_source_revision:
        raise ValueError("execution_source_changed")


async def verify(tx, *, environment, request, result):
    value = Request.model_validate(request)
    await check_source(value)
    await maintenance.verify(tx, environment=environment, request=value.model_dump(mode="json"),
                             result=result, source_request=SourceRequest)


async def maintain(tx, *, environment, request, project_runner=project):
    value = Request.model_validate(request)
    await check_source(value)
    result = await maintenance.maintain(tx, environment=environment, request=value.model_dump(mode="json"),
        source_request=SourceRequest, sync=sync, project_runner=project_runner)
    await verify(tx, environment=environment, request=value, result=result)
    return result


async def execute(request, output):
    output = Path(output)
    marker = Path(str(output) + ".status.json")
    if any(p.exists() or p.is_symlink() for p in (output, marker)):
        raise ValueError("new_private_receipt_required")
    with output.open("x", encoding="utf-8", newline="\n") as saved, marker.open(
            "x", encoding="utf-8", newline="\n") as status:
        write_receipt(saved, "reserved")
        write_receipt(status, "reserved")
        committed = False
        engine = create_async_engine(settings().admin_database_url)
        try:
            try:
                async with AsyncSession(engine, expire_on_commit=False) as tx, tx.begin():
                    result = await maintain(tx, environment=settings().environment, request=request)
                    receipt_sha = write_receipt(saved, "prepared", result)
                    write_receipt(status, "prepared", {"receipt_sha256": receipt_sha})
                    await verify(tx, environment=settings().environment, request=request, result=result)
                committed = True
                write_receipt(status, "committed", {"receipt_sha256": receipt_sha})
            finally:
                await engine.dispose()
        except Exception:
            if committed:
                raise CommittedReceiptUnavailable("committed_receipt_unavailable") from None
            raise
    return {"status": "complete", "profile_admission": "preserved", "replayed": result["replayed"],
            "session_activation": "not_performed", "channel_activation": "not_performed", "provider_calls": 0}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Private exact current identity/source request")
    parser.add_argument("--receipt", required=True, help="New private operator receipt outside Git")
    args = parser.parse_args()
    print(json.dumps(await execute(read_request(args.input), args.receipt)))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except CommittedReceiptUnavailable:
        raise SystemExit("committed_receipt_unavailable: Inspect prepared receipt and actual freshness proof before retry.") from None
    except Exception:
        raise SystemExit("Source maintenance failed; inspect current authority, unchanged projection, clean source and private receipt.") from None
