"""Exact migration anchors preserve all existing team fences, provider zero."""
import pytest

from pinet_core.workspace_team import schema
from pinet_core.workspace_team.episode_schema import (
    ATTEMPT_BRANCH,
    NATIVE_BRANCH,
    NEW_AUTHOR_CHECK,
    OLD_AUTHOR_CHECK,
    author_check_sql,
    normalized_check,
    patch_fence,
    proof_sql,
)


def canonical():
    return next(sql for sql in schema.protections() if sql.startswith("CREATE FUNCTION control_workspace_team_fence()"))


def deparsed():
    return canonical().replace("CREATE FUNCTION control_workspace_team_fence()", "CREATE OR REPLACE FUNCTION public.control_workspace_team_fence()")


def test_one_known_branch_and_every_other_fence_byte_is_preserved_and_reversible():
    before = deparsed()
    assert before.count(ATTEMPT_BRANCH) == 1
    patched = patch_fence(before)
    assert patched.count(NATIVE_BRANCH) == 1
    assert patched.replace(NATIVE_BRANCH, ATTEMPT_BRANCH) == before
    assert patch_fence(patched, downgrade=True) == before
    assert "SECURITY DEFINER" not in patched


@pytest.mark.parametrize("definition", ["", deparsed().replace("a.state<>'succeeded'", "a.state<>'failed'"),
    deparsed()+ATTEMPT_BRANCH, patch_fence(deparsed())])
def test_unknown_duplicate_or_already_patched_fence_refused(definition):
    with pytest.raises(RuntimeError, match="Unknown or ambiguous"):
        patch_fence(definition)


def test_exact_author_check_deparse_match_retains_canonical_legacy_and_single_native_alternative():
    # VARCHAR-to-text casts and redundant grouping are PostgreSQL formatting.
    expression = "(("+OLD_AUTHOR_CHECK.replace("author_type", "(author_type)::text")+"))"
    rows = [{"name": 'odd"name', "expression": expression}, {"name": "irrelevant", "expression": "kind<>'x'"}]
    changed = author_check_sql(rows)
    assert changed[0].endswith('DROP CONSTRAINT "odd""name"')
    assert "CHECK("+NEW_AUTHOR_CHECK+")" in changed[1]
    assert "native_episode_task_id=task_id" in changed[1]
    assert "attempt_id IS NULL" in changed[1]
    assert author_check_sql([{"name": "n", "expression": NEW_AUTHOR_CHECK}], downgrade=True)[1].endswith(
        "CHECK("+OLD_AUTHOR_CHECK+")")
    assert normalized_check(expression) == normalized_check(OLD_AUTHOR_CHECK)


@pytest.mark.parametrize("rows", [[], [{"name": "x", "expression": "author_type='coordinator'"}],
    [{"name": "x", "expression": OLD_AUTHOR_CHECK}, {"name": "y", "expression": OLD_AUTHOR_CHECK}]])
def test_missing_changed_or_ambiguous_check_is_not_replaced(rows):
    with pytest.raises(RuntimeError, match="Unknown or ambiguous"):
        author_check_sql(rows)


def test_proof_uses_only_native_receipts_and_existing_scoped_task_no_task_result_or_grade():
    sql = proof_sql()
    assert "SECURITY INVOKER" in sql and "SECURITY DEFINER" not in sql
    assert "t.result" not in sql and "admitted" not in sql
    for expected in ("j.state='succeeded'", "t.status='running'", "s.revoked_at IS NULL",
            "a.context_sha256=tr.context_sha256", "_agent_episode_plan_sha256", "task_calibration",
            "customer-quality-dispatch.v1", "quality_request_sha256", "quality_provider_attempt", "provider_attempt"):
        assert expected in sql
