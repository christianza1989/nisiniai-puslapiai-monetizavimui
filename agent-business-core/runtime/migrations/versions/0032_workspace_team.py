"""Scoped team turns reuse the maintained tasks/worker rather than another executor."""
from alembic import op

from pinet_core.director.schema import SETTLE
from pinet_core.workspace_team.quota import accounting_sql
from pinet_core.workspace_team.schema import TABLES, statements

revision = "0032_workspace_team"
down_revision = "0031_workspace_topics"


def upgrade():
    op.execute("""DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND(rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'Team accounting requires a trusted RLS-bypass migration owner';END IF;END$$""")
    op.execute("ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_kind_check")
    op.execute("ALTER TABLE control_tasks ADD CONSTRAINT uq_control_task_thread_kind_scope UNIQUE(id,business_id,organization_id,user_id,environment_id,thread_id,kind)")
    op.execute("ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_kind_check CHECK(kind IN('chat.consult','acquisition.reviewed_capture','workspace.team_turn'))")
    op.execute("ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_message_check")
    op.execute("ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_message_check CHECK(length(message) BETWEEN 1 AND CASE WHEN kind='workspace.team_turn' THEN 2500 ELSE 1000 END)")
    op.execute("ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_session_kind_check")
    op.execute("ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_session_kind_check CHECK((kind IN('chat.consult','workspace.team_turn') AND session_id IS NOT NULL) OR(kind='acquisition.reviewed_capture' AND session_id IS NULL))")
    for sql in statements():
        op.execute(sql)
    for sql in accounting_sql():
        op.execute(sql)
    op.execute(SETTLE.replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION", 1))


def downgrade():
    # No destructive downgrade over retained turns/history/accounting.
    for table in TABLES:
        if op.get_bind().exec_driver_sql(f"SELECT EXISTS(SELECT 1 FROM {table})").scalar():
            raise RuntimeError("Retained workspace team data requires explicit preservation")
    op.execute("ALTER TABLE control_workspace_team_turns DROP CONSTRAINT fk_workspace_team_owner_event")
    for table in reversed(TABLES):
        op.execute(f"DROP TABLE {table}")
    op.execute("DROP FUNCTION control_workspace_team_mutation()")
    op.execute("DROP FUNCTION control_workspace_team_fence()")
    op.execute("DROP FUNCTION workspace_team_daily_reserved(VARCHAR,VARCHAR)")
    op.execute("DROP FUNCTION workspace_team_settle_attempt(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB)")
    op.execute("DROP FUNCTION workspace_team_actor_busy(VARCHAR,VARCHAR)")
    op.execute("DROP FUNCTION workspace_team_release_queue(VARCHAR,VARCHAR,VARCHAR)")
    op.execute("DROP FUNCTION workspace_team_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR)")
    op.execute(SETTLE.replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION", 1).replace(",\u0027workspace.team_turn\u0027", ""))
    op.execute("ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_session_kind_check")
    op.execute("ALTER TABLE control_tasks DROP CONSTRAINT uq_control_task_thread_kind_scope")
    op.execute("ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_kind_check")
    op.execute("ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_message_check")
    op.execute("ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_message_check CHECK(length(message) BETWEEN 1 AND 1000)")
    op.execute("ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_kind_check CHECK(kind IN('chat.consult','acquisition.reviewed_capture'))")
    op.execute("ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_session_kind_check CHECK((kind='chat.consult' AND session_id IS NOT NULL) OR(kind='acquisition.reviewed_capture' AND session_id IS NULL))")
