"""Canonical additive read-only customer agent readiness contract."""
import json
from pathlib import Path

from customer_public_contract import common, document

from pinet_core.agent_preparation.wire import AgentPreparationView


def contract():
    schemas = common()
    value = AgentPreparationView.model_json_schema(ref_template="#/components/schemas/{model}")
    schemas.update(value.pop("$defs", {}))
    schemas["AgentPreparationView"] = value
    path = "/customer/v2/creations/{creation_id}/agent-preparation"
    result = document("Customer agent preparation observations", "agent-preparation.v1", schemas,
        [("get", path, "getCustomerAgentPreparation", "AgentPreparationView", 200, None, True)], private=True)
    operation = result["paths"][path]["get"]
    operation["parameters"].append({"in": "query", "name": "accepted_revision", "required": False,
        "schema": {"type": "integer", "minimum": 1, "maximum": 20},
        "description": "Optional exact current accepted revision. Explicit stale input returns409; absent revision returns200 blocked."})
    operation["x-unknown-query-parameters"] = "rejected"
    operation["x-duplicate-query-parameters"] = "rejected"
    operation["responses"]["409"]["description"] = "Explicit accepted revision is stale"
    result["info"]["description"] = ("Own verified current bearer/owner/tenant/session, read-only source-bound readiness. "
        "No accepted revision returns truthful blocked200. Exact immutable revision payload and historical intake "
        "are distinguished from current registration, config and source-code observations and unobserved channels. "
        "Legacy completed private revision identity is retained; team acceptance requires the shared exact-candidate "
        "coordinator accept_draft and observed language PASS sidecar, never merely a succeeded Job. "
        "Same-host owned registration is a candidate, never durable creation/revision Business binding. "
        "V2 indexing is implemented, current session admission is V1 and native V2 learning remains unadmitted. "
        "No activation, calibrated/ready claim, default client contact/operator facts, provider, mail, network refresh, "
        "SQL/file writes or session extension. Existing wire bytes unchanged; fullF1/launch UNVERIFIED.")
    schemas["AgentPreparationViewEnvelope"]["properties"]["source_revision"]["pattern"] = "^[a-f0-9]{40}$"
    return result


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-customer-agent-preparation.openapi.json"
    target.write_bytes((json.dumps(contract(), ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print("Canonical agent preparation contract written")
