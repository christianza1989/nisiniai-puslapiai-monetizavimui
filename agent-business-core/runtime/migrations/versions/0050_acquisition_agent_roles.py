"""Six exact saved agents share common Task/Run/attempt history; no channel rights."""

from alembic import op
from sqlalchemy import text

from pinet_core.acquisition import agent_role_schema as schema
from pinet_core.acquisition.native_schema import FUNCTIONS

revision = "0050_acquisition_agent_roles"
down_revision = "0049_existing_business_agents"


def upgrade():
    tx = op.get_bind()
    tx.execute(
        text("""DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND(rolsuper OR rolbypassrls))
      THEN RAISE EXCEPTION 'Agent roles require trusted migration owner';END IF;END$$""")
    )
    definitions = {
        name: schema.extend(
            tx.scalar(text("SELECT pg_get_functiondef(to_regprocedure(:n))"), {"n": name}), mode
        )
        for name, mode in FUNCTIONS.items()
    }
    boundary = schema.patch_boundary(
        tx.scalar(
            text("SELECT pg_get_functiondef('workspace_direct_task_boundary(varchar,jsonb)'::regprocedure)")
        )
    )
    native_task = schema.extend_native_task(
        tx.scalar(text("SELECT pg_get_functiondef('acquisition_native_task_current(varchar)'::regprocedure)"))
    )
    native_role = schema.extend_native_role(
        tx.scalar(
            text(
                "SELECT pg_get_functiondef('acquisition_native_role_allowed(varchar,varchar,integer)'::regprocedure)"
            )
        )
    )
    op.execute("ALTER TABLE acquisition_model_authorizations ADD COLUMN execution_role VARCHAR")
    op.execute(
        "ALTER TABLE acquisition_model_authorizations DROP CONSTRAINT acquisition_model_authorizations_purpose_check"
    )
    op.execute("""ALTER TABLE acquisition_model_authorizations ADD CONSTRAINT acquisition_model_authorizations_purpose_check CHECK(
      (execution_role IS NULL AND purpose IN('customer_research','email'))
      OR(execution_role IS NOT NULL AND((execution_role IN('research','qualification') AND purpose='customer_research')
        OR(execution_role IN('writer','reply') AND purpose='email')
        OR(execution_role IN('quality','coordinator') AND purpose='custom'))))""")
    for name in ("control_tasks_kind_check", "control_tasks_session_kind_check"):
        expression = tx.scalar(
            text(
                "SELECT pg_get_expr(conbin,conrelid) FROM pg_constraint WHERE conrelid='control_tasks'::regclass AND conname=:n"
            ),
            {"n": name},
        )
        if not expression or schema.KIND in expression or "acquisition.model_reply" not in expression:
            raise RuntimeError("unknown_agent_role_task_check")
        extra = f"kind='{schema.KIND}'"
        if name == "control_tasks_session_kind_check":
            extra += " AND session_id IS NOT NULL AND business_id IS NOT NULL"
        op.execute(f"ALTER TABLE control_tasks DROP CONSTRAINT {name}")
        op.execute(f"ALTER TABLE control_tasks ADD CONSTRAINT {name} CHECK(({expression}) OR({extra}))")
    op.execute(
        "ALTER TABLE acquisition_model_task_bindings DROP CONSTRAINT acquisition_model_task_bindings_kind_check"
    )
    op.execute(
        "ALTER TABLE acquisition_model_task_bindings ADD CONSTRAINT acquisition_model_task_bindings_kind_check CHECK(kind IN('acquisition.model_prepare','acquisition.model_reply','acquisition.agent_role'))"
    )
    op.execute("ALTER TABLE acquisition_model_attempts DROP CONSTRAINT acquisition_model_attempts_role_check")
    op.execute(
        "ALTER TABLE acquisition_model_attempts ADD CONSTRAINT acquisition_model_attempts_role_check CHECK(role IN('researcher','writer','reviewer','reply_coordinator','research','qualification','reply','quality','coordinator'))"
    )
    op.execute(schema.input_current_sql())
    for sql in (*definitions.values(), native_task, native_role, boundary):
        op.execute(sql)
    op.execute("REVOKE ALL ON FUNCTION acquisition_agent_role_input_current(JSONB,VARCHAR) FROM PUBLIC")
    op.execute(
        "GRANT EXECUTE ON FUNCTION acquisition_agent_role_input_current(JSONB,VARCHAR) TO pinet_runtime"
    )
    op.execute("""CREATE UNIQUE INDEX uq_acquisition_exact_agent_role ON acquisition_model_task_bindings
      (business_id,environment_id,authorization_id,(input->'campaign'->>'campaign_id'),
       (input->'prospect'->>'organization_key'),(input->>'role'),(input->'parents')) WHERE kind='acquisition.agent_role'""")


def downgrade():
    raise RuntimeError("Retained six-role history; use exact Config/source rollback, never erase attempts")
