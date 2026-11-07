"""Explicit administrative publication review; not mounted in any HTTP API."""
from sqlalchemy import func, select, text

from ..models import utcnow
from .models import Project
from .projection import Draft, Evidence, aware, revision, validate_approval


async def administrative(tx, environment):
    role = (await tx.execute(text("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
    if not (role.rolsuper or role.rolbypassrls) or not (environment == "local" or environment.startswith("test-")):
        raise ValueError("Explicit local administrative connection required")
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                     {"k": "public-publication:" + environment})


async def save(tx, *, environment, project, evidence, publish_at):
    await administrative(tx, environment)
    aware(publish_at)
    payload = Draft.model_validate(project).model_dump(mode="json")
    private = Evidence.model_validate(evidence).model_dump(mode="json")
    row = await tx.scalar(select(Project).where(Project.environment_id == environment, Project.slug == payload['slug']).with_for_update())
    material = revision(payload, private, publish_at)
    if not row:
        if (await tx.scalar(select(func.count()).select_from(Project).where(Project.environment_id == environment))) >= 100:
            raise ValueError("This bounded inventory permits100 entries; extend contract before increasing it")
        row = Project(environment_id=environment, slug=payload['slug'], public_payload=payload,
                      private_evidence=private, publish_at=publish_at, revision_hash=material)
        tx.add(row)
    elif row.revision_hash != material:
        row.public_payload, row.private_evidence, row.publish_at, row.revision_hash = payload, private, publish_at, material
        row.approved_hash, row.approved_at = None, None
    row.updated_at = utcnow()
    await tx.flush()
    return {"slug": row.slug, "revision": row.revision_hash, "approved": row.approved_hash == row.revision_hash}


async def approve(tx, *, environment, slug, expected_revision):
    await administrative(tx, environment)
    # Serialize bounded-inventory administrative writes/review in the same environment.
    row = await tx.scalar(select(Project).where(Project.environment_id == environment, Project.slug == slug).with_for_update())
    if not row or row.revision_hash != expected_revision or revision(row.public_payload, row.private_evidence, row.publish_at) != expected_revision:
        raise ValueError("Exact current draft revision required")
    validate_approval(row.public_payload, row.private_evidence)
    row.approved_hash, row.approved_at, row.revoked_at = expected_revision, utcnow(), None
    row.updated_at = utcnow()
    return {"slug": slug, "revision": expected_revision, "approved": True}


async def revoke(tx, *, environment, slug):
    await administrative(tx, environment)
    row = await tx.scalar(select(Project).where(Project.environment_id == environment, Project.slug == slug).with_for_update())
    if not row:
        raise ValueError("Project not found")
    row.revoked_at, row.updated_at = utcnow(), utcnow()
    return {"slug": slug, "approved": False}
