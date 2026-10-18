"""Inert six-Config contracts and preserved two-agent behavior; no provider/DB."""

from copy import deepcopy
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import text
from test_acquisition_model_contract import approval
from test_acquisition_native_chain import inputs

from pinet_core.acquisition import agent_role_schema, model_authority, model_schema, native_schema
from pinet_core.acquisition.agent_role_contract import KIND, ROLES, RoleRequest
from pinet_core.acquisition.agent_role_handler import instruction, reviewed_decision, validate_output
from pinet_core.acquisition.model_contract import ApproveModel
from pinet_core.tasks import worker
from pinet_core.tasks.codex import RunnerError


def role_request(role="coordinator"):
    legacy, _ = inputs()
    team = {
        label: {"authorization_id": str(uuid4()), "fingerprint": format(index + 1, "x") * 64}
        for index, label in enumerate(ROLES)
    }
    parents = []
    if role != "coordinator":
        parent = {
            "research": "coordinator",
            "qualification": "research",
            "writer": "qualification",
            "reply": "quality",
            "quality": "writer",
        }[role]
        parents = [
            {"role": parent, "task_id": str(uuid4()), "run_id": str(uuid4()), "output_sha256": "a" * 64}
        ]
    return {
        "request_id": str(uuid4()),
        "authorization_id": team[role]["authorization_id"],
        "role": role,
        "team": team,
        "campaign": legacy["campaign"],
        "prospect": legacy["prospect"],
        "recipient": legacy["recipient"],
        "job_text": "Please clarify the supported requirements.",
        "parents": parents,
        **(
            {
                "mail": {
                    "thread_id": str(uuid4()),
                    "inbound_id": str(uuid4()),
                    "revision": 1,
                    "input_sha256": "b" * 64,
                }
            }
            if role == "reply"
            else {}
        ),
    }


def assessment(**changes):
    return {
        "fit": "yes",
        "intent": "explicit",
        "reasons": "Supported original evidence.",
        "evidence_ids": ["listing"],
        "next_action": "research",
        "subject": "",
        "body": "",
        "offer_fact_ids": [],
        **changes,
    }


@pytest.mark.parametrize("role", ROLES)
def test_exact_six_agent_role_inputs(role):
    value = RoleRequest.model_validate(role_request(role))
    assert value.role == role and len(value.team.model_dump()) == 6
    assert str(value.authorization_id) == str(getattr(value.team, role).authorization_id)
    assert value.native is None  # Never reinterpreted as an old two-agent pair.
    assert instruction(value)


@pytest.mark.parametrize(
    "change",
    [
        {"role": "arbitrary_tool"},
        {"authorization_id": str(uuid4())},
        {"config_id": str(uuid4())},
        {"model": "other"},
        {"external_sent": True},
        {"send": True},
        {"executor": "custom.py"},
    ],
)
def test_role_task_cannot_select_a_config_provider_tool_or_send(change):
    with pytest.raises((ValidationError, ValueError)):
        RoleRequest.model_validate(role_request() | change)


def test_duplicate_authority_or_wrong_parent_cannot_stand_in_for_six_agents():
    data = role_request("writer")
    data["team"]["quality"] = deepcopy(data["team"]["writer"])
    with pytest.raises(ValidationError):
        RoleRequest.model_validate(data)
    data = role_request("writer")
    data["parents"][0]["role"] = "research"
    with pytest.raises(ValidationError):
        RoleRequest.model_validate(data)
    data = role_request("reply")
    data.pop("mail")
    with pytest.raises(ValidationError):
        RoleRequest.model_validate(data)


def test_old_approval_and_material_do_not_gain_null_role_bytes():
    assert "execution_role" not in ApproveModel.model_validate(approval()).model_dump(mode="json")
    row = SimpleNamespace(**{key: key for key in model_authority.AUTH_FIELDS})
    row.approved_at = row.expires_at = datetime(2026, 1, 1, tzinfo=UTC)
    row.external_binding_id = None
    old = model_authority.material(row)
    row.execution_role = None
    assert model_authority.material(row) == old and "execution_role" not in old
    row.execution_role = "quality"
    assert model_authority.material(row) == old | {"execution_role": "quality"}


def test_research_cannot_write_or_reference_an_unapproved_fact():
    value = RoleRequest.model_validate(role_request("research"))
    validate_output(value, assessment(), {"parents": []})
    for output in (assessment(subject="Improper draft"), assessment(offer_fact_ids=["invented"])):
        with pytest.raises(RunnerError):
            validate_output(value, output, {"parents": []})


def test_qualification_cannot_promote_unproven_fit_or_coerce_a_boolean():
    value = RoleRequest.model_validate(role_request("qualification"))
    output = {
        "fit": "yes",
        "intent": "unknown",
        "eligible_for_draft": True,
        "evidence_ids": ["listing"],
        "reason": "Approved source only.",
    }
    with pytest.raises(RunnerError):
        validate_output(value, output, {"parents": [{"output": {"fit": "unknown"}}]})
    with pytest.raises(ValidationError):
        validate_output(value, output | {"eligible_for_draft": 1}, {"parents": [{"output": {"fit": "yes"}}]})


def test_quality_is_bound_to_exact_artifact_and_unaccepted_copy_cannot_route():
    review = {
        key: True
        for key in (
            "factual",
            "relevant",
            "one_clear_next_step",
            "no_unverified_promises",
            "no_source_instructions",
        )
    }
    review.update(reason="Faithful exact copy.", artifact_sha256="a" * 64)
    value = RoleRequest.model_validate(role_request("quality"))
    validate_output(value, review, {"artifact_sha256": "a" * 64})
    with pytest.raises(RunnerError):
        validate_output(value, review, {"artifact_sha256": "b" * 64})
    data = role_request()
    data["parents"] = [
        {"role": "quality", "task_id": str(uuid4()), "run_id": str(uuid4()), "output_sha256": "a" * 64}
    ]
    with pytest.raises(RunnerError):
        validate_output(
            RoleRequest.model_validate(data),
            {"action": "route", "next_role": "reply", "reason": "Continue draft."},
            {"parents": [{"output": review | {"factual": False}}]},
        )


@pytest.mark.parametrize(
    "builder,mode",
    [
        (model_schema.fence_sql, "fence"),
        (model_schema.parent_fence_sql, "parent"),
        (model_schema.settle_sql, "settle"),
        (model_schema.run_usage_sql, "usage"),
        (model_schema.settle_task_sql, "task"),
    ],
)
def test_versioned_sql_extension_keeps_old_kinds_and_exact_run_adapters(builder, mode):
    predecessor = native_schema.extend(builder(), mode)
    result = agent_role_schema.extend(predecessor, mode)
    assert KIND in result and "acquisition.model_prepare" in result and "acquisition.model_reply" in result
    assert (
        "acquisition-agent-role.v1" in result
        and "acquisition-model-prepare.v1" in result
        and "acquisition-model-reply.v1" in result
    )
    with pytest.raises(RuntimeError):
        agent_role_schema.extend(result, mode)


def test_source_fixed_handler_registered_without_replacing_old_handlers():
    assert worker.handler_for(KIND).__class__.__name__ == "AgentRoleHandler"
    assert worker.handler_for("acquisition.model_prepare").__class__.__name__ == "ModelHandler"
    assert worker.handler_for("acquisition.model_reply").__class__.__name__ == "ReplyHandler"


def test_migration_function_body_contains_no_accidental_sqlalchemy_bind_parameters():
    assert not text(agent_role_schema.input_current_sql())._bindparams


def test_rejected_reply_copy_preserves_refusal_without_emitting_prose():
    value = {
        "classification": "refusal",
        "action": "privacy_reply",
        "subject": "Contact request",
        "body": "Rejected informational copy.",
        "offer_fact_ids": [],
        "evidence_ids": ["listing"],
        "privacy_request_quote": "Do not contact me; please explain removal.",
        "reason": "Original privacy question.",
    }
    result = reviewed_decision(value, False)
    assert result.classification == "refusal" and result.action == "privacy_handoff"
    assert not result.body and not result.subject and not result.offer_fact_ids and not result.evidence_ids
    assert result.privacy_request_quote == value["privacy_request_quote"]
    assert reviewed_decision(value | {"classification": "question"}, False) is None


@pytest.mark.parametrize("late", ["stop", "expiry", "seal"])
async def test_final_seals_and_current_sql_clock_follow_last_io(monkeypatch, late):
    from pinet_core.acquisition import agent_role_authority as authority
    from pinet_core.acquisition import agent_role_calibration as calibration
    from pinet_core.acquisition.interfaces import Scope

    data = role_request()
    data["calibration"] = {
        "manifest_path": "known-fixture",
        "manifest_sha256": "f" * 64,
        "case_id": "known-fixture",
    }
    value = RoleRequest.model_validate(data)
    source, trace = "a" * 40, []
    scope = Scope(
        business_id=str(uuid4()), site_id=value.campaign.site_id, environment_id="test", environment_class="test"
    )
    work = SimpleNamespace(
        scope=scope,
        authorization=SimpleNamespace(
            id=str(value.authorization_id),
            source_revision=source,
            adapter_id="known-fixture",
            work_registration_sha256="f" * 64,
        ),
    )
    monkeypatch.setattr(authority, "settings", lambda: SimpleNamespace(control_source_revision=source))
    monkeypatch.setattr(authority, "guard", lambda: None)
    monkeypatch.setattr(authority.authority, "guard", lambda **kwargs: None)

    def registration(_):
        trace.append("private")
        return {}, "f" * 64

    monkeypatch.setattr(authority.authority, "read_registration", registration)

    def manifest(_):
        trace.append("seal")
        if late == "seal":
            raise RunnerError("agent_role_manifest_changed")

    monkeypatch.setattr(calibration, "manifest", manifest)

    class Tx:
        async def execute(self, statement):
            trace.append("sql-clock")
            now = datetime(2032 if late == "expiry" else 2026, 10, 18, tzinfo=UTC)
            return SimpleNamespace(one=lambda: (late != "stop", now))

    with pytest.raises(RunnerError):
        await authority.final_fence(Tx(), value, work, {"initial": True})
    assert trace == ["private", "seal"] + ([] if late == "seal" else ["sql-clock"])
