"""Explicit bounded model preparation, all0045 kinds and history preserved."""
from alembic import op
from sqlalchemy import text

from pinet_core.acquisition import model_schema as schema

revision = "0046_acquisition_model_prepare"
down_revision = "0045_workspace_agent_workflow"


def predecessor(*, downgrade=False):
    tx = op.get_bind()
    tx.execute(text("""DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND(rolsuper OR rolbypassrls))
      THEN RAISE EXCEPTION 'Model schema requires trusted migration owner';END IF;END$$"""))
    definition = tx.scalar(text("SELECT pg_get_functiondef('public.workspace_direct_task_boundary(character varying,jsonb)'::regprocedure)"))
    patched = schema.patch_boundary(definition, downgrade=downgrade)
    rows = tx.execute(text("""SELECT conname AS name,pg_get_expr(conbin,conrelid) AS expression
      FROM pg_constraint WHERE conrelid='public.control_tasks'::regclass AND contype='c'""")).mappings().all()
    for statement in schema.probe_sql():
        tx.execute(text(statement))
    probes = {key: tx.scalar(text("SELECT pg_get_expr(conbin,conrelid) FROM pg_constraint WHERE conrelid=to_regclass(:table) AND contype='c'"),
        {"table": "pinet_model_"+key+"_probe"}) for key in ("kind_old", "session_old", "business", "kind_new", "session_new")}
    return patched, schema.task_checks(rows, probes, downgrade=downgrade)


def upgrade():
    definition, checks = predecessor()
    # Both predecessor anchors are recognized before any persistent DDL changes.
    for statement in checks:
        op.execute(statement)
    op.execute(definition)
    for statement in schema.statements():
        op.execute(statement)


def downgrade():
    tx = op.get_bind()
    if tx.scalar(text("SELECT "+" OR ".join(f"EXISTS(SELECT 1 FROM {table})" for table in schema.TABLES)
            +" OR EXISTS(SELECT 1 FROM control_tasks WHERE kind=:kind)"), {"kind": schema.KIND}):
        raise RuntimeError("Retained model authorization/reservation/Task history prevents downgrade")
    definition, checks = predecessor(downgrade=True)
    for statement in schema.drop_sql():
        op.execute(statement)
    for statement in checks:
        op.execute(statement)
    op.execute(definition)
