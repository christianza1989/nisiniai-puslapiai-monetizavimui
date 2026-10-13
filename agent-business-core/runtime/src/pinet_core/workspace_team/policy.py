"""Source-fixed identities and capabilities, never prompt-selected permissions."""
from uuid import UUID, uuid5

from ..creation.service import digest

KIND = "workspace.team_turn"
ADAPTER = "codex-workspace-team.v1"
MODEL = "gpt-6.1-sol"
EFFORT = "high"
MAX_CALLS = 3
MAX_HISTORY = 20
NAMESPACE = UUID("2a3f87b1-bf05-4291-94ba-747ef71301b3")
CAPABILITIES = {
    "coordinator": ("workspace.consult_coordinator.v1", "Koordinatorius", "Aptaria tikslą, paskiria analizę ir sujungia išvadas."),
    "adviser": ("workspace.business_adviser.v1", "Verslo patarėjas", "Analizuoja pateiktą verslo klausimą ir galimus sprendimus."),
}


def participant_id(topic, role):
    if role not in CAPABILITIES:
        raise ValueError("Unknown source-fixed role")
    identity = {key: getattr(topic, key) for key in (
        "id", "user_id", "organization_id", "portfolio_id", "environment_id", "business_id", "grant_id")}
    return str(uuid5(NAMESPACE, digest({"binding": identity, "capability": CAPABILITIES[role][0]})))


def roster_items(topic, *, admitted):
    return [{"participant_id": participant_id(topic, role), "role": role, "name": values[1],
        "purpose": values[2], "capability_id": values[0], "availability": "available" if admitted else "not_admitted",
        "tools": [], "external_actions": False} for role, values in CAPABILITIES.items()]


def roster_hash(items):
    # Availability is current admission, not a stable member/configuration identity.
    return digest([{k: v for k, v in row.items() if k != "availability"} for row in items])
