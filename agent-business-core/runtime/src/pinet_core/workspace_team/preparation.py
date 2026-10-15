"""One explicit draft action on maintained Task completion and canonical storage."""
import json
from uuid import UUID, uuid5

from sqlalchemy import select, text

from ..control.models import Session
from ..control.routes import ControlError
from ..creation.service import binding, digest
from ..customer_agents.wire import Create
from ..tasks import codex
from . import adapter, service
from .models import Attempt, TeamTurn
from .preparation_wire import DraftPlan

NAMESPACE = UUID("0dc25d23-c384-4b5a-9a98-9bdc738f0568")
SCOPE_KEY = "_agent_preparation_scope"


def native_scope(raw):
    from ..customer_agents.provisioning import ProvisioningScope
    try:
        return ProvisioningScope.model_validate_json(json.dumps(raw))
    except (ValueError, TypeError):
        raise ControlError(503, "source_unavailable") from None


def matches(expected, session, row, creation_id, *, source):
    if (expected.owner_binding() != binding(row) or str(expected.session_id) != session.id
            or str(expected.creation_id) != str(creation_id) or str(expected.business_id) != row.business_id
            or str(expected.grant_id) != row.grant_id or expected.source_revision != source):
        raise ControlError(409, "agent_business_not_current")


async def capture(tx, session, row, creation_id, *, source):
    from ..customer_agents import provisioning
    if row.anchor_kind != "business" or row.archived_at is not None:
        raise ControlError(403, "business_anchor_required")
    expected = await provisioning.capture(tx, session, str(creation_id), business_id=row.business_id,
        grant_id=row.grant_id, source_revision=source, lock=False)
    matches(expected, session, row, creation_id, source=source)
    return expected


async def verify_task(tx, task, row, turn):
    from ..customer_agents import provisioning
    if turn.agent_creation_id is None:
        return
    session = await tx.get(Session, task.session_id, populate_existing=True)
    if not session:
        raise ControlError(401, "unauthenticated")
    if turn.context is None:
        expected = await capture(tx, session, row, turn.agent_creation_id, source=task.source_revision)
    else:
        expected = native_scope(turn.context.get(SCOPE_KEY))
        matches(expected, session, row, turn.agent_creation_id, source=task.source_revision)
        await provisioning.verify(tx, expected, lock=False)
    tx.info.setdefault("workspace_agent_scopes", {})[task.id] = expected.model_dump(mode="json")


async def completion_locks(tx, claimed):
    """Registration/actor/Creation before Task; no effects or provider inside this tx."""
    from ..tasks.models import Task
    task = await tx.get(Task, claimed["task_id"], populate_existing=True)
    if not task or task.status != "running" or task.run_id != claimed["run_id"]:
        return
    turn = await tx.get(TeamTurn, task.id, populate_existing=True)
    if not turn or turn.agent_creation_id is None:
        return
    from ..customer_agents import provisioning
    if (turn.context is None or digest(turn.context) != turn.context_sha256
            or turn.context_sha256 != claimed["context"].get("_team_context_sha256")):
        raise ControlError(503, "source_unavailable")
    expected = native_scope(turn.context.get(SCOPE_KEY))
    if (str(expected.user_id) != task.user_id or str(expected.creation_id) != turn.agent_creation_id
            or str(expected.session_id) != task.session_id or expected.source_revision != task.source_revision):
        raise ControlError(503, "source_unavailable")
    await provisioning.verify(tx, expected, lock=True)


async def complete(tx, task, row, turn, result):
    from ..customer_agents import provisioning
    if (not isinstance(result, dict) or set(result) != {"context_sha256", "preparation", "attempt_id"}
            or result["context_sha256"] != turn.context_sha256 or turn.agent_creation_id is None):
        raise codex.RunnerError("output_invalid")
    try:
        plan = DraftPlan.model_validate(result["preparation"])
    except (ValueError, TypeError):
        raise codex.RunnerError("output_invalid") from None
    attempts = list(await tx.scalars(select(Attempt).where(Attempt.task_id == task.id).order_by(Attempt.ordinal)))
    if len(attempts) != 1:
        raise codex.RunnerError("output_invalid")
    attempt = attempts[0]
    if (attempt.id != result["attempt_id"] or attempt.phase != "plan" or attempt.state != "succeeded"
            or attempt.run_id != task.run_id or attempt.source_revision != task.source_revision):
        raise codex.RunnerError("output_invalid")
    receipt = None
    if plan.decision == "save_draft":
        expected = native_scope(turn.context.get(SCOPE_KEY))
        saved = await provisioning.create(tx, expected, Create(request_id=uuid5(NAMESPACE, task.id),
            purpose=turn.agent_purpose, configuration=plan.configuration))
        agent, config, readiness = saved["agent"], saved["configuration"], saved["readiness"]
        receipt = {"agent_id": agent["agent_id"], "creation_id": agent["creation_id"], "purpose": agent["purpose"],
            "revision_id": config["revision_id"], "revision": config["revision"], "sha256": config["sha256"],
            "configuration_state": agent["configuration_state"], "calibration_status": readiness["calibration_status"],
            "module_admission": readiness["module_admission"], "channel_activation": readiness["channel_activation"]}
        # Only a canonical committed effect may produce the save wording. Model prose cannot forge it.
        content = f'Parengtas agento „{agent["name"]}“ aprašas (redakcija {config["revision"]}).\n\n'
        content += "Aprašas išsaugotas kaip juodraštis. Agentas dar neįtrauktas vykdyti darbų; kalibravimas nepatvirtintas.\n"
        content += "Toliau reikia parengti šaltinius ir leidimus, atlikti paskirčiai reikalingus bandymus bei patikras.\n\n"
        content += f'Aprašą rasite skiltyje „Komanda“. Agento ID: {agent["agent_id"]}.\nRedakcijos kvitas: {config["sha256"]}.'
        if plan.limitations:
            content += "\n\nNežinomybės:\n"+"\n".join("• "+item for item in plan.limitations)
    else:
        content = adapter.public_text(plan.model_dump(mode="json"))
    thread = await service.team_thread(tx, row, lock=True)
    event = await service.add_event(tx, row, thread, task.id, "coordinator", "answer", content,
        reply=turn.owner_event_id, attempt=attempt.id)
    service.event_view(event, row)
    # Validate the existing deferred history fences while the Task still owns
    # its running lease. The worker's savepoint keeps this event and the native
    # Config atomic with final authority checks and its terminal transition.
    await tx.flush()
    await tx.execute(text("SET CONSTRAINTS workspace_team_fence IMMEDIATE"))
    await tx.execute(text("SET CONSTRAINTS workspace_team_fence DEFERRED"))
    return {"public_events_saved": 1, "context_sha256": turn.context_sha256, "agent_preparation": receipt}
