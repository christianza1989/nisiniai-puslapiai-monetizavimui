"""Durable allowance and native reservation links; no provider, evaluator or queue.

Admission holds the existing actor/day lock before Task/native locks. A native
call consumes under the already-admitted Task lock, never reacquiring admission
or calling heartbeat. Existing native events remain usage/result authority.
"""
import json
from uuid import UUID, uuid5

from sqlalchemy import text

from ..config import settings
from ..control.routes import ControlError
from ..creation.service import digest
from .calibration_budget_schema import ALLOCATION, CALL
from .calibration_plan import validated_plan
from .quota import call_slot

CONTEXT_KEY = "_agent_episode_plan_sha256"
NAMESPACE = UUID("36630e8f-be7f-4d15-8404-27b59bc2ec8e")


async def schema_ready(tx):
    tables = await tx.scalar(text("""SELECT count(*)=2 FROM pg_class WHERE relnamespace='public'::regnamespace
      AND relname=ANY(:names) AND relrowsecurity AND relforcerowsecurity"""), {"names": [ALLOCATION, CALL]})
    if not tables:
        raise ControlError(503, "calibration_budget_unavailable")
    ready = await tx.scalar(text("""SELECT
      (SELECT count(*)=4 FROM pg_trigger WHERE NOT tgisinternal AND tgenabled IN('O','A')
        AND tgname IN('calibration_allocation_insert','calibration_call_insert','calibration_native_event','calibration_team_attempt'))
      AND NOT has_table_privilege(current_user,'control_workspace_calibration_allocations','DELETE')
      AND NOT has_table_privilege(current_user,'control_workspace_calibration_calls','UPDATE,DELETE')
      AND EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('workspace_calibration_run_usage(character varying,character varying,character varying,character varying)')
        AND prosecdef AND has_function_privilege(current_user,oid,'EXECUTE'))"""))
    if not ready:
        raise ControlError(503, "calibration_budget_unavailable")


def plan_from(row):
    from .calibration_plan import EpisodePlan
    try:
        plan = EpisodePlan.model_validate_json(json.dumps(row["plan"]))
        if digest(plan.model_dump(mode="json")) != row["plan_sha256"] or plan.call_limit != row["call_limit"]:
            raise ValueError("changed plan")
        return plan
    except (ValueError, TypeError):
        raise ControlError(503, "calibration_budget_unavailable") from None


async def allocation(tx, task_id):
    row = (await tx.execute(text(f"SELECT * FROM {ALLOCATION} WHERE task_id=:t"),
        {"t": str(task_id)})).mappings().first()
    return row


def matches_task(task, plan):
    expected = plan.scope
    return all(task[key] == str(getattr(expected, key)) for key in
        ("user_id", "organization_id", "business_id", "environment_id", "session_id")) and (
            task["source_revision"] == expected.source_revision)


async def allocate(tx, task_id, value):
    """Internal explicit intent, before claim/native locks; no implicit retry budget."""
    plan = validated_plan(value)
    cfg, task_id = settings(), str(UUID(str(task_id)))
    if cfg.control_source_revision != plan.scope.source_revision or cfg.environment != plan.scope.environment_id:
        raise ControlError(503, "source_unavailable")
    await schema_ready(tx)
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
        {"k": "chat-admission:"+cfg.environment+":"+str(plan.scope.user_id)})
    prior = await allocation(tx, task_id)
    if prior:
        if prior["plan_sha256"] != digest(plan.model_dump(mode="json")):
            raise ControlError(409, "idempotency_conflict")
        return prior
    # The existing queued team turn already holds three slots. The native-only
    # allowance replaces those slots rather than creating a second child budget.
    await call_slot(tx, str(plan.scope.user_id), additional=plan.call_limit-3)
    row = (await tx.execute(text("""SELECT t.*,tr.portfolio_id,tr.deadline,tr.agent_creation_id
      FROM control_tasks t JOIN control_workspace_team_turns tr ON tr.id=t.id
      WHERE t.id=:t FOR UPDATE OF t"""), {"t": task_id})).mappings().first()
    if (not row or row["kind"] != "workspace.team_turn" or row["status"] != "queued"
            or row["run_id"] is not None or row["agent_creation_id"] is not None
            or row["portfolio_id"] != str(plan.scope.portfolio_id) or not matches_task(row, plan)):
        raise ControlError(409, "calibration_task_not_current")
    material = plan.model_dump(mode="json")
    return (await tx.execute(text(f"""INSERT INTO {ALLOCATION}
      (task_id,user_id,organization_id,portfolio_id,business_id,environment_id,session_id,source_revision,
       plan,plan_sha256,call_limit,expires_at)
      VALUES(:t,:u,:o,:p,:b,:e,:s,:src,CAST(:plan AS JSONB),:hash,:limit,
       LEAST(:deadline,((date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC')+INTERVAL '1 day') AT TIME ZONE 'UTC')))
      RETURNING *"""), {"t": task_id, "u": row["user_id"], "o": row["organization_id"],
        "p": row["portfolio_id"], "b": row["business_id"], "e": row["environment_id"],
        "s": row["session_id"], "src": row["source_revision"], "plan": json.dumps(material),
        "hash": digest(material), "limit": plan.call_limit, "deadline": row["deadline"]})).mappings().one()


async def bind_run(tx, task_id, run_id, context_sha256):
    """One transfer from queued hold to its exact claimed run/context."""
    row = await allocation(tx, task_id)
    if not row:
        raise ControlError(409, "calibration_task_not_current")
    if row["run_id"] is not None:
        if row["run_id"] != str(run_id) or row["context_sha256"] != context_sha256:
            raise ControlError(409, "calibration_task_not_current")
        return
    await tx.execute(text(f"UPDATE {ALLOCATION} SET run_id=:r,context_sha256=:h WHERE task_id=:t"),
        {"r": str(UUID(str(run_id))), "h": context_sha256, "t": str(task_id)})


def task_fence(task_id, run_id, value, context_sha256):
    """Source-only factory for the maintained Session adapter's required fence.

    Only the existing claimed Task integration may supply this object. There is
    no HTTP deserialization or permissive callback/default implementation.
    """
    from ..customer_agents.session import CallIdentity, TaskFence
    plan = validated_plan(value)
    task_id, run_id = str(UUID(str(task_id))), str(UUID(str(run_id)))
    plan_sha256 = digest(plan.model_dump(mode="json"))
    if not isinstance(context_sha256, str) or len(context_sha256) != 64:
        raise ValueError("Exact claimed context required")

    class BoundTaskFence(TaskFence):
        async def check(self, tx):
            await schema_ready(tx)
            cfg = settings()
            if cfg.environment != plan.scope.environment_id or cfg.control_source_revision != plan.scope.source_revision:
                raise ControlError(503, "source_unavailable")
            # This short lock is AFTER native parent/actor/Creation locks and
            # BEFORE policy/index/Conversation locks. It never invokes native
            # authority recursively, heartbeat, admission or queue cleanup.
            task = (await tx.execute(text(f"""SELECT t.*,tr.context,tr.context_sha256,tr.deadline,
              p.archived_at,a.plan_sha256,a.run_id AS allocation_run,a.context_sha256 AS allocation_context,
              a.expires_at
              FROM control_tasks t JOIN control_task_runs r ON r.id=t.run_id AND r.task_id=t.id
              JOIN control_workspace_team_turns tr ON tr.id=t.id
              JOIN control_workspace_topics p ON p.id=tr.topic_id
              JOIN {ALLOCATION} a ON a.task_id=t.id
              WHERE t.id=:t FOR UPDATE OF t"""), {"t": task_id})).mappings().first()
            # A SELECT target expression may be evaluated before LockRows waits.
            # Read the clock only after the fresh Task lock has been acquired.
            observed = await tx.scalar(text("SELECT clock_timestamp()"))
            if (not task or task["kind"] != "workspace.team_turn" or task["status"] != "running"
                    or task["run_id"] != run_id or task["allocation_run"] != run_id
                    or not matches_task(task, plan) or task["archived_at"] is not None
                    or not task["lease_until"] or task["lease_until"] <= observed
                    or task["deadline"] <= observed or task["expires_at"] <= observed
                    or task["plan_sha256"] != plan_sha256 or task["context_sha256"] != context_sha256
                    or task["allocation_context"] != context_sha256
                    or not isinstance(task["context"], dict) or digest(task["context"]) != context_sha256
                    or task["context"].get(CONTEXT_KEY) != plan_sha256):
                raise ControlError(409, "calibration_task_not_current")

        async def reserve(self, tx, call):
            # Revalidate even an internal model_construct/model_copy instance.
            if not isinstance(call, CallIdentity):
                raise ControlError(400, "invalid_request")
            call = CallIdentity.model_validate_json(call.model_dump_json())
            await self.check(tx)
            if not plan.call_matches(call):
                raise ControlError(409, "calibration_call_not_planned")
            material = call.model_dump(mode="json")
            prior = (await tx.execute(text(f"SELECT * FROM {CALL} WHERE conversation_id=:c AND call_key=:k"),
                {"c": str(call.conversation_id), "k": call.call_key})).mappings().first()
            if prior:
                # The native replay branch runs before reserve. Reaching this
                # branch is an ambiguous/reused reservation, never new dispatch.
                raise ControlError(409, "calibration_call_already_reserved")
            await tx.execute(text(f"""INSERT INTO {CALL}
              (id,task_id,run_id,user_id,organization_id,business_id,environment_id,conversation_id,
               call_key,kind,material,material_sha256)
              VALUES(:id,:t,:r,:u,:o,:b,:e,:c,:k,:kind,CAST(:j AS JSONB),:h)"""),
                {"id": str(uuid5(NAMESPACE, digest([task_id, run_id, material]))), "t": task_id, "r": run_id,
                 "u": str(plan.scope.user_id), "o": str(plan.scope.organization_id),
                 "b": str(plan.scope.business_id), "e": plan.scope.environment_id,
                 "c": str(call.conversation_id), "k": call.call_key, "kind": call.kind,
                 "j": json.dumps(material), "h": digest(material)})

    return BoundTaskFence()
