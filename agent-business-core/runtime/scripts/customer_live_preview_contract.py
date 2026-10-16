"""Standalone customer live-preview contract; no runtime/process startup."""
import json
from pathlib import Path

from customer_public_contract import common

from pinet_core.site_build.live_preview_wire import CONTRACT, AvailabilityEnvelope, LeaseEnvelope, Start


def contract():
    schemas = common()
    for model in (Start, LeaseEnvelope, AvailabilityEnvelope):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        schemas.update(schema.pop("$defs", {}))
        schemas[model.__name__] = schema
    base = "/customer/v2/creations/{creation_id}/live-previews"
    paths = {}
    for suffix, method, operation, response, code in (("", "get", "getCustomerLivePreviewAvailability", "AvailabilityEnvelope", 200),
            ("", "post", "startCustomerLivePreview", "LeaseEnvelope", 202),
            ("/{lease_id}", "get", "getCustomerLivePreview", "LeaseEnvelope", 200),
            ("/{lease_id}", "delete", "closeCustomerLivePreview", "LeaseEnvelope", 200)):
        entry = {"operationId": operation, "security": [{"CoreSession": []}],
            "parameters": [{"name": name, "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}
                for name in (["creation_id", "lease_id"] if suffix else ["creation_id"])],
            "x-unknown-query-parameters": "rejected", "x-body-byte-limit": 4096,
            "responses": {str(status): {"description": "Bounded current projection" if status == code else "Safe refusal",
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/" + (response if status == code else "Error")}}}}
                for status in (code, 400, 401, 403, 404, 409, 503)}}
        if method == "post":
            entry["requestBody"] = {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Start"}}}}
        else:
            entry["x-request-body"] = "rejected"
        paths.setdefault(base + suffix, {})[method] = entry
    return {"openapi": "3.1.0", "info": {"title": "Authenticated bounded customer live preview", "version": CONTRACT,
        "description": "Read-only availability never starts or prepares a server. Explicit start binds current accepted revision "
            "and Results site context, current owner/Session/source/native/S6. Canonical opaque preparation is not a URL. "
            "Only a freshly verified ready owned loopback lease exposes preview_url; all other states clear it. "
            "Same UUID cannot rebase or resurrect terminal work. Current authority alone renews its short heartbeat. "
            "Close, expiry, revocation, source/native drift or shutdown close exact owned children. "
            "No caller origin/path/command/proof, paid work, channel activation or full-site/launch promotion."},
        "paths": paths, "components": {"securitySchemes": {"CoreSession": {"type": "http", "scheme": "bearer"}}, "schemas": schemas}}


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-customer-live-preview.openapi.json"
    target.write_text(json.dumps(contract(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Canonical customer live-preview contract written")
