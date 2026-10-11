"""Canonical bounded customer creation wire, independent of unchanged v1 auth/intakes."""
import json
from pathlib import Path

from customer_public_contract import common, document

from pinet_core.creation.wire import ArtifactContent, Artifacts, CreationView, Creations, Events, Messages, Revise, Start


def contract():
    schemas = common()
    for model in (Start, Revise, CreationView, Creations, Events, Messages, Artifacts, ArtifactContent):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        schemas.update(schema.pop("$defs", {}))
        schemas[model.__name__] = schema
    actions = [
        ("post", "/customer/v2/creations", "startCustomerCreation", "CreationView", 202, "Start", True),
        ("get", "/customer/v2/creations", "listCustomerCreations", "Creations", 200, None, True),
        ("get", "/customer/v2/creations/{creation_id}", "getCustomerCreation", "CreationView", 200, None, True),
        ("get", "/customer/v2/creations/{creation_id}/events", "getCustomerCreationEvents", "Events", 200, None, True),
        ("get", "/customer/v2/creations/{creation_id}/messages", "getCustomerCreationMessages", "Messages", 200, None, True),
        ("post", "/customer/v2/creations/{creation_id}/revisions", "reviseCustomerCreation", "CreationView", 202, "Revise", True),
        ("post", "/customer/v2/creations/{creation_id}/cancel", "cancelCustomerCreation", "CreationView", 200, None, True),
        ("get", "/customer/v2/creations/{creation_id}/artifacts", "listCustomerArtifacts", "Artifacts", 200, None, True),
        ("get", "/customer/v2/creations/{creation_id}/artifacts/{artifact_id}", "getCustomerArtifact", "ArtifactContent", 200, None, True),
    ]
    result = document("Private customer business draft creation", "creation.v1", schemas, actions, private=True)
    result["info"]["description"] = (
        "Local/test customer draft generation over existing core identity/portfolio. Immutable private revisions; "
        "draft_ready is a business proposition and website draft, not public deployment/F1 acceptance. "
        "HTML content requires a sandboxed iframe without scripts/same-origin/forms/navigation/network. "
        "Request bodies bounded16KiB. Existing v1 auth, intake and operator contracts unchanged.")
    return result


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-customer-creation.openapi.json"
    target.write_text(json.dumps(contract(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Canonical creation contract written")
