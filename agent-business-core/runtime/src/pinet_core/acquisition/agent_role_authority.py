"""Fresh six-Config lineage on the canonical owner/source/module authority."""

from sqlalchemy import cast, func, select, text
from sqlalchemy.dialects.postgresql import JSONB

from ..config import settings
from ..creation.service import digest
from ..customer_agents import service as agents
from ..customer_agents.models import Agent
from ..db import db
from ..tasks.codex import RunnerError
from ..tasks.models import Task, TaskRun
from . import model_authority as authority
from .agent_role_contract import KIND, OUTPUT, PURPOSE, ROLES, RoleRequest
from .correspondence import recipient_hash
from .engine import gates
from .headless_mail import HeadlessMail
from .ledger import conditions, scope_values
from .model_models import ModelAttempt, ModelAuthorization, ModelTaskBinding
from .models import AcquisitionCampaign
from .native_chain import SCOPE, guard
from .work_models import ContactPolicy

REVIEW_FIELDS = (
    "factual",
    "relevant",
    "one_clear_next_step",
    "no_unverified_promises",
    "no_source_instructions",
)


def accepted(review):
    return all(review.get(key) is True for key in REVIEW_FIELDS)


async def check_team(tx, value, work):
    guard()
    primary = work.authorization
    bindings, identities, expiries = {}, set(), []
    for role in ROLES:
        reference = getattr(value.team, role)
        row = (
            primary
            if str(reference.authorization_id) == primary.id
            else await tx.get(ModelAuthorization, str(reference.authorization_id), populate_existing=True)
        )
        if (
            row is None
            or row.fingerprint != reference.fingerprint
            or digest(authority.material(row)) != row.fingerprint
            or not row.enabled
            or row.execution_role != role
            or row.purpose != PURPOSE[role]
            or any(getattr(row, key) != getattr(primary, key) for key in SCOPE)
        ):
            raise RunnerError("agent_role_team_changed")
        agent = await tx.scalar(
            select(Agent)
            .where(Agent.id == row.agent_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if (
            agent is None
            or agent.purpose != PURPOSE[role]
            or agent.current_revision != row.config_revision
            or any(
                getattr(agent, key) != getattr(row, key)
                for key in (
                    "business_id",
                    "user_id",
                    "organization_id",
                    "portfolio_id",
                    "environment_id",
                    "creation_id",
                    "registration_id",
                    "external_binding_id",
                    "registration_fingerprint",
                )
            )
        ):
            raise RunnerError("agent_role_config_changed")
        config = await agents.current_config(tx, agent)
        if (
            config is None
            or config.id != row.config_id
            or config.config_sha256 != row.config_sha256
            or config.external_binding_id != row.external_binding_id
            or row.external_binding_id is not None
            and config.external_binding_fingerprint != row.registration_fingerprint
        ):
            raise RunnerError("agent_role_config_changed")
        identities.add(agent.id)
        expiries.append(row.expires_at)
        bindings[role] = {
            key: getattr(row, key)
            for key in (
                "id",
                "fingerprint",
                "agent_id",
                "config_id",
                "config_revision",
                "config_sha256",
                "execution_role",
            )
        }
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    if (
        len(identities) != 6
        or primary.execution_role != value.role
        or any(expiry <= now for expiry in expiries)
    ):
        raise RunnerError("agent_role_team_changed")
    tx.info.setdefault("acquisition_model_deadlines", {})
    reference = value.calibration.model_dump(mode="json", exclude={"case_id"}) if value.calibration else None
    retained = list(
        await tx.scalars(
            select(ModelTaskBinding.input).where(
                ModelTaskBinding.kind == KIND,
                ModelTaskBinding.authorization_id.in_(
                    str(getattr(value.team, role).authorization_id) for role in ROLES
                ),
            )
        )
    )
    if any(
        (
            {key: item["calibration"].get(key) for key in ("manifest_path", "manifest_sha256")}
            if isinstance(item.get("calibration"), dict)
            else None
        )
        != reference
        for item in retained
    ):
        raise RunnerError("agent_role_calibration_authorization_retained")
    return bindings, min(*expiries, work.session.expires_at)


async def parent_context(tx, value):
    parents = []
    for reference in value.parents:
        task = await tx.get(Task, str(reference.task_id), populate_existing=True)
        run = await tx.get(TaskRun, str(reference.run_id), populate_existing=True)
        bound = await tx.get(ModelTaskBinding, str(reference.task_id), populate_existing=True)
        if (
            task is None
            or run is None
            or bound is None
            or task.kind != KIND
            or bound.kind != KIND
            or task.status != "succeeded"
            or run.status != "succeeded"
            or run.task_id != task.id
            or task.run_id != run.id
            or not isinstance(task.result, dict)
            or bound.authorization_id != str(getattr(value.team, reference.role).authorization_id)
            or digest(bound.input) != bound.input_sha256
        ):
            raise RunnerError("agent_role_parent_invalid")
        previous = RoleRequest.model_validate(bound.input)
        attempts = list(
            await tx.scalars(
                select(ModelAttempt).where(ModelAttempt.task_id == task.id, ModelAttempt.run_id == run.id)
            )
        )
        output = task.result.get("output")
        if (
            previous.role != reference.role
            or previous.team != value.team
            or previous.calibration != value.calibration
            or previous.campaign != value.campaign
            or previous.prospect != value.prospect
            or previous.recipient != value.recipient
            or len(attempts) != 1
            or attempts[0].state != "succeeded"
            or attempts[0].role != reference.role
            or attempts[0].authorization_id != bound.authorization_id
            or attempts[0].output != output
            or digest(output) != reference.output_sha256
            or task.fingerprint
            != digest(
                {
                    "request": bound.input,
                    "authorization_fingerprint": getattr(value.team, reference.role).fingerprint,
                }
            )
        ):
            raise RunnerError("agent_role_parent_invalid")
        OUTPUT[reference.role].model_validate(output)
        parents.append({"request": previous, "task": task, "run": run, "output": output})
    if value.role == "research" and (
        parents[0]["output"].get("action") != "route" or parents[0]["output"].get("next_role") != "research"
    ):
        raise RunnerError("agent_role_route_not_approved")
    if value.role == "writer" and (
        parents[0]["output"].get("eligible_for_draft") is not True or parents[0]["output"].get("fit") != "yes"
    ):
        raise RunnerError("agent_role_not_qualified")
    if value.role == "reply" and not accepted(parents[0]["output"]):
        raise RunnerError("agent_role_copy_not_reviewed")
    return parents


async def observe(tx, value, work):
    bindings, deadline = await check_team(tx, value, work)
    parents = await parent_context(tx, value)
    # Approved facts, campaign/recipient gates and current mail context are separate.
    if value.campaign.site_id != work.scope.site_id:
        raise RunnerError("agent_role_foreign_site")
    if work.business_source is not None:
        approved = {f["id"]: (f["text"], f["source_ref"]) for f in work.business_source["facts"]}
        if any(approved.get(f.id) != (f.text, f.source) for f in value.campaign.facts):
            raise RunnerError("agent_role_facts_changed")
    mail = None
    expected_mail = value.mail or (
        parents[0]["request"].mail
        if value.role == "quality" and parents[0]["request"].role == "reply"
        else None
    )
    if expected_mail is not None:
        mail = await HeadlessMail(db).reply_context(
            tx,
            scope=work.scope,
            adapter_id=work.authorization.adapter_id,
            thread_id=expected_mail.thread_id,
            inbound_id=expected_mail.inbound_id,
        )
        applied = str(value.request_id) in tx.info.get("acquisition_agent_role_applied", set())
        if (
            mail["binding"].input_sha256 != expected_mail.input_sha256
            or mail["thread"].revision != expected_mail.revision + int(applied)
            or mail["campaign"] != value.campaign
            or mail["prospect"] != value.prospect
            or value.role == "reply"
            and parents[0]["task"].result.get("correspondence", {}).get("thread_id")
            != str(expected_mail.thread_id)
        ):
            raise RunnerError("agent_role_mail_context_changed")
    initial = (
        not parents
        or value.role in ("research", "qualification", "writer")
        or (value.role == "quality" and parents[0]["request"].role == "writer")
    )
    if initial:
        await authority.target(tx, work, value)
    else:
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        if gates(value.campaign, value.prospect.model_copy(update={"status": "new"}), now):
            raise RunnerError("agent_role_campaign_unavailable")
    if value.calibration is not None:
        from .agent_role_calibration import verify_reference

        verify_reference(value, bindings, work.authorization.source_revision)
    return {"bindings": bindings, "parents": parents, "mail": mail, "deadline": deadline, "initial": initial}


async def final_fence(tx, value, work, context):
    """After the last current() Git wait: private seals, then SQL/clock only."""
    guard()
    authority.guard(execution=True)
    if work.authorization.source_revision != settings().control_source_revision:
        raise RunnerError("agent_role_team_changed")
    _, private_hash = authority.read_registration(settings())
    if private_hash != work.authorization.work_registration_sha256:
        raise RunnerError("acquisition_model_private_registration_changed")
    if value.calibration is not None:
        from .agent_role_calibration import manifest

        manifest(value.calibration)
    values = scope_values(work.scope, work.authorization.adapter_id)
    target = (
        ~select(AcquisitionCampaign.campaign_id)
        .where(
            *conditions(AcquisitionCampaign, values),
            AcquisitionCampaign.campaign_id == value.campaign.campaign_id,
            AcquisitionCampaign.stopped,
        )
        .exists()
    )
    if context["initial"]:
        target &= (
            ~select(ContactPolicy.recipient_hash)
            .where(
                *conditions(ContactPolicy, values),
                ContactPolicy.recipient_hash == recipient_hash(value.recipient),
                ContactPolicy.state != "active",
            )
            .exists()
        )
    current = func.acquisition_agent_role_input_current(
        cast(value.model_dump(mode='json'), JSONB), work.authorization.id
    )
    allowed, now = (await tx.execute(select(current & target, func.clock_timestamp()))).one()
    prospect = value.prospect if context["initial"] else value.prospect.model_copy(update={"status": "new"})
    if not allowed or gates(value.campaign, prospect, now):
        raise RunnerError("agent_role_team_changed")


async def preflight(tx, task):
    bound = await tx.get(ModelTaskBinding, task.id, populate_existing=True)
    if (
        bound is None
        or task.kind != KIND
        or bound.kind != KIND
        or not task.session_id
        or digest(bound.input) != bound.input_sha256
    ):
        raise RunnerError("agent_role_task_invalid")
    value = RoleRequest.model_validate(bound.input)
    if str(value.authorization_id) != bound.authorization_id or str(value.request_id) != task.idempotency_key:
        raise RunnerError("agent_role_task_invalid")
    async with authority.current(tx, bound.authorization_id, task.session_id, execution=True) as work:
        a = work.authorization
        if (
            a.execution_role != value.role
            or task.fingerprint
            != digest({"request": bound.input, "authorization_fingerprint": a.fingerprint})
            or (
                task.business_id,
                task.user_id,
                task.organization_id,
                task.environment_id,
                task.source_revision,
            )
            != (a.business_id, a.user_id, a.organization_id, a.environment_id, a.source_revision)
        ):
            raise RunnerError("agent_role_task_invalid")
        context = await observe(tx, value, work)
        tx.info.setdefault("acquisition_model_deadlines", {})[task.id] = context["deadline"]
        tx.info.setdefault("acquisition_agent_role_context", {})[task.id] = context
    await final_fence(tx, value, work, context)
    return bound, value, work
