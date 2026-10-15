"""Explicit runtime choice, no provider permission from shared runner flags."""
from contextlib import asynccontextmanager

import pytest
from test_customer_agent_session import Fence, binding, call_fields, target
from test_customer_sol_high import high  # noqa: F401 - canonical admitted fixture

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.creation import execution_profiles as profiles
from pinet_core.customer_agents.session import SessionPrincipal
from pinet_core.customer_text import execution
from pinet_core.customer_text import service as chat
from pinet_core.tasks.codex_transport import RunnerError


@pytest.mark.parametrize("entry", ["capability", "start"])
async def test_high_bearer_execution_denied_before_any_scope(high, monkeypatch, entry):  # noqa: F811
    @asynccontextmanager
    async def forbidden(**_):
        pytest.fail("Unprofiled High execution reached native scope")
        yield

    monkeypatch.setattr(chat, "guard", lambda: None)
    monkeypatch.setattr(chat, "scope", forbidden)
    monkeypatch.setattr(chat.adapter, "runner_ready", lambda: True)
    with pytest.raises(ControlError, match="customer_text_profile_required"):
        if entry == "capability":
            await chat.capability("inert-private", "inert")
        else:
            await chat.start("inert-private", "inert", object())


async def test_high_default_session_reserve_denied_before_permit(high):  # noqa: F811
    scope, fence = target(), Fence()
    with pytest.raises(ControlError, match="customer_text_profile_required"):
        await SessionPrincipal(scope, fence).reserve(object(), binding(scope), **call_fields())
    assert not fence.calls


def test_default_choice_and_explicit_high_have_distinct_runtime_authority(high, monkeypatch):  # noqa: F811
    assert execution.require_choice(high) == high
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)
    assert execution.require_choice() is None
    with pytest.raises(RunnerError):
        execution.require_choice(high)


async def test_bearer_policy_change_before_transaction_exit_refuses_commit(high, monkeypatch):  # noqa: F811
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)

    @asynccontextmanager
    async def native_scope(**_):
        yield object()

    @asynccontextmanager
    async def native(*_, **__):
        yield object()
        monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)

    async def session(*_):
        return object()

    monkeypatch.setattr(chat, "guard", lambda: None)
    monkeypatch.setattr(chat, "scope", native_scope)
    monkeypatch.setattr(chat, "transaction_authority", native)
    monkeypatch.setattr(chat, "customer_session", session)
    with pytest.raises(ControlError, match="customer_text_profile_required"):
        async with chat.authority("inert-private", "inert"):
            pass


async def test_session_policy_change_during_permit_callback_refuses_native_commit(high, monkeypatch):  # noqa: F811
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)

    class ChangingFence(Fence):
        async def reserve(self, tx, call):
            await super().reserve(tx, call)
            monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)

    scope, fence = target(), ChangingFence()
    with pytest.raises(ControlError, match="customer_text_profile_required"):
        await SessionPrincipal(scope, fence).reserve(object(), binding(scope), **call_fields())
