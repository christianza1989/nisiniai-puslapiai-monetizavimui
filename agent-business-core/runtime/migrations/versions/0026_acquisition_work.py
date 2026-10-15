"""Canonical captured correspondence and per-recipient marketing containment."""

from alembic import op
from sqlalchemy import text

from pinet_core.acquisition import work_schema

revision = "0026_acquisition_work"
down_revision = "0025_acquisition_core"


def upgrade():
    op.create_unique_constraint(
        "uq_mail_message_scope", "mail_messages", ["id", "business_id", "environment_id"]
    )
    for statement in (*work_schema.DDL, *work_schema.isolation_sql()):
        op.execute(statement)


def downgrade():
    op.execute("SET LOCAL row_security=off")
    connection = op.get_bind()
    if any(
        connection.scalar(text(f"SELECT EXISTS(SELECT 1 FROM {table} LIMIT 1)"))
        for table in work_schema.TABLES
    ):
        raise RuntimeError("Populated acquisition work downgrade refused; preserve correspondence history")
    for table in reversed(work_schema.TABLES):
        op.execute(f"DROP TABLE {table}")
    op.drop_constraint("uq_mail_message_scope", "mail_messages", type_="unique")
