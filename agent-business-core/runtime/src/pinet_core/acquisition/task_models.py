"""Immutable scoped input binding to a real generic owned task, never a Conversation."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..models import Base
from .task_schema import TABLE
from .work_models import KEY_FIELDS, WorkScope


class TaskBinding(WorkScope, Base):
    __tablename__ = TABLE
    task_id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[str] = mapped_column(String)
    user_id: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String)
    input: Mapped[dict] = mapped_column(JSONB)
    input_sha256: Mapped[str] = mapped_column(String)
    registration_sha256: Mapped[str] = mapped_column(String)
    campaign_id: Mapped[str] = mapped_column(String)
    prospect_id: Mapped[str] = mapped_column(String)
    campaign_day: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint(*KEY_FIELDS, "campaign_id", "prospect_id"),
        ForeignKeyConstraint(
            ["task_id", "business_id", "organization_id", "user_id", "environment_id", "kind"],
            [
                f"control_tasks.{c}"
                for c in ["id", "business_id", "organization_id", "user_id", "environment_id", "kind"]
            ],
        ),
    )
