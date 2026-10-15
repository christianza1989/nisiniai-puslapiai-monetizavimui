"""Additive exact-registration preparation contract; preserve the original V1 bytes."""
import json
from pathlib import Path

from customer_public_contract import common, document

from pinet_core.agent_preparation.v2_wire import AgentPreparationViewV2


def contract():
    schemas = common()
    value = AgentPreparationViewV2.model_json_schema(ref_template="#/components/schemas/{model}")
    schemas.update(value.pop("$defs", {}))
    schemas["AgentPreparationViewV2"] = value
    path = "/customer/v2/creations/{creation_id}/agent-preparation-v2"
    result = document("Exact registered customer agent preparation", "agent-preparation.v2", schemas,
        [("get", path, "getCustomerAgentPreparationV2", "AgentPreparationViewV2", 200, None, True)], private=True)
    operation = result["paths"][path]["get"]
    operation["parameters"].append({"in": "query", "name": "accepted_revision", "required": False,
        "schema": {"type": "integer", "minimum": 1, "maximum": 20},
        "description": "Optional exact current accepted revision; stale409, no revision truthful blocked200."})
    operation["x-unknown-query-parameters"] = "rejected"
    operation["x-duplicate-query-parameters"] = "rejected"
    operation["responses"]["409"]["description"] = "Explicit revision stale or registration changed"
    result["info"]["description"] = (
        "Additive read-only exact current verified customer/owner/session. Uses canonical creation-registration.v1 "
        "RegistrationView; only binding_current grants business-scoped observations. Missing/stale/revoked/grant-revoked/"
        "pending stays unmapped; final revoke discards prior runtime observations. Historical accepted source remains "
        "distinct from current execution envelope SHA; source_pin retains conservative current-source comparison. "
        "No host ownership inference, public source/profile/session admission, activation, provider, persistent SQL/file "
        "writes, mail/voice/acquisition/learning or calibration/F1/launch acceptance. Original V1 DTO/contract unchanged; "
        "the new route requires schema0016 before explicit portal adoption. Rollback portal reader to original V1 first.")
    schemas["AgentPreparationViewV2Envelope"]["properties"]["source_revision"]["pattern"] = "^[a-f0-9]{40}$"
    return result


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-customer-agent-preparation-v2.openapi.json"
    target.write_bytes((json.dumps(contract(), ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print("Canonical additive preparation V2 contract written")
