"""Restricted PG provenance with synthetic native ledger metadata, provider zero.

These are database constraints tests, not actual Foundation, calibration quality,
model execution or adoption evidence. Run only in a new disposable 0041 QA DB.
"""
# Imported maintained pytest fixtures are intentionally injected by name.
# ruff: noqa: F811
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from test_customer_public import customers  # noqa: F401
from test_workspace_calibration_budget_pg import allocated_customer, native_call, prepared  # noqa: F401
from test_workspace_team_pg import (
    team,  # noqa: F401
)
from test_workspace_team_pg import (
    test_actual_customer_turn_has_trusted_same_chat_roles_and_exact_replay as ordinary_roles,
)

from pinet_core.control.routes import scope
from pinet_core.creation.service import digest
from pinet_core.models import Conversation, Job, utcnow
from pinet_core.tasks.models import Task
from pinet_core.workspace_team.episode_schema import ATTEMPT_BRANCH, EVENTS, PROOF
from pinet_core.workspace_team.models import Member, TeamThread, TeamTurn


async def native_proof(tx, user, task_id, run_id, plan, *, missing=None):
    """Use the maintained reservation helper and exact native binding shape."""
    first = await native_call(tx, user, task_id, run_id, plan)
    conversation = await tx.get(Conversation, first["conversation_id"])
    episode = plan.snapshot.model_dump(mode="json") | {
        "episode_id": str(plan.episode_id), "script_sha256": plan.script_sha256}
    conversation.payload = {"customer_text_binding": {"task_calibration": episode,
        "user_id": user, "session_id": str(plan.scope.session_id), "environment_id": plan.scope.environment_id}}
    job_id = str(uuid4())
    if missing != "quality_call":
        await native_call(tx, user, task_id, run_id, plan,
            conversation=conversation.id, quality_job=job_id, step=1)
    if missing != "job":
        tx.add(Job(id=job_id, business_id=str(plan.scope.business_id), environment_id=plan.scope.environment_id,
            conversation_id=conversation.id, kind="quality", state="succeeded", generation=1, attempts=1,
            payload={"dispatch": "customer-quality-dispatch.v1", "request_id": str(plan.quality_request_id),
                "model": plan.model, "request_input_sha256": plan.quality_request_sha256}))
    await tx.flush()
    return conversation, job_id


async def answer(tx, task_id, *, native_id=None, author="coordinator", attempt=None, kind="answer"):
    task = await tx.get(Task, task_id)
    turn = await tx.get(TeamTurn, task_id)
    thread = await tx.scalar(select(TeamThread).where(TeamThread.id == turn.team_thread_id).with_for_update())
    member = await tx.scalar(select(Member).where(Member.team_thread_id == thread.id, Member.role == author))
    content = "Sintetinio bandymo kvitai patikrinti. Kalibravimo patvirtinimas nesuteikiamas."
    thread.event_sequence += 1
    await tx.flush()
    event_id = str(uuid4())
    await tx.execute(text(f"""INSERT INTO {EVENTS}(id,task_id,team_thread_id,sequence,author_type,
      author_user_id,participant_id,attempt_id,kind,reply_to_event_id,content,content_sha256,source_revision,
      user_id,organization_id,portfolio_id,environment_id,created_at,native_episode_task_id)
      VALUES(:id,:t,:th,:seq,:author,NULL,:member,:attempt,:kind,:reply,:content,:hash,:source,:u,:o,:p,:e,:now,:native)"""),
        {"id": event_id, "t": task.id, "th": thread.id, "seq": thread.event_sequence, "author": author,
         "member": member.id, "attempt": attempt, "kind": kind, "reply": turn.owner_event_id,
         "content": content, "hash": digest(content), "source": task.source_revision,
         "u": task.user_id, "o": task.organization_id, "p": turn.portfolio_id,
         "e": task.environment_id, "now": utcnow(), "native": native_id or task.id})
    await tx.execute(text("SET CONSTRAINTS workspace_team_fence IMMEDIATE"))
    return event_id


async def test_exact_native_proof_publishes_coordinator_without_ordinary_attempt(allocated_customer):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    async with scope(user=user) as tx:
        await native_proof(tx, user, task_id, run_id, plan)
        event_id = await answer(tx, task_id)
    async with scope(user=user) as tx:
        row = (await tx.execute(text(f"SELECT * FROM {EVENTS} WHERE id=:id"), {"id": event_id})).mappings().one()
        assert row["native_episode_task_id"] == task_id and row["attempt_id"] is None
        assert await tx.scalar(text("SELECT count(*) FROM control_workspace_team_attempts WHERE task_id=:t"), {"t": task_id}) == 0


@pytest.mark.parametrize("missing", ["all", "quality_call", "job"])
async def test_incomplete_or_absent_native_proof_refuses_event(allocated_customer, missing):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    with pytest.raises(IntegrityError, match="exact completed native episode"):
        async with scope(user=user) as tx:
            await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": str(plan.scope.business_id)})
            if missing != "all":
                await native_proof(tx, user, task_id, run_id, plan, missing=missing)
            await answer(tx, task_id)


@pytest.mark.parametrize("changed", ["episode", "quality_request", "quality_input", "model", "lease"])
async def test_mismatched_native_receipt_or_expired_authority_refuses_event(allocated_customer, changed):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    async with scope(user=user) as tx:
        await native_proof(tx, user, task_id, run_id, plan)
    with pytest.raises(IntegrityError):
        async with scope(user=user) as tx:
            await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": str(plan.scope.business_id)})
            if changed == "lease":
                task = await tx.get(Task, task_id)
                task.lease_until = utcnow()-timedelta(seconds=1)
            elif changed == "episode":
                await tx.execute(text("""UPDATE conversations SET payload=jsonb_set(payload,
                  '{customer_text_binding,task_calibration,episode_id}',to_jsonb(CAST(:v AS TEXT)))
                  WHERE business_id=:b AND environment_id=:e"""),
                    {"v": str(uuid4()), "b": str(plan.scope.business_id), "e": plan.scope.environment_id})
            else:
                key = {"quality_request": "request_id", "quality_input": "request_input_sha256", "model": "model"}[changed]
                value = "gpt-6-luna" if changed == "model" else "f"*64 if changed == "quality_input" else str(uuid4())
                await tx.execute(text("UPDATE jobs SET payload=jsonb_set(payload,ARRAY[:k],to_jsonb(CAST(:v AS TEXT))) "
                    "WHERE business_id=:b AND environment_id=:e AND kind='quality'"),
                    {"k": key, "v": value, "b": str(plan.scope.business_id), "e": plan.scope.environment_id})
            await tx.flush()
            await answer(tx, task_id)


@pytest.mark.parametrize("overrides", [{"native_id": str(uuid4())}, {"author": "adviser"},
    {"attempt": str(uuid4())}, {"kind": "assignment"}])
async def test_native_marker_cannot_rebind_role_or_dual_provenance(allocated_customer, overrides):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    with pytest.raises(IntegrityError, match="check constraint"):
        async with scope(user=user) as tx:
            await native_proof(tx, user, task_id, run_id, plan)
            await answer(tx, task_id, **overrides)


async def test_ordinary_attempt_backed_roles_keep_existing_history_and_replay(team):
    await ordinary_roles(team)


async def test_proof_is_invoker_scoped_and_original_attempt_branch_preserved(allocated_customer):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    async with scope(user=user) as tx:
        assert not await tx.scalar(text("SELECT prosecdef FROM pg_proc WHERE oid=to_regprocedure(:f)"),
            {"f": PROOF+"(character varying,character varying)"})
        assert not await tx.scalar(text("""SELECT EXISTS(SELECT 1 FROM pg_proc p,
          LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
          WHERE p.oid=to_regprocedure(:f) AND a.grantee=0 AND a.privilege_type='EXECUTE')"""),
            {"f": PROOF+"(character varying,character varying)"})
        assert await tx.scalar(text("SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid=CAST(:t AS REGCLASS)"),
            {"t": EVENTS})
        definition = await tx.scalar(text("SELECT pg_get_functiondef('control_workspace_team_fence()'::regprocedure)"))
        assert ATTEMPT_BRANCH in definition


async def test_foreign_task_native_receipts_do_not_authorize_this_answer(allocated_customer):
    user, task_id, plan, _ = await prepared(allocated_customer)
    foreign_user, foreign_task, foreign_plan, foreign_run = await prepared(allocated_customer)
    async with scope(user=foreign_user) as tx:
        await native_proof(tx, foreign_user, foreign_task, foreign_run, foreign_plan)
    with pytest.raises(IntegrityError, match="exact completed native episode"):
        async with scope(user=user) as tx:
            await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": str(plan.scope.business_id)})
            await answer(tx, task_id)
