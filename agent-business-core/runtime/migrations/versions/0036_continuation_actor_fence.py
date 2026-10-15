"""Explicit late verified-account and owner-membership continuation fence."""
from alembic import op

from pinet_core.site_build.continuation_fence_schema import TABLE, statements

revision = "0036_continuation_actor_fence"
down_revision = "0035_build_continuations"


def upgrade():
    for sql in statements():
        op.execute(sql)


def downgrade():
    if op.get_bind().exec_driver_sql(f"SELECT EXISTS(SELECT 1 FROM {TABLE})").scalar():
        raise RuntimeError("Retained build continuations require their actor fence")
    op.execute(f"DROP TRIGGER build_continuation_actor_fence ON {TABLE}")
    op.execute("DROP FUNCTION control_build_continuation_actor_fence()")
