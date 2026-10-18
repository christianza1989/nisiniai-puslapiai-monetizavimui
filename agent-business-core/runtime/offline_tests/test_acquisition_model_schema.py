"""Source contract checks; actual PostgreSQL enforcement is tested separately."""
from importlib import import_module

import pytest

from pinet_core.acquisition import model_schema as schema


def test_new_model_kind_and_three_owned_tables_are_explicit():
    schema = import_module("pinet_core.acquisition.model_schema")
    assert schema.KIND == "acquisition.model_prepare"
    assert schema.MODEL == "gpt-6.1-sol" and schema.EFFORT == "high"
    assert schema.TABLES == ("acquisition_model_authorizations", "acquisition_model_task_bindings",
        "acquisition_model_attempts")


def test_orm_exposes_only_the_agreed_three_model_records():
    models = import_module("pinet_core.acquisition.model_models")
    assert models.ModelAuthorization.__tablename__ == "acquisition_model_authorizations"
    assert models.ModelTaskBinding.__tablename__ == "acquisition_model_task_bindings"
    assert models.ModelAttempt.__tablename__ == "acquisition_model_attempts"


def predecessor(fragment=schema.BOUNDARY_BEFORE):
    return "CREATE OR REPLACE FUNCTION public.workspace_direct_task_boundary(character varying,jsonb)\n"+fragment+"\nEND$$;"


def test_predecessor_patch_roundtrip_changes_only_recognized_business_branch():
    original = predecessor()
    patched = schema.patch_boundary(original.replace("\n", "\r\n"))
    assert patched == original.replace(schema.BOUNDARY_BEFORE, schema.BOUNDARY_AFTER)
    assert schema.patch_boundary(patched, downgrade=True) == original
    assert "workspace.direct_turn" not in schema.BOUNDARY_AFTER


@pytest.mark.parametrize("value", ["", predecessor("changed"), predecessor()+schema.BOUNDARY_BEFORE,
    predecessor().replace("public.workspace_direct_task_boundary", "public.unknown_boundary"),
    predecessor()+schema.KIND])
def test_unknown_or_ambiguous_predecessor_fails_closed(value):
    with pytest.raises(RuntimeError):
        schema.patch_boundary(value)


def test_recognized_task_checks_roundtrip_does_not_replace_business_constraint():
    probes = {key: "compiled:"+key for key in ("kind_old", "kind_new", "session_old", "session_new", "business")}
    names = {"control_tasks_kind_check": "kind_old", "control_tasks_session_kind_check": "session_old",
        "control_task_business_execution_check": "business"}
    rows = [{"name": name, "expression": probes[key]} for name, key in names.items()]
    result = schema.task_checks(rows, probes)
    assert len(result) == 4 and not any("control_task_business_execution_check" in item for item in result)
    assert sum(schema.KIND in item for item in result) == 2
    newer = [dict(row, expression=row["expression"].replace("_old", "_new")) for row in rows]
    assert any(schema.OLD_KIND in item for item in schema.task_checks(newer, probes, downgrade=True))
    for changed in (rows[:-1], rows+[rows[0]], [dict(row, expression="unrecognized") for row in rows]):
        with pytest.raises(RuntimeError):
            schema.task_checks(changed, probes)


def test_unknown_usage_and_output_are_sql_null_in_orm():
    models = import_module("pinet_core.acquisition.model_models")
    for name in ("usage", "output"):
        column = models.ModelAttempt.__table__.columns[name]
        assert column.nullable and column.type.none_as_null
    assert models.ModelAuthorization.__table__.columns.id.default is None


def test_runtime_has_no_authorization_write_or_receipt_mutation_grant():
    sql = schema.statements()
    grants = [item for item in sql if item.startswith("GRANT ")]
    assert f"GRANT SELECT ON {schema.TABLE_AUTH} TO pinet_runtime" in grants
    assert not any("UPDATE" in item or "DELETE" in item for item in grants)
    for table in (schema.TABLE_TASK, schema.TABLE_ATTEMPT):
        assert f"GRANT SELECT,INSERT ON {table} TO pinet_runtime" in grants
    executable = [item for item in grants if "FUNCTION" in item]
    assert len(executable) == 3
    assert all(any(name in item for name in ("settle_attempt(", "run_usage(", "settle_task(")) for item in executable)
    assert "director_settle_revoked_task" not in "\n".join(sql)
