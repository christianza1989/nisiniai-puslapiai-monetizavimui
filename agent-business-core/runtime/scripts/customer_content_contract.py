"""Additive private customer content/readiness observation contract."""
import json
from pathlib import Path

from customer_public_contract import common, document

from pinet_core.creation.content_wire import ContentView


def contract():
    schemas = common()
    schema = ContentView.model_json_schema(ref_template="#/components/schemas/{model}")
    schemas.update(schema.pop("$defs", {}))
    schemas["ContentView"] = schema
    value = document("Private customer content intake snapshot", "content.v1", schemas,
        [("get", "/customer/v2/creations/{creation_id}/content", "getCustomerCreationContent", "ContentView", 200, None, True)], private=True)
    value["info"]["description"] = ("Authenticated own accepted-revision shared studio intake observation. "
        "Exact source identity and real blockers; observed_at is the intake time, not a live publication certificate. "
        "Private plans and body drafts remain unapproved; month hypotheses are not publication dates. "
        "No filesystem paths, raw model traces, approval or deployment capability. "
        "Existing creation.v1 and team.v1 bytes remain unchanged; fullF1/launch/scheduling stay UNVERIFIED.")
    return value


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-customer-content.openapi.json"
    target.write_text(json.dumps(contract(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Canonical content contract written")
