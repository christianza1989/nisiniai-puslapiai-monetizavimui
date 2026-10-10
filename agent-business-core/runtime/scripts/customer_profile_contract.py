"""Canonical read-only new customer profile contract, generated from the actual DTO."""
import json
from pathlib import Path

from customer_public_contract import common, document

from pinet_core.customer_profile.wire import ProfileView


def contract():
    schemas = common()
    value = ProfileView.model_json_schema(ref_template="#/components/schemas/{model}")
    schemas.update(value.pop("$defs", {}))
    schemas["ProfileView"] = value
    path = "/customer/v2/creations/{creation_id}/agent-profile"
    result = document("Customer profile admission observations", "agent-profile.v1", schemas,
        [("get", path, "getCustomerAgentProfile", "ProfileView", 200, None, True)], private=True)
    operation = result["paths"][path]["get"]
    operation["parameters"].append({"in": "query", "name": "accepted_revision", "required": False,
        "schema": {"type": "integer", "minimum": 1, "maximum": 20},
        "description": "Optional exact current revision; stale explicit input returns409; no accepted revision returns200 blocked."})
    operation["x-unknown-query-parameters"] = "rejected"
    operation["x-duplicate-query-parameters"] = "rejected"
    operation["responses"]["409"]["description"] = "Explicit accepted revision is stale"
    schemas["ProfileViewEnvelope"]["properties"]["source_revision"]["pattern"] = "^[a-f0-9]{40}$"
    result["info"]["description"] = (
        "Read-only verified current owner/session/tenant projection of actual immutable admin admission history. "
        "Current profile requires exact idle current Registration, enabled Grant, current execution source, "
        "fixed packaged role hashes and independently admitted current complete V2 knowledge reference/receipt/TTL. "
        "Historical accepted source is retained distinctly from execution source. Unknown and revoked gates never pass. "
        "All session/provider/voice/email/acquisition/learning activation remains false; calibration UNVERIFIED. "
        "No contacts, raw knowledge, authorizing sessions, prompts or provider capability in this DTO; "
        "no writes, refresh, TTL renewal, public source admission or legacy six-site contract changes.")
    return result


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-customer-profile.openapi.json"
    target.write_bytes((json.dumps(contract(), ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print("Canonical customer profile contract written")
