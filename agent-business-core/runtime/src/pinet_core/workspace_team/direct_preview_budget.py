"""New typed preview turns in the maintained calibration allocation/call ledger."""
import json
from uuid import UUID, uuid5

from sqlalchemy import text

from ..config import settings
from ..control.routes import ControlError
from ..creation.service import binding, digest
from ..customer_agents import preview
from ..customer_agents.provisioning import ProvisioningScope
from ..customer_agents.session import TaskFence
from . import calibration_budget as budget
from .calibration_budget_schema import ALLOCATION, CALL
from .direct_preview_plan import PreviewTurnPlan
from .models import DirectPreview

NAMESPACE = UUID("bc4f1a52-1515-45c1-92bb-a70fae1d712a")
CONTEXT_KEY = "native_preview_plan_sha256"


async def schema_ready(tx):
    await budget.schema_ready(tx)
    if not await tx.scalar(text("""SELECT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.control_workspace_direct_previews')
      AND relrowsecurity AND relforcerowsecurity)
      AND(SELECT count(*)=3 FROM pg_class WHERE relname IN('uq_jobs_legacy_conversation_kind','uq_jobs_direct_preview_turn','uq_jobs_direct_preview_revision') AND relkind='i')
      AND(SELECT count(*)=4 FROM pg_trigger WHERE tgname IN('direct_preview_immutable','direct_preview_binding','direct_preview_quality_job','direct_preview_quality_artifact')
        AND tgenabled IN('O','A') AND NOT tgisinternal)
      AND NOT has_table_privilege(current_user,to_regclass('public.control_workspace_direct_previews'),'UPDATE,DELETE')""")):
        raise ControlError(503, "native_preview_schema_unavailable")


def checked(chat, native):
    try:
        snapshot = preview.PreviewSnapshot.model_validate_json(json.dumps(native.snapshot))
        scope = ProvisioningScope.model_validate_json(json.dumps(native.native_scope))
        if (native.id != chat.id or binding(native) != binding(chat) or native.business_id != chat.business_id
                or native.grant_id != chat.grant_id or digest(native.snapshot) != native.snapshot_sha256
                or digest(native.native_scope) != native.native_scope_sha256 or scope.owner_binding() != binding(chat)
                or str(scope.business_id) != chat.business_id or str(scope.grant_id) != chat.grant_id
                or str(snapshot.preview_id) != chat.id or str(snapshot.agent_id) != chat.recipient["agent_id"]
                or str(snapshot.config_revision_id) != chat.recipient["revision_id"]
                or snapshot.config_revision != chat.recipient["revision"] or snapshot.config_sha256 != chat.recipient["configuration_sha256"]):
            raise ValueError("Exact immutable native preview required")
        return snapshot, scope
    except (ValueError, TypeError, AttributeError, KeyError):
        raise ControlError(503, "native_preview_binding_invalid") from None


async def binding_row(tx, chat):
    native = await tx.get(DirectPreview, chat.id, populate_existing=True)
    if not native:
        raise ControlError(503, "native_preview_binding_invalid")
    checked(chat, native)
    return native


def plan_from(row):
    try:
        plan = PreviewTurnPlan.model_validate_json(json.dumps(row["plan"]))
        if digest(plan.model_dump(mode="json")) != row["plan_sha256"] or row["call_limit"] != 3:
            raise ValueError("Exact retained preview plan required")
        return plan
    except (ValueError, TypeError, KeyError):
        raise ControlError(503, "native_preview_plan_invalid") from None


async def allocate(tx, task, chat, turn, native, current_scope):
    await schema_ready(tx)
    snapshot, _ = checked(chat, native)
    plan = PreviewTurnPlan.model_validate_json(json.dumps({"scope": current_scope.model_dump(mode="json"),
        "snapshot": snapshot.model_dump(mode="json"), "task_id": task.id, "chat_id": chat.id,
        "conversation_id": native.conversation_id, "message": task.message, "message_sha256": digest(task.message),
        "text_request_id": str(uuid5(UUID(task.id), "native-direct-text.v1")),
        "quality_request_id": str(uuid5(UUID(task.id), "native-direct-quality.v1"))}))
    material = plan.model_dump(mode="json")
    await tx.execute(text(f"""INSERT INTO {ALLOCATION}(task_id,user_id,organization_id,portfolio_id,business_id,environment_id,
      session_id,source_revision,plan,plan_sha256,call_limit,expires_at)
      VALUES(:t,:u,:o,:p,:b,:e,:s,:src,CAST(:j AS JSONB),:h,3,
        LEAST(:deadline,((date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC')+INTERVAL '1 day') AT TIME ZONE 'UTC')))"""),
        {"t": task.id, "u": task.user_id, "o": task.organization_id, "p": chat.portfolio_id, "b": task.business_id,
         "e": task.environment_id, "s": task.session_id, "src": task.source_revision,
         "j": json.dumps(material), "h": digest(material), "deadline": turn.deadline})
    return plan


def task_fence(task_id, run_id, plan, context_sha256):
    plan = PreviewTurnPlan.model_validate_json(plan.model_dump_json())
    if str(plan.task_id) != task_id:
        raise ControlError(409, "native_preview_task_not_current")
    plan_sha256 = digest(plan.model_dump(mode="json"))

    class PreviewTaskFence(TaskFence):
        async def _current(self, tx):
            await schema_ready(tx)
            cfg = settings()
            if cfg.environment != plan.scope.environment_id or cfg.control_source_revision != plan.scope.source_revision:
                raise ControlError(503, "source_unavailable")
            row = (await tx.execute(text(f"""SELECT t.*,tr.context,tr.context_sha256,tr.deadline,a.plan_sha256,a.expires_at,
              a.run_id AS allocated_run,a.context_sha256 AS allocated_context,p.archived_at,child.archived_at AS child_archived,
              b.snapshot_sha256,b.snapshot,c.id AS chat_id,b.conversation_id
              FROM control_tasks t JOIN control_task_runs r ON r.id=t.run_id AND r.task_id=t.id
              JOIN control_workspace_team_turns tr ON tr.id=t.id
              JOIN control_workspace_direct_chats c ON c.task_thread_id=t.thread_id AND c.team_thread_id=tr.team_thread_id
              JOIN control_workspace_topics p ON p.id=c.parent_topic_id
              JOIN control_workspace_topics child ON child.id=c.child_topic_id
              JOIN control_workspace_direct_previews b ON b.id=c.id JOIN {ALLOCATION} a ON a.task_id=t.id
              WHERE t.id=:t FOR UPDATE OF t"""), {"t": task_id})).mappings().first()
            now = await tx.scalar(text("SELECT clock_timestamp()"))
            if (not row or row["kind"] != "workspace.direct_turn" or row["status"] != "running" or row["run_id"] != run_id
                    or row["allocated_run"] != run_id or not budget.matches_task(row, plan)
                    or row["archived_at"] is not None or row["child_archived"] is not None
                    or row["chat_id"] != str(plan.chat_id) or row["conversation_id"] != str(plan.conversation_id)
                    or row["snapshot"] != plan.snapshot.model_dump(mode="json") or digest(row["snapshot"]) != row["snapshot_sha256"]
                    or row["plan_sha256"] != plan_sha256 or row["context_sha256"] != context_sha256
                    or row["allocated_context"] != context_sha256 or not isinstance(row["context"], dict)
                    or digest(row["context"]) != context_sha256 or row["context"].get(CONTEXT_KEY) != plan_sha256
                    or not row["lease_until"] or row["lease_until"] <= now or row["deadline"] <= now or row["expires_at"] <= now):
                raise ControlError(409, "native_preview_task_not_current")
            return row

        async def check(self, tx):
            await self._current(tx)

        async def reserve(self, tx, call):
            if not isinstance(call, preview.DirectCallIdentity):
                raise ControlError(400, "invalid_call_identity")
            call = preview.DirectCallIdentity.model_validate_json(call.model_dump_json())
            row = await self._current(tx)
            context = row["context"]
            if not plan.call_matches(call, context["quality_request_sha256"]):
                raise ControlError(409, "native_preview_call_not_planned")
            # Caller already holds native Conversation after policy/index locks.
            base = await preview.transcript(tx, plan.conversation_id, without_request=plan.text_request_id)
            if (preview.transcript_hash(base) != context["native_base_sha256"]
                    or sum(event.kind == "client_transcript" for event in base) != context["native_base_revision"]):
                raise ControlError(409, "preview_transcript_changed")
            calls = (await tx.execute(text(f"SELECT kind,material FROM {CALL} WHERE task_id=:t ORDER BY created_at,id"),
                {"t": task_id})).mappings().all()
            expected = ("customer_text", "customer_quality", "customer_quality")
            if (len(calls) >= 3 or call.kind != expected[len(calls)]
                    or call.kind == "customer_quality" and call.number != len(calls)):
                raise ControlError(409, "native_preview_call_not_planned")
            material = call.model_dump(mode="json")
            await tx.execute(text(f"""INSERT INTO {CALL}(id,task_id,run_id,user_id,organization_id,business_id,environment_id,
              conversation_id,call_key,kind,material,material_sha256)
              VALUES(:id,:t,:r,:u,:o,:b,:e,:c,:key,:kind,CAST(:j AS JSONB),:h)"""),
                {"id": str(uuid5(NAMESPACE, digest([task_id, run_id, material]))), "t": task_id, "r": run_id,
                 "u": str(plan.scope.user_id), "o": str(plan.scope.organization_id), "b": str(plan.scope.business_id),
                 "e": plan.scope.environment_id, "c": str(plan.conversation_id), "key": call.call_key, "kind": call.kind,
                 "j": json.dumps(material), "h": digest(material)})

    return PreviewTaskFence()
