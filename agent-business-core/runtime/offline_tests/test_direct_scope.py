"""Exact direct execution union; no database, worker or native provider."""
import copy
from importlib import import_module
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest


def rows():
    values = {key: str(uuid4()) for key in ("id", "user_id", "organization_id", "portfolio_id", "parent_topic_id",
        "child_topic_id", "team_thread_id", "task_thread_id", "session_id")}
    recipient = {"kind": "consultant", "participant_id": str(uuid4()), "role": "adviser",
        "capability_id": "workspace.business_adviser.v1", "configuration_sha256": "a" * 64}
    execution = {"kind": "workspace", "portfolio_id": values["portfolio_id"], "parent_topic_id": values["parent_topic_id"],
        "anchor": {"kind": "creation", "selection_id": str(uuid4())}}
    chat = SimpleNamespace(**values, environment_id="test-direct", business_id=None, grant_id=None,
        mode="consultant", recipient=recipient, recipient_sha256=digest(recipient),
        execution_scope=execution, execution_sha256=digest(execution))
    task = SimpleNamespace(id=str(uuid4()), kind="workspace.direct_turn", business_id=None,
        user_id=chat.user_id, organization_id=chat.organization_id, environment_id=chat.environment_id,
        thread_id=chat.task_thread_id, session_id=str(uuid4()), source_revision="b" * 40)
    return chat, task


def test_workspace_consultant_scope_uses_no_registered_business_or_created_session_authority():
    scope = import_module("pinet_core.tasks.direct_scope")
    chat, task = rows()
    value = scope.checked(chat)
    assert value["execution"].kind == "workspace" and value["recipient"].role == "adviser"
    assert scope.matches(task, chat)
    assert task.session_id != chat.session_id


@pytest.mark.parametrize("change", ["old_kind", "fake_business", "foreign_owner", "foreign_thread", "mixed_scope", "recipient", "saved_downgrade"])
def test_workspace_union_rejects_legacy_null_or_foreign_mixed_and_saved_native_scopes(change):
    scope = import_module("pinet_core.tasks.direct_scope")
    chat, task = rows()
    if change == "old_kind":
        task.kind = "workspace.team_turn"
    elif change == "fake_business":
        task.business_id = str(uuid4())
    elif change == "foreign_owner":
        task.user_id = str(uuid4())
    elif change == "foreign_thread":
        task.thread_id = str(uuid4())
    elif change == "mixed_scope":
        chat.business_id = str(uuid4())
    elif change == "recipient":
        chat.recipient["role"] = "coordinator"
    else:
        chat.recipient = {"kind": "saved_agent", "creation_id": str(uuid4()), "agent_id": str(uuid4()),
            "revision_id": str(uuid4()), "revision": 1, "configuration_sha256": "a" * 64}
        chat.recipient_sha256, chat.mode = digest(chat.recipient), "agent_preview"
    with pytest.raises(ControlError):
        scope.matches(task, chat)


def test_actual_business_native_binding_stays_typed_and_requires_exact_grant_identity():
    scope = import_module("pinet_core.tasks.direct_scope")
    chat, task = rows()
    chat.mode, chat.business_id, chat.grant_id = "agent_preview", str(uuid4()), str(uuid4())
    chat.recipient = {"kind": "saved_agent", "creation_id": str(uuid4()), "agent_id": str(uuid4()),
        "revision_id": str(uuid4()), "revision": 1, "configuration_sha256": "a" * 64}
    chat.recipient_sha256 = digest(chat.recipient)
    chat.execution_scope = {"kind": "business", "portfolio_id": chat.portfolio_id, "parent_topic_id": chat.parent_topic_id,
        "business_id": chat.business_id, "grant_id": chat.grant_id}
    chat.execution_sha256 = digest(chat.execution_scope)
    task.business_id = chat.business_id
    assert scope.matches(task, chat)
    original = copy.deepcopy(chat.execution_scope)
    chat.grant_id = str(uuid4())
    with pytest.raises(ControlError):
        scope.checked(chat)
    assert chat.execution_scope == original
