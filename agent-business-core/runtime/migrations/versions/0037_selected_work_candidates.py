"""Exact selected parent before the existing global candidate bounds."""
from alembic import op

from pinet_core.site_build.selectors import KINDS, statements

revision = "0037_selected_work_candidates"
down_revision = "0036_continuation_actor_fence"


def upgrade():
    for sql in statements():
        op.execute(sql)


def downgrade():
    for function, _, _ in KINDS.values():
        op.execute(f"DROP FUNCTION {function}(VARCHAR,VARCHAR)")
