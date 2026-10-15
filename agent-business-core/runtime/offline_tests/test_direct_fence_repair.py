"""Actual-PG failure regressions at source boundaries; no DB/provider execution."""
import re
from types import SimpleNamespace

from test_direct_scope import rows

from pinet_core.creation.service import binding
from pinet_core.workspace_team import direct, direct_schema


def test_trigger_name_arguments_are_explicitly_cast_to_the_declared_varchar_helpers():
    source = direct_schema.ROUTE + "\n" + "\n".join(direct_schema.guard_functions())
    assert "workspace_direct_team_check(TG_TABLE_NAME::VARCHAR,to_jsonb(NEW))" in source
    assert "workspace_direct_task_boundary(TG_TABLE_NAME::VARCHAR,to_jsonb(NEW))" in source
    assert "workspace_direct_team_check(TG_TABLE_NAME," not in source
    assert "workspace_direct_task_boundary(TG_TABLE_NAME," not in source


def test_legacy_classification_precedes_new_rls_task_lookup_without_disabling_direct_checks():
    functions = direct_schema.guard_functions()
    classifier = next(value for value in functions if value.startswith("CREATE FUNCTION workspace_direct_task_boundary("))
    guard = next(value for value in functions if value.startswith("CREATE FUNCTION workspace_direct_task_fence("))
    assert "SECURITY DEFINER" in classifier and "RETURNS VARCHAR" in classifier
    assert not re.search(r"\b(INSERT|UPDATE|DELETE)\b", classifier)
    assert "j->>'user_id' IS DISTINCT FROM current_setting('pinet.control_user',true)" in classifier
    assert "j->>'environment_id' IS DISTINCT FROM current_setting('pinet.environment',true)" in classifier
    assert "WHERE to_jsonb(t)->>k IS DISTINCT FROM j->>k" in classifier
    assert "t.kind IN('chat.consult','acquisition.reviewed_capture','workspace.team_turn')" in classifier
    assert "AND t.business_id IS NOT NULL THEN 'legacy' ELSE NULL" in classifier
    assert guard.index("IF boundary='legacy' THEN RETURN NEW") < guard.index("ELSE SELECT * INTO t FROM public.control_tasks")
    assert "workspace execution cannot downgrade a business task" in guard
    assert "current direct task authority required" in guard


def test_revoked_direct_accounting_is_failure_only_with_immutable_requests_and_runs():
    functions = direct_schema.guard_functions()
    classifier = next(value for value in functions if value.startswith("CREATE FUNCTION workspace_direct_task_boundary("))
    guard = next(value for value in functions if value.startswith("CREATE FUNCTION workspace_direct_task_fence("))
    assert "t.status IN('failed','cancelled') AND t.result IS NULL" in classifier
    assert "j->>'status'=t.status" in classifier and "j->'result'='null'::jsonb" in classifier
    assert "j->>'id'=t.run_id" in classifier and "j->>'adapter_revision'='codex-workspace-direct.v1'" in classifier
    assert "RETURN t." not in classifier and "RETURN to_jsonb" not in classifier
    terminal = guard.index("IF boundary='terminal' THEN RETURN NEW")
    assert guard.index("immutable direct task request") < terminal
    assert guard.index("immutable direct run binding") < terminal
    assert guard.index("current direct task authority required") > terminal
    assert "REVOKE ALL ON FUNCTION workspace_direct_task_boundary(VARCHAR,JSONB) FROM PUBLIC" in functions


async def test_immutable_chat_lock_option_keeps_parent_authority_without_requesting_update_permission(monkeypatch):
    chat, _ = rows()
    row = SimpleNamespace(id=chat.parent_topic_id, **binding(chat))
    observed = []
    async def parent(tx, session, portfolio, topic, *, lock=False):
        observed.append(lock)
        return row
    async def ready(tx):
        return True
    class Reads:
        async def scalar(self, statement):
            assert statement._for_update_arg is None
            return chat
    monkeypatch.setattr(direct, "parent", parent)
    monkeypatch.setattr(direct, "schema_ready", ready)
    assert await direct.owned(Reads(), object(), chat.portfolio_id, chat.parent_topic_id, chat.id, lock=True) == (row, chat)
    assert observed == [True]
    source = "\n".join(direct_schema.migration_statements())
    assert "GRANT SELECT,INSERT ON control_workspace_direct_chats TO pinet_runtime" in source
    assert "GRANT UPDATE ON control_workspace_direct_chats" not in source
