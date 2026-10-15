"""Append-only owner-bound native Foundation observations, no runtime grants."""
from alembic import op

from pinet_core.site_build.receipt_schema import TABLE, statements

revision = "0034_foundation_receipts"
down_revision = "0033_workspace_agent_preparation"


def upgrade():
    for sql in statements():
        op.execute(sql)


def downgrade():
    if op.get_bind().exec_driver_sql(f"SELECT EXISTS(SELECT 1 FROM {TABLE})").scalar():
        raise RuntimeError("Retained Foundation observations require explicit preservation")
    op.execute(f"DROP TABLE {TABLE}")
    op.execute("DROP FUNCTION control_foundation_receipt_fence()")
    op.execute("DROP FUNCTION control_foundation_receipt_immutable()")
