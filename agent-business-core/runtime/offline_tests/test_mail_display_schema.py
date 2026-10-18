"""Schema contract; real SQL enforcement is opt-in isolated PostgreSQL only."""
from importlib import import_module

import pytest

from pinet_core.mail_view import task_schema as s


def test_mail_display_has_its_own_kind_fixed_execution_and_two_tables():
    schema=import_module("pinet_core.mail_view.task_schema")
    assert (schema.KIND,schema.MODEL,schema.EFFORT,schema.ADAPTER)==(
        "mail.display_translate","gpt-6.1-sol","high","mail-display-task.v1")
    assert schema.TABLES==("control_mail_display_policies","control_mail_display_jobs")


def test_frozen_display_policy_and_job_models_exist_without_second_attempt_table():
    models=import_module("pinet_core.mail_view.task_models")
    assert models.DisplayPolicy.__tablename__=="control_mail_display_policies"
    assert models.DisplayJob.__tablename__=="control_mail_display_jobs"


def original():
    return "CREATE OR REPLACE FUNCTION public.workspace_direct_task_boundary(varchar,jsonb)\n"+s.BOUNDARY_BEFORE+"\nEND$$;"


def test_exact0046_classifier_roundtrip_preserves_every_other_byte():
    old=original()
    patched=s.patch_boundary(old)
    assert patched==old.replace(s.BOUNDARY_BEFORE,s.BOUNDARY_AFTER)
    assert s.patch_boundary(patched,downgrade=True)==old
    assert "workspace.direct_turn" not in s.BOUNDARY_AFTER


@pytest.mark.parametrize("source",["",original().replace("public.workspace_direct_task_boundary","public.other"),
    original()+s.BOUNDARY_BEFORE,original().replace(s.BOUNDARY_BEFORE,"unknown"),original()+s.KIND])
def test_unknown_predecessor_is_refused(source):
    with pytest.raises(RuntimeError):
        s.patch_boundary(source)


def test_check_recognition_refuses_changes_and_does_not_replace_business_exception():
    probes={key:key+":compiled" for key in ("kind_old","kind_new","session_old","session_new","business")}
    rows=[{"name":name,"expression":probes[key]} for name,key in (("control_tasks_kind_check","kind_old"),
        ("control_tasks_session_kind_check","session_old"),("control_task_business_execution_check","business"))]
    sql=s.task_checks(rows,probes)
    assert len(sql)==4 and not any("control_task_business_execution_check" in value for value in sql)
    assert sum(s.KIND in value for value in sql)==2
    for changed in (rows[:-1],rows+[rows[0]],[dict(row,expression="other") for row in rows]):
        with pytest.raises(RuntimeError):
            s.task_checks(changed,probes)


def test_no_second_attempt_queue_or_runtime_authorization_mutation_grant():
    models=import_module("pinet_core.mail_view.task_models")
    assert models.DisplayJob.__table__.c.record.type.none_as_null
    assert "status" not in models.DisplayJob.__table__.c and "usage" not in models.DisplayJob.__table__.c
    assert models.DisplayPolicy.__table__.c.id.default is None
    grants=[sql for sql in s.statements() if sql.startswith("GRANT ")]
    assert f"GRANT SELECT ON {s.TABLE_POLICY} TO pinet_runtime" in grants
    assert f"GRANT SELECT,INSERT ON {s.TABLE_JOB} TO pinet_runtime" in grants
    assert not any("UPDATE" in sql or "DELETE" in sql for sql in grants)
    funcs=[sql for sql in grants if "FUNCTION" in sql]
    assert len(funcs)==5 and any("JSONB,VARCHAR,VARCHAR)" in sql for sql in funcs)
    assert sum("mail_display_projection(" in sql for sql in funcs)==1
    unique=next(item for item in models.DisplayJob.__table__.constraints if getattr(item,"name",None)=="uq_mail_display_source")
    assert tuple(column.name for column in unique.columns)==("business_id","environment_id","mail_id","source_sha256","instruction_sha256","target_language")
