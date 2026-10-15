"""Explicit local customer V2 index transfer; admission and channels remain separate."""

import argparse
import asyncio
import hashlib
import json
import os
import subprocess
from pathlib import Path

from pydantic import Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core import knowledge_index as index
from pinet_core import onboarding, policy
from pinet_core.config import settings
from pinet_core.contracts import KnowledgeReferenceV2
from pinet_core.control.models import BusinessGrant
from pinet_core.creation.service import binding, current_actor, digest
from pinet_core.creation_registration import admin as registrations
from pinet_core.creation_registration import service as registry
from pinet_core.creation_registration.locks import lifetime
from pinet_core.creation_registration.wire import Digest, Provision, Source
from pinet_core.customer_profile.admin import guard, identity
from pinet_core.customer_profile.service import registry_row
from pinet_core.models import Business

ROOT = Path(__file__).resolve().parents[1]


class CommittedReceiptUnavailable(RuntimeError):
    """The database committed; an operator must inspect before retrying."""


def write_receipt(saved, status, result=None):
    value = json.dumps({"status": status, **(result or {})}, indent=2)
    saved.seek(0)
    saved.write(value)
    saved.truncate()
    saved.flush()
    os.fsync(saved.fileno())
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class Request(Provision):
    public_core: str = Field(min_length=1, max_length=32767)
    public_source_revision: Source
    sandbox: str = Field(min_length=1, max_length=32767)
    package_sha256: Digest
    admit_source: bool = Field(default=False, strict=True)


async def project(value):
    process = await asyncio.create_subprocess_exec(
        "node",
        str(ROOT / "scripts/customer_knowledge_projection.mjs"),
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    try:
        raw, _ = await asyncio.wait_for(process.communicate(json.dumps(value).encode()), timeout=30)
    except (TimeoutError, asyncio.CancelledError):
        process.kill()
        await process.wait()
        raise
    if process.returncode or len(raw) > 12_000_000:
        raise ValueError("customer_projection_failed")
    return json.loads(raw)


async def sync(tx, *, environment, request, project_runner=project):
    value = Request.model_validate(request)
    cfg = settings()
    if cfg.voice_enabled or cfg.smtp_enabled:
        raise ValueError("local_channels_off_required")
    await guard(tx, environment)
    # Derive one known registration, then pin its lifetime before all actor locks.
    row = await registry_row(tx, str(value.creation_id))
    if row is None:
        raise ValueError("registration_required")
    pinned = row.id, row.fingerprint
    await lifetime(tx, environment, row.id)
    row = await identity(tx, environment, row.id)
    creation, session = await registrations.actor(
        tx,
        environment=environment,
        creation_id=str(value.creation_id),
        session_id=str(value.authorizing_session_id),
    )
    row = await identity(tx, environment, row.id)
    if (
        pinned != (row.id, row.fingerprint)
        or row.revoked_at
        or binding(row) != binding(creation)
        or row.accepted_revision != creation.current_revision
        or any(
            getattr(row, key) != getattr(value, key)
            for key in ("accepted_revision", "candidate_sha256", "accepted_source_revision")
        )
    ):
        raise ValueError("registration_identity_conflict")
    proof = await registry.accepted_proof(tx, creation)
    if any(getattr(row, key) != proof[key] for key in registry.PROOF_KEYS):
        raise ValueError("accepted_registration_source_changed")
    grant = await tx.scalar(
        select(BusinessGrant)
        .where(
            BusinessGrant.id == row.grant_id,
            BusinessGrant.business_id == row.business_id,
            BusinessGrant.environment_id == environment,
            BusinessGrant.portfolio_id == row.portfolio_id,
            BusinessGrant.organization_id == row.organization_id,
            BusinessGrant.enabled,
        )
        .with_for_update(read=True)
    )
    business = await tx.get(Business, row.business_id)
    if (
        not grant
        or not business
        or (business.site_id, business.canonical_host) != (row.site_id, row.canonical_host)
    ):
        raise ValueError("registration_grant_conflict")
    await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": business.id})
    await policy.lock(tx, business.id, environment, exclusive=True)
    old = await index.locked(tx, business)
    projected = await project_runner(
        {
            "public_core": value.public_core,
            "public_source_revision": value.public_source_revision,
            "sandbox": value.sandbox,
            "site_id": row.site_id,
            "canonical_host": row.canonical_host,
            "package_sha256": value.package_sha256,
            "base_revision": old.revision if old else 0,
        }
    )
    evidence = projected["evidence"]
    if (
        evidence["scope"] != "isolated-local-approved-v2-projection"
        or evidence["public_source_revision"] != value.public_source_revision
        or evidence["package_sha256"] != value.package_sha256
        or evidence["public_domain_launch_verified"] is not False
    ):
        raise ValueError("customer_projection_evidence_conflict")
    transport = projected["transport"]
    header = index.Begin.model_validate(transport["header"])
    await index.begin(tx, business, header)
    for batch in transport["batches"]:
        await index.batch(tx, business, index.Batch.model_validate(batch))
    receipt = await index.commit(tx, business, index.Commit.model_validate(transport["commit"]))
    # Completion alone never admits a new source; this flag is an explicit operator action.
    if value.admit_source:
        await onboarding.update(
            tx, business, onboarding.Readiness(source_ready=True, learning_admitted=False)
        )
    await current_actor(tx, session, creation.portfolio_id)
    current = await identity(tx, environment, row.id)
    if current.revoked_at or current.fingerprint != pinned[1]:
        raise ValueError("registration_changed")
    state = await index.locked(tx, business)
    reference = KnowledgeReferenceV2(
        schema_version=2,
        knowledge_revision=state.revision,
        knowledge_hash=state.payload["hash"],
        deployment_id=header.metadata.deployment_id,
    )
    return {
        "registration_id": row.id,
        "business_id": business.id,
        "site_id": row.site_id,
        "accepted_source_revision": row.accepted_source_revision,
        "execution_source_revision": cfg.control_source_revision,
        "knowledge_ref": reference.model_dump(mode="json"),
        "index_receipt_sha256": digest(receipt),
        "page_count": receipt["page_count"],
        "source_admitted_by_this_operation": value.admit_source,
        "evidence": evidence,
        "profile_admission": "not_performed",
        "channel_activation": "not_performed",
    }


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--receipt", required=True, help="New private receipt path outside Git")
    args = parser.parse_args()
    source, output = Path(args.input), Path(args.receipt)
    marker = Path(str(output) + ".status.json")
    if (
        source.is_symlink()
        or source.stat().st_size > 4096
        or any(p.exists() or p.is_symlink() for p in (output, marker))
    ):
        raise ValueError("invalid_private_sync_paths")
    request = json.loads(source.read_text("utf-8"))
    # Reserve and durably test the private destination before opening a database
    # or projecting content. Keep the exact prepared result before the commit.
    with (
        output.open("x", encoding="utf-8", newline="\n") as saved,
        marker.open("x", encoding="utf-8", newline="\n") as status,
    ):
        write_receipt(saved, "reserved")
        write_receipt(status, "reserved")
        committed = False
        try:
            engine = create_async_engine(settings().admin_database_url)
            try:
                async with AsyncSession(engine, expire_on_commit=False) as tx, tx.begin():
                    result = await sync(tx, environment=settings().environment, request=request)
                    receipt_sha256 = write_receipt(saved, "prepared", result)
                    write_receipt(status, "prepared", {"receipt_sha256": receipt_sha256})
                committed = True
                # The prepared result is immutable after commit. A partial status
                # write can never destroy its exact index reference or evidence.
                write_receipt(status, "committed", {"receipt_sha256": receipt_sha256})
            finally:
                await engine.dispose()
            print(
                json.dumps(
                    {
                        "status": "complete",
                        "page_count": result["page_count"],
                        "source_admitted": result["source_admitted_by_this_operation"],
                        "profile_admission": "not_performed",
                        "channel_activation": "not_performed",
                    }
                )
            )
        except Exception:
            if committed:
                raise CommittedReceiptUnavailable("committed_receipt_unavailable") from None
            raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except CommittedReceiptUnavailable:
        raise SystemExit(
            "committed_receipt_unavailable: Database transfer committed; inspect the prepared receipt and current index before any retry."
        ) from None
    except Exception:
        raise SystemExit(
            "Customer source transfer failed; verify exact private authority, projection and index."
        ) from None
