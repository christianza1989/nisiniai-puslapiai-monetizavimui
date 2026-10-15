"""Explicit append-only current-owner/current-source build continuation."""
from alembic import op

from pinet_core.site_build.continuation_schema import TABLE, statements

revision = "0035_build_continuations"
down_revision = "0034_foundation_receipts"


def upgrade():
    for sql in statements():
        op.execute(sql)


def downgrade():
    if op.get_bind().exec_driver_sql(f"SELECT EXISTS(SELECT 1 FROM {TABLE})").scalar():
        raise RuntimeError("Retained build continuations require explicit preservation")
    op.execute(f"DROP TABLE {TABLE}")
    op.execute("DROP FUNCTION control_build_continuation_fence()")
    op.execute("DROP FUNCTION control_build_continuation_immutable()")
