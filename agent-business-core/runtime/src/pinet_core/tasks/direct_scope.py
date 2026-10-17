"""Exact direct row union; structural integrity is not current execution authority.

Only the maintained direct handler may admit workspace-only consultant Tasks.
Historical business Task DTOs/fingerprints and native Agent scope stay unchanged.
The SQL migration independently fences NULL-business rows and their real parents.
"""
import json
import re
from uuid import UUID

from pydantic import TypeAdapter, ValidationError

from ..control.routes import ControlError
from ..creation.service import digest
from ..workspace_team.direct_wire import DirectExecutionScope, DirectRecipient

KIND = "workspace.direct_turn"
OWNER = ("user_id", "organization_id", "portfolio_id", "environment_id")
RECIPIENT = TypeAdapter(DirectRecipient)
EXECUTION = TypeAdapter(DirectExecutionScope)


def _uuid(value):
    return isinstance(value, str) and str(UUID(value)) == value


def checked(chat):
    """Validate retained immutable typed bindings, never derive permissions from a name."""
    try:
        if any(not _uuid(getattr(chat, key)) for key in (
                "id", "user_id", "organization_id", "portfolio_id", "parent_topic_id", "child_topic_id",
                "team_thread_id", "task_thread_id", "session_id")) or chat.parent_topic_id == chat.child_topic_id:
            raise ValueError("Exact independent owned identities required")
        if (not isinstance(chat.recipient, dict) or not isinstance(chat.execution_scope, dict)
                or digest(chat.recipient) != chat.recipient_sha256 or digest(chat.execution_scope) != chat.execution_sha256):
            raise ValueError("Exact immutable retained scope hashes required")
        recipient = RECIPIENT.validate_json(json.dumps(chat.recipient))
        execution = EXECUTION.validate_json(json.dumps(chat.execution_scope))
        native = recipient.kind == "saved_agent"
        if (chat.mode not in {"consultant", "agent_preview"} or (chat.mode == "agent_preview") != native
                or str(execution.portfolio_id) != chat.portfolio_id
                or str(execution.parent_topic_id) != chat.parent_topic_id):
            raise ValueError("Exact recipient and execution mode required")
        if execution.kind == "workspace":
            if (native or chat.business_id is not None or chat.grant_id is not None
                    or execution.anchor.kind == "portfolio" and str(execution.anchor.selection_id) != chat.portfolio_id):
                raise ValueError("Workspace scope is only a source-fixed consultant without a business/grant")
        elif (not _uuid(chat.business_id) or not _uuid(chat.grant_id)
                or str(execution.business_id) != chat.business_id or str(execution.grant_id) != chat.grant_id):
            raise ValueError("Actual exact native business and grant required")
        return {"recipient": recipient, "execution": execution}
    except (ValueError, TypeError, AttributeError, ValidationError):
        raise ControlError(503, "direct_scope_invalid") from None


def matches(task, chat):
    """New kind only; NULL cannot downgrade any legacy or native business Task."""
    checked(chat)
    try:
        if (task.kind != KIND or task.business_id != chat.business_id or task.thread_id != chat.task_thread_id
                or any(getattr(task, key) != getattr(chat, key) for key in OWNER if key != "portfolio_id")
                or not _uuid(task.id) or not _uuid(task.session_id)
                or not isinstance(task.source_revision, str) or not re.fullmatch(r"[a-f0-9]{40}", task.source_revision)):
            raise ValueError("Exact typed direct Task relationship required")
    except (ValueError, TypeError, AttributeError):
        raise ControlError(503, "direct_scope_invalid") from None
    return True
