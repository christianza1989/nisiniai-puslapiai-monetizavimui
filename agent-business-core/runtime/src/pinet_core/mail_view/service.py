"""Fresh owner authority and tenant predicates over canonical MailMessage/Case."""
from sqlalchemy import and_, or_, select, text

from ..config import settings
from ..control.routes import ControlError
from ..models import Case, MailMessage
from ..tasks.service import grant_for
from .translations import read_translation
from .wire import MailDetail, MailPage, MailSummary


async def authorize(tx, session, business_id):
    await grant_for(tx, business_id, session.user_id)
    await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": business_id})


def predicates(business_id):
    return (MailMessage.business_id == business_id, MailMessage.environment_id == settings().environment)


def summary(row):
    p = row.payload
    if not isinstance(p, dict):
        raise ControlError(503, "mail_source_unavailable")
    return MailSummary(mail_id=row.id, case_id=row.case_id, message_id=row.message_id,
        direction=row.direction, state=row.state, created_at=row.created_at,
        sender=p.get("sender", ""), recipient=p.get("recipient", ""), subject=p.get("subject", ""),
        synthetic=p.get("synthetic") if type(p.get("synthetic")) is bool else None)


async def listing(tx, session, business_id, *, case_id=None, before=None):
    await authorize(tx, session, business_id)
    query = select(MailMessage).where(*predicates(business_id))
    if case_id:
        case = await tx.scalar(select(Case).where(Case.id == case_id, Case.business_id == business_id,
                                                  Case.environment_id == settings().environment))
        if not case:
            raise ControlError(404, "not_found")
        query = query.where(MailMessage.case_id == case_id)
    if before:
        anchor = await tx.scalar(select(MailMessage).where(*predicates(business_id), MailMessage.id == before))
        if not anchor or (case_id and anchor.case_id != case_id):
            raise ControlError(404, "not_found")
        query = query.where(or_(MailMessage.created_at < anchor.created_at,
            and_(MailMessage.created_at == anchor.created_at, MailMessage.id < anchor.id)))
    rows = list(await tx.scalars(query.order_by(MailMessage.created_at.desc(), MailMessage.id.desc()).limit(26)))
    return MailPage(business_id=business_id, case_id=case_id, items=[summary(row) for row in rows[:25]],
                    next_before=rows[24].id if len(rows) > 25 else None)


async def detail(tx, session, business_id, mail_id):
    await authorize(tx, session, business_id)
    row = await tx.scalar(select(MailMessage).where(*predicates(business_id), MailMessage.id == mail_id))
    if not row:
        raise ControlError(404, "not_found")
    original = {**summary(row).model_dump(mode="json"), "body": row.payload.get("body", "")}
    translation = None
    if settings().mail_display_tasks_enabled:
        from .task_service import projection
        translation = await projection(tx, business_id, original)
    if translation is None:
        translation = read_translation(settings().mail_display_directory, business_id, settings().environment, original)
    return MailDetail(**original, business_id=business_id, translation=translation)
