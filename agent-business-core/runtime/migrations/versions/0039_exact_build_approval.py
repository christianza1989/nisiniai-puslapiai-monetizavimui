"""Select an exact approved case before its limit; preserve0030 and all rows."""
from alembic import op

from pinet_core.site_build.approval_selectors import statements

revision = "0039_exact_build_approval"
down_revision = "0038_pipeline_model_profiles"


def upgrade():
    for sql in statements():
        op.execute(sql)


def downgrade():
    op.execute("DROP FUNCTION control_site_build_candidates(VARCHAR,VARCHAR)")
