"""Explicit direct consultant workspace scope on the maintained Task ledger."""
from alembic import op
from sqlalchemy import text

from pinet_core.workspace_team.direct_schema import (
    KIND,
    TABLE,
    migration_statements,
    patch_team_fence,
    phase_check_sql,
)

revision = "0043_workspace_direct"
down_revision = "0042_creation_private_preview"


def upgrade():
    op.execute("""DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND(rolsuper OR rolbypassrls))
      THEN RAISE EXCEPTION 'Direct accounting requires a trusted RLS-bypass migration owner';END IF;END$$""")
    connection = op.get_bind()
    definition = connection.scalar(text("SELECT pg_get_functiondef('public.control_workspace_team_fence()'::regprocedure)"))
    checks = connection.execute(text("""SELECT conname AS name,pg_get_expr(conbin,conrelid) AS expression
      FROM pg_constraint WHERE conrelid='public.control_workspace_team_attempts'::regclass AND contype='c'""")).mappings().all()
    # Recognize both old anchors before changing any application schema.
    patched, phase = patch_team_fence(definition), phase_check_sql(checks)
    for statement in migration_statements():
        op.execute(statement)
    for statement in phase:
        op.execute(statement)
    op.execute(patched)


def downgrade():
    # No destructive migration over a real chat, receipt, usage or workspace row.
    if op.get_bind().scalar(text(f"SELECT EXISTS(SELECT 1 FROM {TABLE}) OR EXISTS(SELECT 1 FROM control_tasks WHERE kind=:k OR business_id IS NULL)"), {"k": KIND}):
        raise RuntimeError("Retained direct/workspace history prevents downgrade; preserve it and use a scoped source rollback")
    raise RuntimeError("Direct schema removal requires a separately reviewed empty-database preservation migration")
