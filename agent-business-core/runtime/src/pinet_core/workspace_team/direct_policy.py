"""Source-fixed one-call consultation policy; not a saved-agent runtime persona."""
from ..creation.service import digest
from ..tasks import codex
from ..tasks.direct_scope import KIND
from . import adapter
from .policy import CAPABILITIES, EFFORT, MODEL, participant_id

ADAPTER = "codex-workspace-direct.v1"
MAX_CALLS = 1


def configuration_sha256(role):
    if role not in CAPABILITIES:
        raise ValueError("Unknown direct consultant")
    return digest({"adapter": ADAPTER, "role": role, "capability": CAPABILITIES[role][0], "model": MODEL,
        "effort": EFFORT, "tools_disabled": codex.DISABLED, "schema": adapter.Answer.model_json_schema(),
        "instructions": adapter.prompt_for("direct_" + role, {})})


def recipient(parent, role):
    if role not in CAPABILITIES:
        raise ValueError("Unknown direct consultant")
    return {"kind": "consultant", "participant_id": participant_id(parent, role), "role": role,
        "capability_id": CAPABILITIES[role][0], "configuration_sha256": configuration_sha256(role)}


__all__ = ["ADAPTER", "EFFORT", "KIND", "MAX_CALLS", "MODEL", "configuration_sha256", "recipient"]
