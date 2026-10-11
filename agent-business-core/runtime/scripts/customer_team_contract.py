"""Generate the additive, independently pinned team.v1 timeline contract."""
import json
from pathlib import Path

from customer_public_contract import common, document

from pinet_core.creation.team_wire import TeamView


def contract():
    schemas = common()
    schema = TeamView.model_json_schema(ref_template="#/components/schemas/{model}")
    schemas.update(schema.pop("$defs", {}))
    schemas["TeamView"] = schema
    value = document("Private customer creation team timeline", "team.v1", schemas,
        [("get", "/customer/v2/creations/{creation_id}/team", "getCustomerCreationTeam", "TeamView", 200, None, True)], private=True)
    value["info"]["description"] = ("Actual separate creator/critic/coordinator dispatch reservations and bounded summaries. "
        "No raw reasoning/trace; exact candidate-bound review and observed check receipts. "
        "Two rounds/six calls/overall deadline per job, each call charged before dispatch. "
        "draft_ready is private reviewed draft only; fullF1 and launch remain UNVERIFIED. "
        "needs_review is a sidecar projection; existing creation.v1 remains unchanged. "
        "EventData.language_review_mode defaults to required for historical events. Only explicit paused_local_pilot "
        "with same-candidate language_quality UNVERIFIED/observed=false may satisfy private acceptance instead of "
        "observed language PASS. No check may be FAIL. This is no language/public editorial certification; "
        "private coordinator decision and original source/instruction identity remain required.")
    return value


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-customer-team.openapi.json"
    target.write_text(json.dumps(contract(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Canonical team contract written")
