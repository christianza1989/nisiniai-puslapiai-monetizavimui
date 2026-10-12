"""Exact Run input evidence for source-fixed acquisition reads in consultations."""

from alembic import op
from sqlalchemy import text

from pinet_core.director.schema import DDL, TABLE, isolation_sql

revision = "0028_director_read"
down_revision = "0027_acquisition_tasks"


def upgrade():
    # The accounting-only helper must still see its own attempt after grant revocation.
    # Give the trusted migration owner this authority, never the application role.
    op.execute("""DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles
        WHERE rolname=current_user AND (rolsuper OR rolbypassrls)) THEN
        RAISE EXCEPTION 'Director migration requires a trusted RLS-bypass owner';
        END IF; END $$""")
    op.execute(
        "ALTER TABLE control_task_runs ADD CONSTRAINT uq_control_run_task_scope UNIQUE(id,task_id,business_id,organization_id,user_id,environment_id)"
    )
    op.execute(DDL)
    for statement in isolation_sql():
        op.execute(statement)


def downgrade():
    op.execute("SET LOCAL row_security=off")
    if op.get_bind().scalar(text(f"SELECT EXISTS(SELECT 1 FROM {TABLE})")):
        raise RuntimeError("Populated director input history cannot be downgraded")
    op.execute(f"DROP TABLE {TABLE}")
    op.execute("DROP FUNCTION director_pin_reader(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR)")
    op.execute(
        "DROP FUNCTION director_settle_revoked_task(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,VARCHAR)"
    )
    op.execute("DROP FUNCTION director_context_exists(VARCHAR,VARCHAR,VARCHAR)")
    op.execute("ALTER TABLE control_task_runs DROP CONSTRAINT uq_control_run_task_scope")
