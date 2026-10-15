from sqlalchemy import ForeignKeyConstraint, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..models import Base
from ..tasks.models import OwnedTaskScope


class ContextReceipt(OwnedTaskScope, Base):
    __tablename__ = "control_director_contexts"
    task_id: Mapped[str] = mapped_column(String)
    site_id: Mapped[str] = mapped_column(String)
    adapter_id: Mapped[str] = mapped_column(String)
    environment_class: Mapped[str] = mapped_column(String)
    input_sha256: Mapped[str] = mapped_column(String)
    data: Mapped[dict] = mapped_column(JSONB)
    __table_args__ = (
        ForeignKeyConstraint(
            ["id", "task_id", "business_id", "organization_id", "user_id", "environment_id"],
            [
                "control_task_runs." + key
                for key in ["id", "task_id", "business_id", "organization_id", "user_id", "environment_id"]
            ],
            name="fk_director_exact_run_scope",
        ),
    )
