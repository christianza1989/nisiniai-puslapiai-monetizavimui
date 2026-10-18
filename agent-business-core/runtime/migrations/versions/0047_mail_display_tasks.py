"""Separate durable LT display permission/job on unchanged common TaskRun."""
from alembic import op
from sqlalchemy import text

from pinet_core.mail_view import task_schema as schema

revision="0047_mail_display_tasks"
down_revision="0046_acquisition_model_prepare"


def predecessor(*,downgrade=False):
    tx=op.get_bind()
    tx.execute(text("""DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND(rolsuper OR rolbypassrls))
      THEN RAISE EXCEPTION 'Display schema requires trusted migration owner';END IF;END$$"""))
    definition=tx.scalar(text("SELECT pg_get_functiondef('public.workspace_direct_task_boundary(varchar,jsonb)'::regprocedure)"))
    patched=schema.patch_boundary(definition,downgrade=downgrade)
    rows=tx.execute(text("SELECT conname AS name,pg_get_expr(conbin,conrelid) AS expression FROM pg_constraint WHERE conrelid='public.control_tasks'::regclass AND contype='c'")).mappings().all()
    for sql in schema.probe_sql():
        tx.execute(text(sql))
    probes={key:tx.scalar(text("SELECT pg_get_expr(conbin,conrelid) FROM pg_constraint WHERE conrelid=to_regclass(:t) AND contype='c'"),
        {"t":"pinet_display_"+key+"_probe"}) for key in ("kind_old","session_old","business","kind_new","session_new")}
    return patched,schema.task_checks(rows,probes,downgrade=downgrade)


def upgrade():
    definition,checks=predecessor()
    for sql in (*checks,definition,*schema.statements()):
        op.execute(sql)


def downgrade():
    tx=op.get_bind()
    if tx.scalar(text("SELECT "+" OR ".join(f"EXISTS(SELECT 1 FROM {table})" for table in schema.TABLES)
        +" OR EXISTS(SELECT 1 FROM control_tasks WHERE kind=:k)"),{"k":schema.KIND}):
        raise RuntimeError("Retained display policy/job/Task history prevents downgrade")
    definition,checks=predecessor(downgrade=True)
    for sql in (*schema.drop_sql(),*checks,definition):
        op.execute(sql)
