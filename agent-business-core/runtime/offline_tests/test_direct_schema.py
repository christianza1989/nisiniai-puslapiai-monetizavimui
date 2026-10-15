"""Canonical SQL preservation and fail-closed anchors; not PostgreSQL execution."""
import copy

import pytest

from pinet_core.tasks.models import Task
from pinet_core.workspace_team import direct_schema as direct
from pinet_core.workspace_team import episode_schema as native
from pinet_core.workspace_team import schema as legacy


def current_fence():
    old = next(value for value in legacy.protections() if value.startswith("CREATE FUNCTION control_workspace_team_fence()"))
    return native.patch_fence(old.replace("FUNCTION control_workspace_team_fence()", "FUNCTION public.control_workspace_team_fence()", 1))


def test_direct_fence_roundtrip_preserves_entire_current_business_and_native_episode_body():
    original = current_fence()
    patched = direct.patch_team_fence(original)
    assert patched.count(native.NATIVE_BRANCH) == 1
    assert original.replace(direct.ENTRY, direct.ROUTE, 1) == patched
    assert direct.patch_team_fence(patched, downgrade=True) == original
    for value in (original.replace("BEGIN", "UNKNOWN", 1), original + original, patched,
            original.replace(native.NATIVE_BRANCH, native.ATTEMPT_BRANCH)):
        with pytest.raises(RuntimeError):
            direct.patch_team_fence(value)


def test_phase_extension_recognizes_only_the_three_old_exact_ordinal_pairs():
    expression = "(((ordinal = 1) AND ((phase)::text = 'plan'::text)) OR ((ordinal = 2) AND ((phase)::text = 'adviser'::text)) OR ((ordinal = 3) AND ((phase)::text = 'synthesis'::text)))"
    rows = [{"name": "actual_phase_check", "expression": expression}]
    assert native.normalized_check(expression) is None  # legacy author parser default unchanged
    assert native.normalized_check(expression, numeric=True) == native.normalized_check(direct.OLD_PHASE, numeric=True)
    statements = direct.phase_check_sql(rows)
    assert "(ordinal=1 AND phase='direct')" in statements[-1]
    assert direct.phase_check_sql([{"name": "actual_phase_check", "expression": direct.NEW_PHASE}], downgrade=True)[-1].endswith("CHECK(" + direct.OLD_PHASE + ")")
    for bad in ([], rows + copy.deepcopy(rows), [{"name": "changed", "expression": expression.replace("ordinal = 2", "ordinal = 1")}],
            [{"name": "unknown", "expression": expression + " OR TRUE"}]):
        with pytest.raises(RuntimeError):
            direct.phase_check_sql(bad)


def test_nullable_orm_business_is_backed_by_new_kind_only_sql_union_and_null_safe_parents():
    assert Task.__table__.c.business_id.nullable
    statements = direct.migration_statements()
    source = "\n".join(statements)
    assert "CHECK(business_id IS NOT NULL OR kind='workspace.direct_turn')" in source
    assert "IS DISTINCT FROM c.business_id" in source
    assert "workspace execution cannot downgrade a business task" in source
    assert "c.mode<>'consultant'" in source
    assert "CREATE POLICY direct_workspace_scope" in source
    assert "FORCE ROW LEVEL SECURITY" in source
    assert "GRANT SELECT,INSERT ON control_workspace_direct_chats" in source
    assert "GRANT UPDATE ON control_workspace_direct_chats" not in source
    assert "BEFORE UPDATE OR DELETE" in source
    assert "same-chat reply" in source


def test_shared_quota_adds_only_one_unconsumed_direct_hold_and_preserves_native_counts():
    from pinet_core.workspace_team.calibration_budget_schema import daily_sql
    original = daily_sql()
    patched = direct.daily_sql()
    start = patched.index("        +(SELECT coalesce(sum(greatest(0,1-")
    end = patched.index("        +(SELECT count(*) FROM public.control_task_runs", start)
    assert patched[:start] + patched[end:] == original
    assert "control_workspace_calibration_calls" in patched
    assert "call_limit-" in patched
    assert "t.kind='workspace.direct_turn'" in patched


def test_revoked_settlement_adds_null_safe_direct_only_without_changing_old_kind_join():
    from pinet_core.director.schema import SETTLE
    source = direct.revoked_settle_sql()
    assert "'workspace.direct_turn'" in source
    assert "business_id=t.business_id OR(k='workspace.direct_turn' AND business_id IS NOT DISTINCT FROM t.business_id)" in source
    assert "usage=coalesce(usage,j)" in source and "result=NULL" in source
    assert "k NOT IN ('chat.consult','acquisition.reviewed_capture','workspace.team_turn')" in SETTLE
