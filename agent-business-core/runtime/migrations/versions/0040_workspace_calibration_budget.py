"""Bound native lab calls to one existing workspace Task allowance."""
from alembic import op
from sqlalchemy import text

from pinet_core.workspace_team.calibration_budget_schema import ALLOCATION, CALL, statements
from pinet_core.workspace_team.quota import accounting_sql

revision = "0040_calibration_task_budget"
down_revision = "0039_exact_build_approval"


def upgrade():
    op.execute("""DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user
      AND(rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'Calibration accounting requires trusted migration owner';END IF;END$$""")
    for sql in statements():
        op.execute(sql)


def downgrade():
    # Preserve actual provider attribution; an administrator must export/retain
    # history instead of silently deleting reservations in a rollback.
    if op.get_bind().scalar(text(f"SELECT EXISTS(SELECT 1 FROM {ALLOCATION})")):
        raise RuntimeError("Retained calibration allowances prevent destructive downgrade")
    op.execute("DROP FUNCTION workspace_calibration_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR)")
    op.execute("DROP TRIGGER calibration_team_attempt ON control_workspace_team_attempts")
    op.execute(f"DROP TABLE {CALL}")
    op.execute(f"DROP TABLE {ALLOCATION}")
    for name in ("workspace_calibration_native_event", "workspace_calibration_insert", "workspace_calibration_team_attempt"):
        op.execute(f"DROP FUNCTION {name}()")
    original = next(sql for sql in accounting_sql() if sql.startswith("CREATE FUNCTION workspace_team_daily_reserved("))
    op.execute(original.replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION", 1))
