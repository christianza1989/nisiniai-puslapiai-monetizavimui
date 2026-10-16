"""Explicit incremental native preview and per-transcript Quality, legacy rules preserved."""
from alembic import op
from sqlalchemy import text

from pinet_core.workspace_team import direct_preview_schema as schema

revision = "0044_direct_native_preview"
down_revision = "0043_workspace_direct"


def upgrade():
    op.execute("""DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND(rolsuper OR rolbypassrls))
      THEN RAISE EXCEPTION 'Native preview migration requires trusted RLS-bypass owner';END IF;END$$""")
    tx = op.get_bind()
    functions = {}
    for signature, patcher in (
            ("public.workspace_direct_task_boundary(character varying,jsonb)", schema.boundary_patch),
            ("public.workspace_direct_task_fence()", schema.task_patch),
            ("public.workspace_direct_team_check(character varying,jsonb)", schema.team_patch),
            ("public.control_workspace_team_fence()", schema.global_team_patch),
            ("public.workspace_calibration_insert()", schema.allocation_patch),
            ("public.workspace_direct_release_queue(character varying,character varying,character varying)", schema.release_patch)):
        functions[signature] = patcher(tx.scalar(text("SELECT pg_get_functiondef(to_regprocedure(:s))"), {"s": signature}))
    checks = tx.execute(text("""SELECT conname AS name,pg_get_expr(conbin,conrelid) AS expression FROM pg_constraint
      WHERE conrelid='public.control_workspace_team_events'::regclass AND contype='c'""")).mappings().all()
    authors = schema.author_sql(checks)
    # Compile the fixed original and pg_dump/restore predecessors on this
    # PostgreSQL version. Keep exact expression matching and reject ambiguity.
    for statement in schema.author_enum_probes():
        tx.execute(text(statement))
    expected = list(tx.scalars(text("SELECT pg_get_expr(conbin,conrelid) FROM pg_constraint WHERE conrelid IN('pinet_direct_author_probe'::regclass,'pinet_direct_author_restore_probe'::regclass) AND contype='c'")))
    enum_name = schema.author_enum_constraint(checks, expected)
    unique = tx.execute(text("""SELECT c.conname AS name FROM pg_constraint c
      WHERE c.conrelid='public.jobs'::regclass AND c.contype='u' AND ARRAY(
        SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(attnum,n)
        JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.n)=ARRAY['conversation_id','kind']""")).mappings().all()
    if len(unique) != 1:
        raise RuntimeError("Unknown/ambiguous global Job unique constraint")
    def quoted(value):
        return '"' + value.replace('"', '""') + '"'
    for statement in schema.extra_sql():
        op.execute(statement)
    op.execute("ALTER TABLE jobs DROP CONSTRAINT " + quoted(unique[0]["name"]))
    for statement in schema.job_indexes():
        op.execute(statement)
    for statement in authors:
        op.execute(statement)
    op.execute("ALTER TABLE control_workspace_team_events DROP CONSTRAINT " + quoted(enum_name))
    op.execute("ALTER TABLE control_workspace_team_events ADD CONSTRAINT " + quoted(enum_name) + " CHECK(author_type IN('user','coordinator','adviser','saved_agent'))")
    for statement in functions.values():
        op.execute(statement)


def downgrade():
    raise RuntimeError("Native preview schema rollback must preserve Conversation/Task/Quality history; use scoped source rollback")
