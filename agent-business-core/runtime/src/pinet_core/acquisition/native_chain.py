"""Current two-Config lineage; private JSON is a reference, never authority."""
import json

from sqlalchemy import cast, func, select, text
from sqlalchemy.dialects.postgresql import JSONB

from ..config import settings
from ..creation.service import digest
from ..tasks.codex import RunnerError
from ..tasks.models import Task, TaskRun
from . import model_authority as authority
from .contracts import Assessment, Review
from .correspondence import recipient_hash
from .engine import gates
from .ledger import conditions, scope_values
from .model_contract import KIND, PrepareModel
from .model_models import ModelAttempt, ModelTaskBinding
from .models import AcquisitionCampaign
from .work_models import ContactPolicy, CorrespondenceThread

SCOPE = ("business_id", "organization_id", "user_id", "environment_id", "portfolio_id", "site_id",
    "creation_id", "registration_id", "registration_fingerprint", "session_id", "source_revision",
    "module_fingerprint", "module_snapshot", "adapter_id", "work_registration_sha256")
REVIEW_FIELDS = ("factual", "relevant", "one_clear_next_step", "no_unverified_promises", "no_source_instructions")


def guard():
    if not settings().acquisition_native_chain_enabled:
        raise RunnerError("acquisition_native_chain_disabled")


async def check_pair(tx, value, work):
    guard()
    if not await tx.scalar(text("SELECT to_regprocedure('acquisition_native_task_current(varchar)') IS NOT NULL")):
        raise RunnerError("acquisition_native_schema_unavailable")
    pair = value.native
    from ..customer_agents import service as agents
    from ..customer_agents.models import Agent
    from .model_models import ModelAuthorization
    primary = work.authorization
    identities = ((str(pair.research_authorization_id), pair.research_fingerprint, "customer_research"),
                  (str(pair.email_authorization_id), pair.email_fingerprint, "email"))
    rows = []
    # current() already proves/locks the shared owner, Registration, Creation,
    # Module and private registration. Re-observe each distinct peer Config,
    # without repeating that identical expensive parent proof.
    for identity, expected, purpose in identities:
        row = primary if identity == primary.id else await tx.get(ModelAuthorization, identity, populate_existing=True)
        if (row is None or row.fingerprint != expected or digest(authority.material(row)) != expected
                or row.purpose != purpose or not row.enabled
                or any(getattr(row, key) != getattr(primary, key) for key in SCOPE)):
            raise RunnerError("acquisition_native_pair_changed")
        if row.id != primary.id:
            agent = await tx.scalar(select(Agent).where(Agent.id == row.agent_id).with_for_update()
                .execution_options(populate_existing=True))
            if (agent is None or agent.purpose != purpose or agent.current_revision != row.config_revision
                    or any(getattr(agent, key) != getattr(row, key) for key in (
                        "creation_id", "registration_id", "registration_fingerprint", "business_id",
                        "organization_id", "portfolio_id", "user_id", "environment_id"))):
                raise RunnerError("acquisition_native_pair_changed")
            config = await agents.current_config(tx, agent)
            view = agents.config_view(agent, config)
            if config.id != row.config_id or view["sha256"] != row.config_sha256:
                raise RunnerError("acquisition_native_pair_changed")
        rows.append(row)
    r, e = rows
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    if (primary.id not in {r.id, e.id} or r.agent_id == e.agent_id
            or any(row.approved_at > now or row.expires_at <= now for row in rows)):
        raise RunnerError("acquisition_native_pair_changed")
    tx.info["acquisition_native_deadline"] = min(r.expires_at, e.expires_at, work.session.expires_at)
    observed = {role: {key: getattr(row, key) for key in (
        "id", "fingerprint", "agent_id", "config_id", "config_revision", "config_sha256")}
        for role, row in (("research", r), ("email", e))}
    if value.calibration is not None:
        from .native_calibration import verify_reference
        verify_reference(value, observed, primary.source_revision)
    return observed


def campaign_lineage(campaign):
    # The explicit research_only -> draft_only transition changes only mode.
    return campaign.model_dump(mode="json", exclude={"mode"})


async def final_fence(tx, value, work):
    # Last native/Git wait precedes fresh SQL authority. No proof IO follows it.
    await authority.module_admin.execution_current(authority.source_value(work.authorization.source_revision))
    guard()
    authority.guard(execution=True)
    if work.authorization.source_revision != settings().control_source_revision:
        raise RunnerError("acquisition_native_pair_changed")
    _, private_hash = authority.read_registration(settings())
    if private_hash != work.authorization.work_registration_sha256:
        raise RunnerError("acquisition_model_private_registration_changed")
    values = scope_values(work.scope, work.authorization.adapter_id)
    if value.stage == "reply":
        applied = str(value.request_id) in tx.info.get("acquisition_reply_applied", set())
        target = select(CorrespondenceThread.thread_id).where(*conditions(CorrespondenceThread, values),
            CorrespondenceThread.thread_id == str(value.thread_id),
            CorrespondenceThread.last_inbound_id == str(value.inbound_id),
            CorrespondenceThread.revision == value.revision + int(applied),
            CorrespondenceThread.source_revision == work.authorization.source_revision).exists()
    else:
        target = ~select(AcquisitionCampaign.campaign_id).where(*conditions(AcquisitionCampaign, values),
            AcquisitionCampaign.campaign_id == value.campaign.campaign_id, AcquisitionCampaign.stopped).exists()
        target &= ~select(ContactPolicy.recipient_hash).where(*conditions(ContactPolicy, values),
            ContactPolicy.recipient_hash == recipient_hash(value.recipient), ContactPolicy.state != "active").exists()
    pair = func.acquisition_native_pair_current(cast(json.dumps({
        "native": value.native.model_dump(mode="json"), "stage": value.stage}), JSONB),
        work.authorization.id)
    accepted, now = (await tx.execute(select(pair & target, func.clock_timestamp()))).one()
    if not accepted or gates(value.campaign, value.prospect.model_copy(update={"status": "new"})
            if value.stage == "reply" else value.prospect, now):
        raise RunnerError("acquisition_native_pair_changed")


async def handoff(tx, value):
    ref = value.handoff
    task = await tx.get(Task, str(ref.task_id), populate_existing=True)
    bound = await tx.get(ModelTaskBinding, str(ref.task_id), populate_existing=True)
    run = await tx.get(TaskRun, str(ref.run_id), populate_existing=True)
    if (task is None or bound is None or run is None or task.kind != KIND or task.status != "succeeded"
            or task.run_id != run.id or run.task_id != task.id or run.status != "succeeded"
            or bound.kind != KIND or bound.authorization_id != str(value.native.research_authorization_id)
            or digest(bound.input) != bound.input_sha256
            or task.fingerprint != digest({"request": bound.input,
                "authorization_fingerprint": value.native.research_fingerprint})):
        raise RunnerError("acquisition_research_handoff_invalid")
    upstream = PrepareModel.model_validate(bound.input)
    if (upstream.stage != "research" or upstream.native != value.native or upstream.calibration != value.calibration
            or upstream.authorization_id != value.native.research_authorization_id
            or upstream.recipient != value.recipient or upstream.prospect != value.prospect
            or campaign_lineage(upstream.campaign) != campaign_lineage(value.campaign)):
        raise RunnerError("acquisition_research_handoff_invalid")
    rows = list(await tx.scalars(select(ModelAttempt).where(ModelAttempt.task_id == task.id,
        ModelAttempt.run_id == run.id).order_by(ModelAttempt.ordinal)))
    if ([row.role for row in rows] != ["researcher", "reviewer"]
            or any(row.state != "succeeded" or row.output is None for row in rows)
            or any(row.authorization_id != str(upstream.authorization_id) or row.source_revision != task.source_revision
                for row in rows)
            or digest([row.output for row in rows]) != ref.output_sha256):
        raise RunnerError("acquisition_research_handoff_invalid")
    assessment, review = Assessment.model_validate(rows[0].output), Review.model_validate(rows[1].output)
    if (not isinstance(task.result, dict) or assessment.fit != "yes" or assessment.next_action != "research" or assessment.subject or assessment.body
            or not all(getattr(review, field) for field in REVIEW_FIELDS)
            or task.result.get("prepared", {}).get("assessment") != rows[0].output
            or task.result.get("prepared", {}).get("review") != rows[1].output):
        raise RunnerError("acquisition_research_not_qualified")
    return assessment
