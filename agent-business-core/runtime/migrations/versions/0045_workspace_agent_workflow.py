"""Explicit durable draft-to-one-native-scenario workflow; historical tasks inert."""
from alembic import op
from sqlalchemy import text

from pinet_core.workspace_team import workflow_schema as schema

revision = "0045_workspace_agent_workflow"
down_revision = "0044_direct_native_preview"


def predecessor():
    tx = op.get_bind()
    definition = tx.scalar(text("SELECT pg_get_functiondef('public.control_workspace_team_fence()'::regprocedure)"))
    checks = tx.execute(text("""SELECT conname AS name,pg_get_expr(conbin,conrelid) AS expression
      FROM pg_constraint WHERE conrelid='public.control_workspace_team_events'::regclass AND contype='c'""")).mappings().all()
    return definition, checks


def upgrade():
    definition, checks = predecessor()
    # Validate both exact 0044 anchors BEFORE changing any source/schema.
    patched, authors = schema.patch_fence(definition), schema.author_sql(checks)
    op.execute("ALTER TABLE control_workspace_team_events ADD COLUMN native_workflow_intent_id VARCHAR")
    for statement in schema.statements():
        op.execute(statement)
    op.execute(f"""ALTER TABLE control_workspace_team_events ADD CONSTRAINT fk_workspace_workflow_origin
      FOREIGN KEY(native_workflow_intent_id,user_id,organization_id,portfolio_id,environment_id)
      REFERENCES {schema.TABLE}(id,user_id,organization_id,portfolio_id,environment_id) ON DELETE RESTRICT""")
    for statement in authors:
        op.execute(statement)
    op.execute(patched)


def downgrade():
    if op.get_bind().scalar(text(f"SELECT EXISTS(SELECT 1 FROM {schema.TABLE})")):
        raise RuntimeError("Retained workflow history prevents destructive downgrade")
    definition, checks = predecessor()
    patched, authors = schema.patch_fence(definition, downgrade=True), schema.author_sql(checks, downgrade=True)
    op.execute(patched)
    for statement in authors:
        op.execute(statement)
    op.execute("ALTER TABLE control_workspace_team_events DROP CONSTRAINT fk_workspace_workflow_origin")
    op.execute("ALTER TABLE control_workspace_team_events DROP COLUMN native_workflow_intent_id")
    op.execute(f"DROP TABLE {schema.TABLE}")
    op.execute("DROP FUNCTION workspace_agent_workflow_fence()")
    op.execute(f"DROP FUNCTION {schema.PROOF}(VARCHAR,VARCHAR,VARCHAR,VARCHAR,BOOLEAN)")
