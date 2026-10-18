"""Restricted retained PG: authenticated history reads never authorize dispatch."""

# Imported pytest fixtures deliberately share their parameter names.
# ruff: noqa: F811

import asyncio
import os
from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import set_committed_value
from test_acquisition_agent_roles_pg import request, six, submit  # noqa: F401
from test_acquisition_external_binding_pg import external_native  # noqa: F401
from test_acquisition_model_prepare_pg import stored
from test_customer_public import verified
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.acquisition import agent_role_tasks, model_admin, model_authority, model_tasks
from pinet_core.acquisition.agent_role_contract import KIND, RoleRequest
from pinet_core.acquisition.model_models import ModelAttempt, ModelAuthorization, ModelTaskBinding
from pinet_core.control.models import BusinessGrant
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.customer_text.service import customer_session
from pinet_core.tasks.models import Task, TaskRun

pytestmark = pytest.mark.skipif(
    os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit isolated retained0050 PG, no provider dispatch",
)


async def owned(p, identity, helper):
    async with scope(token=token_hash(p["token"])) as tx:
        actor = await customer_session(tx, p["token"])
        return await helper(tx, actor, identity)


async def test_missing_actor_context_is_hidden_existing_read_and_typed_helper(six):
    p = six
    value = request(p)
    identity = await submit(p, value)
    # Actual defect was the private controller omitting customer_session, not a
    # missing business GUC or broken authenticated canonical read.
    async with scope(token=token_hash(p["token"])) as tx:
        assert await tx.scalar(text("SELECT current_user")) == "pinet_runtime"
        assert await tx.get(ModelTaskBinding, identity) is None
        actor = await customer_session(tx, p["token"])
        assert await tx.get(ModelTaskBinding, identity) is not None
        view = await agent_role_tasks.read(tx, actor, identity)
        assert view["task"]["task_id"] == identity and view["execution"] is None
    parsed = await owned(p, identity, agent_role_tasks.read_request)
    assert isinstance(parsed, RoleRequest) and parsed == RoleRequest.model_validate(value)
    task, run, attempts = await stored(p, identity)
    assert task.status == "queued" and run is None and attempts == []


async def test_foreign_owner_missing_task_and_revoked_business_are_404(six):
    p = six
    identity = await submit(p, request(p))
    _, headers, _ = await verified(p)
    foreign = headers["Authorization"][7:]
    async with scope(token=token_hash(foreign)) as tx:
        actor = await customer_session(tx, foreign)
        for helper in (agent_role_tasks.read, agent_role_tasks.read_request):
            with pytest.raises(ControlError, match="not_found") as error:
                await helper(tx, actor, identity)
            assert error.value.status == 404
    with pytest.raises(ControlError, match="not_found") as error:
        await owned(p, str(uuid4()), agent_role_tasks.read_request)
    assert error.value.status == 404
    async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
        grant = await tx.scalar(select(BusinessGrant).where(
            BusinessGrant.business_id == p["scope"].business_id,
            BusinessGrant.environment_id == p["environment"],
        ))
        grant.enabled = False
    for helper in (agent_role_tasks.read, agent_role_tasks.read_request):
        with pytest.raises(ControlError, match="not_found") as error:
            await owned(p, identity, helper)
        assert error.value.status == 404
    # Runtime correctly cannot read even its Task after grant revocation. Check
    # absence of execution through the dedicated fixture admin connection.
    async with AsyncSession(p["admin"]) as tx:
        assert (await tx.get(Task, identity)).run_id is None
        for model in (TaskRun, ModelAttempt):
            assert await tx.scalar(select(func.count()).select_from(model).where(model.task_id == identity)) == 0


@pytest.mark.parametrize("change", ["hash", "fingerprint", "invalid_input"])
async def test_corrupt_read_identity_is_unavailable_without_execution(six, change):
    p = six
    identity = await submit(p, request(p))
    for helper in (agent_role_tasks.read, agent_role_tasks.read_request):
        async with scope(token=token_hash(p["token"])) as tx:
            actor = await customer_session(tx, p["token"])
            bound, task = await tx.get(ModelTaskBinding, identity), await tx.get(Task, identity)
            # SQL immutability rejects rewriting retained binding/Task bytes.
            # This explicit read-side identity-map seam tests defensive handling
            # without disabling triggers or changing any persisted history.
            if change == "hash":
                set_committed_value(bound, "input_sha256", "f" * 64)
            elif change == "fingerprint":
                set_committed_value(task, "fingerprint", "f" * 64)
            else:
                from pinet_core.creation.service import digest

                material = deepcopy(bound.input)
                material["role"] = "unknown"
                set_committed_value(bound, "input", material)
                set_committed_value(bound, "input_sha256", digest(material))
                policy = await tx.get(ModelAuthorization, bound.authorization_id)
                set_committed_value(task, "fingerprint", digest({
                    "request": material, "authorization_fingerprint": policy.fingerprint,
                }))
            assert not tx.dirty
            with pytest.raises(ControlError, match="agent_role_task_invalid") as error:
                await helper(tx, actor, identity)
            assert error.value.status == 503
    assert (await owned(p, identity, agent_role_tasks.read))["execution"] is None
    _, run, attempts = await stored(p, identity)
    assert run is None and attempts == []


@pytest.mark.parametrize("state", ["stopped", "expired"])
async def test_history_survives_stop_or_real_expiry_execution_still_refused(six, state):
    p = six
    if state == "expired":
        # A genuinely short approved grant, not a rewrite of historical expiry
        # bytes/fingerprints or a fake database clock.
        approval = p["role_approvals"]["coordinator"] | {
            "authorization_id": str(uuid4()), "duration_seconds": 30,
        }
        async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
            result = await model_admin.approve(tx, approval)
        p["team"]["coordinator"] = {
            "authorization_id": result["after"]["id"], "fingerprint": result["after"]["fingerprint"],
        }
    identity = await submit(p, request(p))
    if state == "stopped":
        async with AsyncSession(p["admin"], expire_on_commit=False) as tx, tx.begin():
            policy = await tx.get(ModelAuthorization, p["team"]["coordinator"]["authorization_id"])
            policy.enabled = False
    else:
        await asyncio.sleep(30.1)
    parsed = await owned(p, identity, agent_role_tasks.read_request)
    assert (await owned(p, identity, agent_role_tasks.read))["execution"] is None
    async with scope(token=token_hash(p["token"])) as tx:
        actor = await customer_session(tx, p["token"])
        with pytest.raises(ControlError, match="acquisition_model_authorization_(stale|expired)"):
            async with model_authority.current(tx, parsed.authorization_id, actor.id, execution=True):
                pytest.fail("A history read must not reopen execution")
    task, run, attempts = await stored(p, identity)
    assert task.status == "queued" and run is None and attempts == []


async def test_existing_two_role_read_still_uses_its_own_kind(six):
    p = six
    value = deepcopy(p["request"])
    value["request_id"] = str(uuid4())
    value["campaign"]["mode"] = "research_only"
    async with scope(token=token_hash(p["token"])) as tx:
        actor = await customer_session(tx, p["token"])
        identity = (await model_tasks.submit(tx, actor, value)).id
    assert (await owned(p, identity, model_tasks.read))["execution"] is None
    for helper in (agent_role_tasks.read, agent_role_tasks.read_request):
        with pytest.raises(ControlError, match="not_found") as error:
            await owned(p, identity, helper)
        assert error.value.status == 404
    task, run, attempts = await stored(p, identity)
    assert task.kind != KIND and run is None and attempts == []
