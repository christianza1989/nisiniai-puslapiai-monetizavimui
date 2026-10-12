"""Typed module-approved synthetic work on the existing durable task runner."""

from alembic import op
from sqlalchemy import text

from pinet_core.acquisition.task_schema import DDL, KIND, TABLE, isolation_sql

revision = "0027_acquisition_tasks"
down_revision = "0026_acquisition_work"


def upgrade():
    op.execute("ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_kind_check")
    op.execute(
        f"ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_kind_check CHECK(kind IN ('chat.consult','{KIND}'))"
    )
    op.execute("ALTER TABLE control_tasks ALTER COLUMN session_id DROP NOT NULL")
    op.execute(
        f"ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_session_kind_check CHECK((kind='chat.consult' AND session_id IS NOT NULL) OR (kind='{KIND}' AND session_id IS NULL))"
    )
    op.execute(
        "ALTER TABLE control_tasks ADD CONSTRAINT uq_control_task_kind_scope UNIQUE(id,business_id,organization_id,user_id,environment_id,kind)"
    )
    op.execute(DDL)
    for sql in isolation_sql():
        op.execute(sql)


def downgrade():
    connection = op.get_bind()
    if connection.scalar(
        text(f"SELECT EXISTS(SELECT 1 FROM {TABLE}) OR EXISTS(SELECT 1 FROM control_tasks WHERE kind=:kind)"),
        {"kind": KIND},
    ):
        raise RuntimeError("Populated acquisition tasks cannot be downgraded")
    op.execute(f"DROP TABLE {TABLE}")
    op.execute("ALTER TABLE control_tasks DROP CONSTRAINT uq_control_task_kind_scope")
    op.execute("ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_session_kind_check")
    op.execute("ALTER TABLE control_tasks ALTER COLUMN session_id SET NOT NULL")
    op.execute("ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_kind_check")
    op.execute("ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_kind_check CHECK(kind='chat.consult')")
