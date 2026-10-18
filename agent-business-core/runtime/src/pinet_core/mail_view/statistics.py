"""One bounded, content-free aggregate over the existing canonical mail store.

Creation time selects records; their current state is observed at read time.
This is neither a transport-event time series nor campaign/cohort attribution.
"""
from sqlalchemy import and_, case, func, select

from ..models import MailMessage
from .service import authorize, predicates
from .statistics_wire import MailStatistics, RecordCounts

GROUPS = ("non_synthetic", "synthetic", "unclassified")
OUTBOUND = ("draft", "sending", "accepted_by_smtp", "accepted_by_gmail", "rejected", "delivery_unknown")
INBOUND = ("received", "captured")


def statement(business_id, window):
    flag = MailMessage.payload["synthetic"]
    # JSON type is mandatory: string "false", numeric0, null, arrays and absent
    # values cannot become commercial provenance through a SQL boolean cast.
    provenance = case(
        (and_(func.jsonb_typeof(flag) == "boolean", flag.astext == "false"), "non_synthetic"),
        (and_(func.jsonb_typeof(flag) == "boolean", flag.astext == "true"), "synthetic"),
        else_="unclassified")
    kind = case(
        *[(and_(MailMessage.direction == "outbound", MailMessage.state == value), "outbound_" + value)
          for value in OUTBOUND],
        *[(and_(MailMessage.direction == "inbound", MailMessage.state == value), "inbound_" + value)
          for value in INBOUND],
        (MailMessage.direction == "outbound", "outbound_other"),
        (MailMessage.direction == "inbound", "inbound_other"),
        else_="other_direction")
    # Group only fixed labels, never user state/subject/body/address text. Even
    # arbitrarily many unknown states yield at most3*11aggregate result rows.
    return select(provenance, kind, func.count()).where(
        *predicates(business_id), MailMessage.created_at >= window.start,
        MailMessage.created_at < window.end).group_by(provenance, kind)


def projection(business_id, window, rows):
    groups = {name: RecordCounts().model_dump() for name in GROUPS}
    for group, kind, count in rows:
        if group not in groups or kind == "total" or kind not in groups[group] or type(count) is not int or count < 0:
            raise ValueError("invalid_statistics_source")
        groups[group][kind] += count
        groups[group]["total"] += count
    provider = {name: {"reason": "no_provider_event_source"}
                for name in ("delivered", "bounced", "opened", "clicked")}
    provider.update({name: {"reason": "not_derived_from_record_snapshot"}
                     for name in ("human_replies", "unique_recipients", "reply_rate")})
    return MailStatistics(business_id=business_id, window=window, records=groups, provider_metrics=provider)


async def read(tx, session, business_id, window):
    await authorize(tx, session, business_id)
    return projection(business_id, window, (await tx.execute(statement(business_id, window))).all())
