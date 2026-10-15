"""Known SQL predecessor preservation and opt-in index semantics; never PG proof."""
import pytest
from test_direct_schema import current_fence

from pinet_core.workspace_team import calibration_budget_schema, direct_preview_schema, direct_schema
from pinet_core.workspace_team.episode_schema import NATIVE_BRANCH, NEW_AUTHOR_CHECK


def public(source, name):
    return source.replace("FUNCTION " + name + "(", "FUNCTION public." + name + "(", 1)


def test_exact_preview_patches_refuse_unknown_already_patched_or_ambiguous_predecessors():
    task = next(value for value in direct_schema.guard_functions() if value.startswith("CREATE FUNCTION workspace_direct_task_fence("))
    team = next(value for value in direct_schema.guard_functions() if value.startswith("CREATE FUNCTION workspace_direct_team_check("))
    allocation = next(value for value in calibration_budget_schema.protections() if value.startswith("CREATE FUNCTION workspace_calibration_insert("))
    values = [(direct_preview_schema.task_patch, public(task, "workspace_direct_task_fence")),
        (direct_preview_schema.team_patch, public(team, "workspace_direct_team_check")),
        (direct_preview_schema.allocation_patch, public(allocation, "workspace_calibration_insert")),
        (direct_preview_schema.release_patch, public(direct_schema.release_sql(), "workspace_direct_release_queue")),
        (direct_preview_schema.global_team_patch, direct_schema.patch_team_fence(current_fence()))]
    for patcher, source in values:
        result = patcher(source)
        assert result != source and ("agent_preview" in result or "saved_agent" in result)
        for bad in (source + source, result, source.replace("FUNCTION public.", "FUNCTION unknown.", 1)):
            with pytest.raises(RuntimeError):
                patcher(bad)
    native = values[-1][0](values[-1][1])
    assert native.count(NATIVE_BRANCH) == 1
    assert values[-1][1][values[-1][1].index("IF TG_TABLE_NAME='control_workspace_team_attempts'"):] in native
    old_body = allocation[allocation.index("SELECT * INTO t FROM public.control_tasks"):]
    assert old_body in values[2][0](values[2][1])


def test_author_constraint_adds_only_actual_saved_agent_form_and_keeps_full_legacy_native_form():
    statements = direct_preview_schema.author_sql([{"name": 'actual"check', "expression": NEW_AUTHOR_CHECK}])
    assert 'DROP CONSTRAINT "actual""check"' in statements[0]
    assert NEW_AUTHOR_CHECK in statements[1]
    assert "author_type='saved_agent'" in statements[1] and "participant_id IS NULL" in statements[1]
    for rows in ([], [{"name": "wrong", "expression": "TRUE"}],
            [{"name": "a", "expression": NEW_AUTHOR_CHECK}, {"name": "b", "expression": NEW_AUTHOR_CHECK}]):
        with pytest.raises(RuntimeError):
            direct_preview_schema.author_sql(rows)


def test_preview_job_indexes_preserve_legacy_unique_rule_and_bind_each_actual_prefix():
    from pinet_core.models import Job
    names = {value.name for value in Job.__table__.indexes}
    assert {"uq_jobs_legacy_conversation_kind", "uq_jobs_direct_preview_turn", "uq_jobs_direct_preview_revision"} <= names
    statements = direct_preview_schema.job_indexes()
    assert "IS DISTINCT FROM 'customer-agent-direct-quality.v1'" in statements[0]
    assert all("CREATE UNIQUE INDEX" in value for value in statements[:3])
    assert "direct_preview_turn_id" in statements[1] and "transcript_revision" in statements[2]
    assert "coalesce" in statements[3] and "FALSE" in statements[3] and "kind='quality'" in statements[3]


def test_native_quota_replaces_one_hold_with_existing_three_call_allocation_without_duplicate_charge():
    original = direct_schema.daily_sql()
    patched = direct_preview_schema.daily_sql()
    inserted = "          AND NOT EXISTS(SELECT 1 FROM public.control_workspace_calibration_allocations a WHERE a.task_id=t.id)\n"
    assert patched.replace(inserted, "", 1) == original
    assert patched.count("FROM public.control_workspace_calibration_calls c WHERE c.user_id=u") == 1


def test_native_mapping_and_new_raw_json_guards_fail_closed_without_relaxing_native_business():
    source = "\n".join(direct_preview_schema.extra_sql())
    assert "business_id VARCHAR NOT NULL" in source and "grant_id VARCHAR NOT NULL" in source
    assert "FORCE ROW LEVEL SECURITY" in source and "BEFORE UPDATE OR DELETE" in source
    assert "EXECUTE FUNCTION workspace_direct_immutable()" in source
    assert "GRANT SELECT,INSERT ON control_workspace_direct_previews" in source
    assert "GRANT UPDATE ON control_workspace_direct_previews" not in source
    assert "customer-agent-direct-call.v1" in source and "one exact bounded native preview call required" in source
    assert source.count("IF coalesce((") >= 7
    assert "a.plan->>'version'<>'workspace-native-preview-turn.v1'" in source
    assert "j->'material'->>'request_input_sha256'<>tr.context->>'quality_request_sha256'" in source
    assert "quality_artifact" in source and "no output authority" in source


def test_native_terminal_accounting_extends_only_exact_repaired_boundary_and_keeps_output_fences():
    source = next(value for value in direct_schema.guard_functions()
        if value.startswith("CREATE FUNCTION workspace_direct_task_boundary("))
    source = public(source, "workspace_direct_task_boundary")
    patched = direct_preview_schema.boundary_patch(source)
    assert "c.mode='agent_preview'" in patched and "workspace-native-direct-preview.v1" in patched
    assert "b.grant_id=c.grant_id" in patched and "a.plan->>'version'='workspace-native-preview-turn.v1'" in patched
    assert "a.session_id=t.session_id" in patched and "a.source_revision=t.source_revision" in patched
    # The original failure-only classification is still required before either
    # adapter can settle; this helper grants no live/output authority.
    assert "IF t.status IN('failed','cancelled') AND t.result IS NULL THEN" in patched
    assert "RETURN CASE WHEN t.kind IN('chat.consult','acquisition.reviewed_capture','workspace.team_turn')" in patched
    assert "NOT coalesce((c.mode='consultant' OR(" in patched
    for bad in (source + source, patched, source.replace("FUNCTION public.", "FUNCTION unknown.", 1)):
        with pytest.raises(RuntimeError):
            direct_preview_schema.boundary_patch(bad)


def test_native_allocation_dispatch_casts_actual_postgresql_trigger_name():
    source = next(value for value in calibration_budget_schema.protections()
        if value.startswith("CREATE FUNCTION workspace_calibration_insert("))
    patched = direct_preview_schema.allocation_patch(public(source, "workspace_calibration_insert"))
    assert "workspace_direct_preview_budget_check(TG_TABLE_NAME::VARCHAR,to_jsonb(NEW)" in patched
