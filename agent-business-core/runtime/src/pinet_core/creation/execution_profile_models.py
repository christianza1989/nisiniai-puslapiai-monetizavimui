"""Sparse immutable selection for new server-admitted pipeline jobs only."""
from sqlalchemy import CheckConstraint, ForeignKeyConstraint, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..models import Base
from .models import BINDING, Owned, parent


class PipelineModelProfile(Owned, Base):
    __tablename__ = "control_pipeline_model_profiles"
    profile: Mapped[str] = mapped_column(String)
    source_revision: Mapped[str] = mapped_column(String)
    session_id: Mapped[str] = mapped_column(String)
    creation_job_id: Mapped[str | None] = mapped_column(String, nullable=True)
    discovery_job_id: Mapped[str | None] = mapped_column(String, nullable=True)
    guide_job_id: Mapped[str | None] = mapped_column(String, nullable=True)
    __table_args__ = (
        UniqueConstraint(*BINDING), UniqueConstraint("creation_job_id"),
        UniqueConstraint("discovery_job_id"), UniqueConstraint("guide_job_id"),
        CheckConstraint("num_nonnulls(creation_job_id,discovery_job_id,guide_job_id)=1"),
        CheckConstraint("profile='local_sol61_high_v1'"),
        parent("control_creation_jobs", "creation_job_id"),
        parent("control_business_discovery_jobs", "discovery_job_id"),
        parent("control_content_work_jobs", "guide_job_id"),
        ForeignKeyConstraint(["session_id", "user_id", "environment_id"],
            ["control_sessions.id", "control_sessions.user_id", "control_sessions.environment_id"]),
    )
