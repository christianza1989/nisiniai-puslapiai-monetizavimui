"""Native episode provenance in the existing coordinator history."""
from alembic import op
from sqlalchemy import text

from pinet_core.workspace_team.episode_schema import EVENTS, PROOF, author_check_sql, patch_fence, proof_sql

revision = "0041_workspace_agent_episode"
down_revision = "0040_calibration_task_budget"


def checks():
    return op.get_bind().execute(text("""SELECT conname AS name,pg_get_expr(conbin,conrelid) AS expression
      FROM pg_constraint WHERE conrelid='public.control_workspace_team_events'::regclass AND contype='c'""")).mappings().all()


def fence():
    value = op.get_bind().scalar(text("SELECT pg_get_functiondef('public.control_workspace_team_fence()'::regprocedure)"))
    return value


def upgrade():
    # Compute both exact anchors before any source-changing DDL.
    patched, check_sql = patch_fence(fence()), author_check_sql(checks())
    op.execute(f"ALTER TABLE {EVENTS} ADD COLUMN native_episode_task_id VARCHAR")
    op.execute(f"""ALTER TABLE {EVENTS} ADD CONSTRAINT fk_workspace_native_episode_task
      FOREIGN KEY(native_episode_task_id) REFERENCES control_tasks(id) ON DELETE RESTRICT""")
    for statement in check_sql:
        op.execute(statement)
    op.execute(proof_sql())
    op.execute(f"REVOKE ALL ON FUNCTION {PROOF}(VARCHAR,VARCHAR) FROM PUBLIC")
    op.execute(f"GRANT EXECUTE ON FUNCTION {PROOF}(VARCHAR,VARCHAR) TO pinet_runtime")
    op.execute(patched)


def downgrade():
    if op.get_bind().scalar(text(f"SELECT EXISTS(SELECT 1 FROM {EVENTS} WHERE native_episode_task_id IS NOT NULL)")):
        raise RuntimeError("Retained native episode history prevents destructive downgrade")
    patched, check_sql = patch_fence(fence(), downgrade=True), author_check_sql(checks(), downgrade=True)
    op.execute(patched)
    for statement in check_sql:
        op.execute(statement)
    op.execute(f"DROP FUNCTION {PROOF}(VARCHAR,VARCHAR)")
    op.execute(f"ALTER TABLE {EVENTS} DROP CONSTRAINT fk_workspace_native_episode_task")
    op.execute(f"ALTER TABLE {EVENTS} DROP COLUMN native_episode_task_id")
