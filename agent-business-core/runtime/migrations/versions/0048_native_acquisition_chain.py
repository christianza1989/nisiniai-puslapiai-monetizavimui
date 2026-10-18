"""Typed native research handoff and reply, retaining all old0047 history."""
from alembic import op
from sqlalchemy import text

from pinet_core.acquisition import native_schema as schema
from pinet_core.mail_view import task_schema as previous

revision = "0048_native_acquisition_chain"
down_revision = "0047_mail_display_tasks"


def upgrade():
    tx = op.get_bind()
    tx.execute(text("""DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND(rolsuper OR rolbypassrls))
      THEN RAISE EXCEPTION 'Native chain requires trusted migration owner';END IF;END$$"""))
    definitions = {key: schema.extend(tx.scalar(text("SELECT pg_get_functiondef(to_regprocedure(:name))"),
        {"name": key}), mode) for key, mode in schema.FUNCTIONS.items()}
    boundary = tx.scalar(text("SELECT pg_get_functiondef('workspace_direct_task_boundary(varchar,jsonb)'::regprocedure)"))
    if boundary.count(previous.BOUNDARY_AFTER) != 1:
        raise RuntimeError("Unknown0047 business boundary")
    boundary = boundary.replace(previous.BOUNDARY_AFTER, previous.BOUNDARY_AFTER.replace(
        "'mail.display_translate')", "'mail.display_translate','acquisition.model_reply')"))
    for sql in previous.probe_sql():
        tx.execute(text(sql))
    for name, probe, expression in (
        ("control_tasks_kind_check", "kind_new", f"({previous.OLD_KIND}) OR kind='mail.display_translate' OR kind='{schema.REPLY}'"),
        ("control_tasks_session_kind_check", "session_new", f"({previous.OLD_SESSION}) OR(kind IN('mail.display_translate','{schema.REPLY}') AND session_id IS NOT NULL AND business_id IS NOT NULL)")):
        actual = tx.scalar(text("SELECT pg_get_expr(conbin,conrelid) FROM pg_constraint WHERE conrelid='control_tasks'::regclass AND conname=:n"), {"n": name})
        expected = tx.scalar(text("SELECT pg_get_expr(conbin,conrelid) FROM pg_constraint WHERE conrelid=to_regclass(:n) AND contype='c'"), {"n": "pinet_display_"+probe+"_probe"})
        if actual != expected:
            raise RuntimeError("Unknown0047 Task CHECK")
        op.execute(f"ALTER TABLE control_tasks DROP CONSTRAINT {name}")
        op.execute(f"ALTER TABLE control_tasks ADD CONSTRAINT {name} CHECK({expression})")
    op.execute(boundary)
    op.execute("ALTER TABLE acquisition_model_task_bindings DROP CONSTRAINT acquisition_model_task_bindings_kind_check")
    op.execute("ALTER TABLE acquisition_model_task_bindings ADD CONSTRAINT acquisition_model_task_bindings_kind_check CHECK(kind IN('acquisition.model_prepare','acquisition.model_reply'))")
    op.execute("ALTER TABLE acquisition_model_attempts DROP CONSTRAINT acquisition_model_attempts_role_check")
    op.execute("ALTER TABLE acquisition_model_attempts ADD CONSTRAINT acquisition_model_attempts_role_check CHECK(role IN('researcher','writer','reviewer','reply_coordinator'))")
    for sql in schema.helpers():
        op.execute(sql)
    for sql in definitions.values():
        op.execute(sql)
    op.execute("""CREATE UNIQUE INDEX uq_acquisition_native_stage ON acquisition_model_task_bindings
      (business_id,environment_id,(input->'campaign'->>'campaign_id'),(input->'prospect'->>'organization_key'),(input->>'stage'))
      WHERE kind='acquisition.model_prepare' AND input->>'stage' IN('research','email')""")
    op.execute("""CREATE UNIQUE INDEX uq_acquisition_native_inbound ON acquisition_model_task_bindings
      (business_id,environment_id,(input->>'thread_id'),(input->>'inbound_id')) WHERE kind='acquisition.model_reply'""")
    for signature in ("acquisition_native_pair_current(jsonb,varchar)", "acquisition_native_handoff_current(jsonb)",
            "acquisition_native_task_current(varchar)", "acquisition_native_role_allowed(varchar,varchar,integer)"):
        op.execute(f"REVOKE ALL ON FUNCTION {signature} FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION acquisition_native_pair_current(jsonb,varchar) TO pinet_runtime")


def downgrade():
    raise RuntimeError("Native chain retains phase/reply history; use scoped source rollback, never erase attempts")
