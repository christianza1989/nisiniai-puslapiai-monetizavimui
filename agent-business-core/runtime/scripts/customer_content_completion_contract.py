"""Actual strict read-only CURRENT native content workflow, distinct from intake/job history."""
import json
from pathlib import Path

from customer_public_contract import common, document

from pinet_core.content_completion.wire import CompletionView


def contract():
    schemas = common()
    schema = CompletionView.model_json_schema(ref_template="#/components/schemas/{model}")
    schemas.update(schema.pop("$defs", {}))
    schemas["CompletionView"] = schema
    path = "/customer/v2/creations/{creation_id}/content-completion"
    value = document("Current private native content workflow", "content-completion.v1", schemas,
        [("get", path, "getCustomerContentCompletion", "CompletionView", 200, None, True)], private=True)
    operation = value["paths"][path]["get"]
    operation["parameters"].append({"in": "query", "name": "accepted_revision", "required": False,
        "schema": {"type": "integer", "minimum": 1, "maximum": 20},
        "description": "Optional exact current accepted business revision; stale explicit input returns409."})
    operation["x-unknown-query-parameters"] = "rejected"
    operation["x-duplicate-query-parameters"] = "rejected"
    operation["responses"]["409"]["description"] = "Explicit accepted business revision is stale"
    schemas["CompletionViewEnvelope"]["properties"]["source_revision"]["pattern"] = "^[a-f0-9]{40}$"
    value["info"]["description"] = (
        "Authenticated current owner/session/tenant and canonical exact accepted team/intake proof. "
        "The fixed shared studio adapter reads current canonical draft hashes, factual notes, source flags, "
        "media file presence, internal link counts and actual current editorial receipt. This live observation "
        "does not rewrite immutable intake or native job/write snapshots. Media file presence is not visual, "
        "rights or quality approval; internal link counts are not a verification certificate. Historical approved "
        "revision hashes remain distinct from current drafts and stale reviews remain false. "
        "No provider calls or mutation capability: permitted_actions contains only refresh. Private release, "
        "SEO/GEO, full F1, launch and language_status remain UNVERIFIED; deployment is not_verified_by_studio. "
        "Explicit owner-paused language mode remains visible and is not a language PASS. "
        "No filesystem paths, source draft, private trace or account/session credentials in the DTO. "
        "The running envelope source_revision and historical accepted_source_revision have separate meanings.")
    return value


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-customer-content-completion.openapi.json"
    target.write_bytes((json.dumps(contract(), ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print("Canonical content-completion contract written")
