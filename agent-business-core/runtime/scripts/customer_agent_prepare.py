"""Explicit atomic local source/Profile preparation; no session, model or channel activation."""
import argparse
import asyncio
import json
from pathlib import Path

from control_portable import source_check
from customer_knowledge_sync import CommittedReceiptUnavailable, project, sync, write_receipt
from customer_knowledge_sync import Request as SourceRequest
from customer_profile_admin import read_request
from pydantic import Field
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core.config import settings
from pinet_core.creation_registration.wire import Source
from pinet_core.customer_profile.admin import admit


class Request(SourceRequest):
    # This command is an explicit admission, never an implicit refresh on GET.
    admit_source: bool = Field(strict=True)
    execution_source_revision: Source


def profile_request(value, transferred):
    return {"registration_id": transferred["registration_id"],
        **{key: getattr(value, key) for key in ("accepted_revision", "candidate_sha256",
            "accepted_source_revision", "authorizing_session_id", "execution_source_revision")},
        "knowledge_ref": transferred["knowledge_ref"]}


async def verify_profile(tx, *, environment, request, result):
    value = Request.model_validate(request)
    original = result["profile_admission"]
    verified = await admit(tx, environment=environment, **profile_request(value, result))
    if (verified["admission_id"], verified["fingerprint"]) != (original["admission_id"], original["fingerprint"]):
        raise ValueError("profile_changed_before_commit")


async def prepare(tx, *, environment, request, project_runner=project):
    value = Request.model_validate(request)
    if not value.admit_source:
        raise ValueError("explicit_source_admission_required")
    if await asyncio.to_thread(source_check) != value.execution_source_revision:
        raise ValueError("execution_source_mismatch")
    transferred = await sync(tx, environment=environment,
        request=value.model_dump(mode="json", exclude={"execution_source_revision"}),
        project_runner=project_runner)
    if await asyncio.to_thread(source_check) != value.execution_source_revision:
        raise ValueError("execution_source_changed")
    profile = await admit(tx, environment=environment, **profile_request(value, transferred))
    if await asyncio.to_thread(source_check) != value.execution_source_revision:
        raise ValueError("execution_source_changed")
    # Git subprocesses can outlast Session/source TTL. Canonical exact replay
    # repeats all current authority and receipt/time gates after that wait,
    # under the same locks, without inserting another admission or renewing TTL.
    result = {**transferred, "profile_admission": profile,
        "scope": "explicit_local_operator_preparation",
        "session_activation": "not_performed", "provider_calls": 0}
    await verify_profile(tx, environment=environment, request=value, result=result)
    return result


async def execute(request, output):
    output = Path(output)
    marker = Path(str(output) + ".status.json")
    if any(path.exists() or path.is_symlink() for path in (output, marker)):
        raise ValueError("new_private_receipt_required")
    # Canonical receipt protocol: preserve prepared bytes after commit. Failure
    # to write a committed marker requires inspection, never automatic retry.
    with output.open("x", encoding="utf-8", newline="\n") as saved, marker.open(
        "x", encoding="utf-8", newline="\n"
    ) as status:
        write_receipt(saved, "reserved")
        write_receipt(status, "reserved")
        committed = False
        try:
            engine = create_async_engine(settings().admin_database_url)
            try:
                async with AsyncSession(engine, expire_on_commit=False) as tx, tx.begin():
                    result = await prepare(tx, environment=settings().environment, request=request)
                    receipt_sha256 = write_receipt(saved, "prepared", result)
                    write_receipt(status, "prepared", {"receipt_sha256": receipt_sha256})
                    # Fsync also consumes wall-clock time. Repeat canonical
                    # admission/authority/TTL after both writes, immediately
                    # before tx exit. Keep the prepared receipt bytes exact.
                    await verify_profile(tx, environment=settings().environment,
                        request=request, result=result)
                committed = True
                write_receipt(status, "committed", {"receipt_sha256": receipt_sha256})
            finally:
                await engine.dispose()
        except Exception:
            if committed:
                raise CommittedReceiptUnavailable("committed_receipt_unavailable") from None
            raise
    # Private IDs, fingerprints, source facts and sessions stay in the receipt.
    return {"status": "complete", "page_count": result["page_count"],
        "source_admitted": True, "profile_admitted": True,
        "session_activation": "not_performed", "channel_activation": "not_performed",
        "provider_calls": 0}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Exact private explicit preparation request")
    parser.add_argument("--receipt", required=True, help="New private receipt path outside Git")
    args = parser.parse_args()
    print(json.dumps(await execute(read_request(args.input), args.receipt)))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except CommittedReceiptUnavailable:
        raise SystemExit("committed_receipt_unavailable: Inspect prepared receipt and actual index/Profile before retry.") from None
    except Exception:
        raise SystemExit("Agent preparation failed; verify private request, current authority, clean sources and receipts.") from None
