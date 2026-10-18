"""Fresh canonical owner and immutable mail/policy pins for display-only work."""
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID

from sqlalchemy import select, text

from ..acquisition.module_admin import execution_current
from ..config import settings
from ..control.models import BusinessGrant, Membership, Session
from ..control.routes import ControlError
from ..creation.service import current_actor, digest
from ..models import Case, MailMessage
from .service import summary
from .task_contract import EFFORT, MODEL
from .task_models import DisplayPolicy
from .translations import POLICY_SHA, Record, source_digest, validate_text

FIELDS = ("id", "environment_id", "business_id", "organization_id", "user_id", "portfolio_id", "grant_id",
    "session_id", "source_revision", "instruction_sha256", "target_language", "model", "effort",
    "maximum_calls", "mail_created_after", "approved_at", "expires_at")


def guard(*, execution=False):
    cfg = settings()
    if (not cfg.mail_display_tasks_enabled or not cfg.control_enabled or cfg.control_mode != "local"
            or not (cfg.environment == "local" or cfg.environment.startswith("test-"))
            or not cfg.customer_enabled or execution and not cfg.mail_display_runner_enabled):
        raise ControlError(403, "mail_display_tasks_disabled")


def material(row):
    value = {key: getattr(row, key) for key in FIELDS}
    for key in ("mail_created_after", "approved_at", "expires_at"):
        value[key] = value[key].isoformat()
    return value


async def source(revision):
    await execution_current(SimpleNamespace(execution_source_revision=revision))


async def grant(tx, session, business_id, *, enabled=True):
    value = await tx.scalar(select(BusinessGrant).join(Membership,
        (Membership.organization_id == BusinessGrant.organization_id)
        & (Membership.environment_id == BusinessGrant.environment_id)).where(
        BusinessGrant.business_id == str(business_id), BusinessGrant.environment_id == settings().environment,
        Membership.user_id == session.user_id, Membership.enabled, Membership.role == "owner",
        BusinessGrant.enabled if enabled else True).execution_options(populate_existing=True))
    if value is None:
        raise ControlError(404, "not_found")
    await current_actor(tx, session, value.portfolio_id, lock=True)
    return value


async def history(tx, policy_id, session, *, containment=False):
    row = await tx.get(DisplayPolicy, str(UUID(str(policy_id))), populate_existing=True)
    if row is None or row.environment_id != settings().environment or row.user_id != session.user_id:
        raise ControlError(404, "not_found")
    owned = await grant(tx, session, row.business_id, enabled=not containment)
    if ((owned.id, owned.organization_id, owned.portfolio_id) != (row.grant_id, row.organization_id, row.portfolio_id)
            or digest(material(row)) != row.fingerprint):
        raise ControlError(409, "mail_display_policy_changed")
    return row


@asynccontextmanager
async def current(tx, policy_id, session_id, *, execution=False):
    guard(execution=execution)
    session = await tx.get(Session, str(session_id), populate_existing=True)
    if session is None or session.environment_id != settings().environment:
        raise ControlError(401, "unauthenticated")
    row = await history(tx, policy_id, session)
    if (str(session_id) != row.session_id or not row.enabled
            or row.source_revision != settings().control_source_revision
            or row.instruction_sha256 != POLICY_SHA or row.target_language != "lt"
            or (row.model, row.effort) != (MODEL, EFFORT)
            or execution and row.user_id not in settings().mail_display_actor_ids):
        raise ControlError(409, "mail_display_policy_stale")
    await source(row.source_revision)
    await tx.execute(text("SELECT set_config('pinet.business',:b,true),set_config('pinet.execution_source_revision',:s,true)"),
        {"b": row.business_id, "s": row.source_revision})
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    if row.approved_at > now or row.expires_at <= now or session.expires_at <= now or session.revoked_at:
        raise ControlError(409, "mail_display_policy_expired")
    yield row, session
    guard(execution=execution)
    await source(row.source_revision)
    await tx.refresh(row)
    await tx.refresh(session)
    await grant(tx, session, row.business_id)
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    if (not row.enabled or row.expires_at <= now or session.expires_at <= now or session.revoked_at):
        raise ControlError(409, "mail_display_policy_expired")


async def original(tx, policy, mail_id, *, lock=True):
    query = select(MailMessage).where(MailMessage.id == str(mail_id), MailMessage.business_id == policy.business_id,
        MailMessage.environment_id == policy.environment_id)
    mail = await tx.scalar(query.execution_options(populate_existing=True))
    if mail is None or mail.created_at < policy.mail_created_after:
        raise ControlError(404, "not_found")
    case_id = mail.case_id
    case_query = select(Case).where(Case.id == case_id, Case.business_id == policy.business_id,
        Case.environment_id == policy.environment_id)
    if lock:
        case_query = case_query.with_for_update(read=True)
    if await tx.scalar(case_query.execution_options(populate_existing=True)) is None:
        raise ControlError(404, "not_found")
    if lock:
        mail = await tx.scalar(query.with_for_update(read=True).execution_options(populate_existing=True))
    if mail is None or mail.case_id != case_id or mail.created_at < policy.mail_created_after:
        raise ControlError(409, "mail_display_original_changed")
    data = {**summary(mail).model_dump(mode="json"), "body": mail.payload.get("body", "")}
    if not isinstance(data["body"], str) or len(data["body"]) > 16000:
        raise ControlError(409, "mail_display_original_unavailable")
    return mail, data, source_digest(policy.business_id, policy.environment_id, data)


def checked_record(record, original, *, business_id, environment_id, expected_sha256):
    value = Record.model_validate(record)
    if ((value.business_id, value.environment, value.mail_id, value.source_sha256, value.instruction_sha256,
            value.target_language, value.model, value.reasoning_effort)
            != (business_id, environment_id, original["mail_id"], expected_sha256, POLICY_SHA, "lt", MODEL, EFFORT)
            or value.translated_at > datetime.now(UTC)):
        raise ValueError("mail_display_record_binding_changed")
    validate_text(original, value.text)
    return value
